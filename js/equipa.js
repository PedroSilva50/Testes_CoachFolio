function computeStats(typeFilterVal, seasonFilterVal, phaseFilterVal, tournamentFilterVal){
  let scored=0, conceded=0; let scoredHalf={1:0,2:0}, concededHalf={1:0,2:0};
  let scorerCount = {}, assistCount = {}, yellowCount = {}, redCount = {};
  let wins=0, draws=0, losses=0; let casaWins=0, casaDraws=0, casaLosses=0, foraWins=0, foraDraws=0, foraLosses=0;
  
  let seasonMatches = state.matches.filter(m => (!typeFilterVal || typeFilterVal==='todos' || m.type===typeFilterVal) && (!seasonFilterVal || seasonFilterVal==='todas' || getEntitySeason(m)===seasonFilterVal));
  const availablePhases = [...new Set(seasonMatches.map(m=> (m.phase||'').trim()).filter(p=>p!==''))].sort();
  const availableTournaments = [...new Set(seasonMatches.filter(m=>m.type==='torneio').map(m=> (m.tournamentName||'').trim()).filter(p=>p!==''))].sort();
  const matches = seasonMatches.filter(m => (!phaseFilterVal || phaseFilterVal==='todas' || (m.phase||'').trim()===phaseFilterVal))
                                .filter(m => (!tournamentFilterVal || tournamentFilterVal==='todas' || (m.tournamentName||'').trim()===tournamentFilterVal));

  const last6Matches = [...matches].filter(m=>m.finished).sort((a,b) => new Date(a.date) - new Date(b.date)).slice(-6);
  const last5Form = [...matches].filter(m=>m.finished).sort((a,b) => new Date(a.date) - new Date(b.date)).slice(-5).map(m => { const sc = m.goals.filter(g=>g.type==='scored').length; const co = m.goals.filter(g=>g.type==='conceded').length; return sc > co ? 'V' : (sc === co ? 'E' : 'D'); });

  matches.forEach(m=>{
    const mScored = m.goals.filter(g=>g.type==='scored').length; const mConceded = m.goals.filter(g=>g.type==='conceded').length; const loc = m.location || 'casa';
    if(m.finished){ if(mScored > mConceded){ wins++; loc==='casa'?casaWins++:foraWins++; } else if(mScored === mConceded){ draws++; loc==='casa'?casaDraws++:foraDraws++; } else { losses++; loc==='casa'?casaLosses++:foraLosses++; } }
    m.goals.forEach(g=>{ if(g.type==='scored'){ scored++; scoredHalf[g.half]++; if(g.scorerId && g.scorerId !== 'autogolo') scorerCount[g.scorerId] = (scorerCount[g.scorerId]||0)+1; if(g.assistId && g.assistId !== 'none' && g.assistId !== 'unknown') assistCount[g.assistId] = (assistCount[g.assistId]||0)+1; } else { conceded++; concededHalf[g.half]++; } });
    (m.cards||[]).forEach(c=>{ if(c.color==='Amarelo') yellowCount[c.playerId] = (yellowCount[c.playerId]||0)+1; else redCount[c.playerId] = (redCount[c.playerId]||0)+1; });
  });
  
  const scorers = Object.entries(scorerCount).map(([id,count])=>({id, name: playerName(id), count})).sort((a,b)=>b.count-a.count);
  const assisters = Object.entries(assistCount).map(([id,count])=>({id, name: playerName(id), count})).sort((a,b)=>b.count-a.count);
  const cardRanking = [...new Set([...Object.keys(yellowCount), ...Object.keys(redCount)])].map(id=>({id, name: playerName(id), yellow: yellowCount[id]||0, red: redCount[id]||0})).sort((a,b)=>(b.yellow+b.red)-(a.yellow+a.red));
  
  return { scored, conceded, scoredHalf, concededHalf, scorers, assisters, wins, draws, losses, casaWins, casaDraws, casaLosses, foraWins, foraDraws, foraLosses, cardRanking, last6Matches, last5Form, availablePhases, availableTournaments, matches };
}

// Chave única para identificar o relatório atual (época + tipo + fase + torneio),
// para o balanço tático ficar ligado ao filtro certo e não se misturar entre fases.
function getPhaseReportKey(){
  const activeSeason = window.statsSeasonFilter === 'todas' ? 'TUDO' : (window.statsSeasonFilter || state.currentSeason);
  return [activeSeason, statsFilter||'todos', statsPhaseFilter||'todas', statsTournamentFilter||'todas'].join('|');
}
window.getPhaseConclusion = function(){
  if(!state.phaseReports) state.phaseReports = {};
  return state.phaseReports[getPhaseReportKey()] || '';
};
window.uiSavePhaseConclusion = function(val){
  if(!state.phaseReports) state.phaseReports = {};
  state.phaseReports[getPhaseReportKey()] = val;
  saveState();
};

// Estatísticas de plantel restritas aos jogos de uma competição/fase específica
function computeCompetitionPlayerStats(matches){
  // 1. Lê todo o plantel ativo (para ninguém ficar de fora, mesmo com 0 minutos)
  let activeRoster = (state.roster || []).filter(p => p.active !== false);
  
  // 2. Ordena IMEDIATAMENTE os jogadores com base na tua escolha do ecrã PLANTEL (Posição, Nome ou Número)
  activeRoster = sortPlayerObjs(activeRoster);

  // 3. Calcula as estatísticas respeitando essa mesma ordem
  const rows = activeRoster.map(p => {
    let minutes = 0, starts = 0, goals = 0, assists = 0, yellow = 0, red = 0;
    matches.forEach(m => {
      minutes += Math.round(calcPlayerMinutes(m, p.id) / 60);
      if ((m.lineup || []).includes(p.id)) starts++;
      (m.goals || []).forEach(g => {
        if (g.type === 'scored' && g.scorerId === p.id) goals++;
        if (g.type === 'scored' && g.assistId === p.id) assists++;
      });
      (m.cards || []).forEach(c => {
        if (c.playerId === p.id) { if (c.color === 'Amarelo') yellow++; else red++; }
      });
    });
    return { id: p.id, name: playerLabel(p), minutes, starts, goals, assists, yellow, red };
  });

  // Retorna a tabela pronta e selada com a ordem oficial do Plantel!
  return rows;
}

// Métricas de treino: Conta desde o início da época (ou data de entrada) até ao último jogo da fase.
function computeTrainingMetricsForMatches(matches){
  const finishedMatches = matches.filter(m => m.date);
  if (finishedMatches.length === 0) return { count: 0, pct: null, startDate: null, endDate: null };

  const dates = finishedMatches.map(m => m.date).sort();
  const endDate = dates[dates.length - 1]; // Limite é o último jogo da competição
  const matchSeason = matches[0].season || state.currentSeason;

  // Vai buscar todos os treinos da época que aconteceram ANTES ou NO DIA do último jogo
  const trainingsInRange = (state.trainings || [])
    .filter(tr => getEntitySeason(tr) === matchSeason && tr.date <= endDate && (tr.status === undefined || tr.status === 'completed'))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (trainingsInRange.length === 0) return { count: 0, pct: null, startDate: dates[0], endDate };

  // O startDate real é o dia do primeiro treino da época!
  const startDate = trainingsInRange[0].date;
  
  let minutosOferecidos = 0, minutosCumpridos = 0;
  trainingsInRange.forEach(tr => {
    const dur = parseInt(tr.duration, 10) || 90;
    (state.roster || []).filter(p => p.active !== false).forEach(p => {
      if (p.joinDate && tr.date < p.joinDate) return; // Se ainda não era do clube, não conta
      
      minutosOferecidos += dur;
      let isAbsent = false;
      if (Array.isArray(tr.absences)) { isAbsent = tr.absences.includes(p.id); }
      else if (tr.absences && tr.absences[p.id]) { isAbsent = true; }
      
      if (isAbsent) {
        if (tr.customMinutes && tr.customMinutes[p.id] != null) minutosCumpridos += parseInt(tr.customMinutes[p.id], 10);
      } else {
        minutosCumpridos += dur;
      }
    });
  });

  const pct = minutosOferecidos > 0 ? Math.round((minutosCumpridos / minutosOferecidos) * 100) : null;
  return { count: trainingsInRange.length, pct, startDate, endDate };
}
window.exportGlobalStatsPDF = function(){
  const activeSeason = window.statsSeasonFilter === 'todas' ? 'TUDO' : (window.statsSeasonFilter || state.currentSeason);
  const s = computeStats(statsFilter, activeSeason, statsPhaseFilter, statsTournamentFilter);

  if (!s.matches || s.matches.length === 0) {
    showToast('Sem jogos neste filtro para gerar relatório.');
    return;
  }

  let filterLabel = t('st_all');
  if (statsTournamentFilter !== 'todas') filterLabel = `🏆 ${statsTournamentFilter}`;
  else if (statsPhaseFilter !== 'todas') filterLabel = statsPhaseFilter;
  else if (statsFilter !== 'todos') filterLabel = t(statsFilter === 'campeonato' ? 'sch_champ' : (statsFilter === 'torneio' ? 'sch_tour' : 'sch_friendly'));

  const totalJogos = s.wins + s.draws + s.losses;
  const aproveitamento = totalJogos > 0 ? Math.round(((s.wins * 3 + s.draws) / (totalJogos * 3)) * 100) : 0;
  const mediaGM = totalJogos > 0 ? (s.scored / totalJogos).toFixed(1) : '0.0';
  const mediaGS = totalJogos > 0 ? (s.conceded / totalJogos).toFixed(1) : '0.0';

  const playerRows = computeCompetitionPlayerStats(s.matches);
  const trainingMetrics = computeTrainingMetricsForMatches(s.matches);
  const conclusao = getPhaseConclusion();

  const topScorer = s.scorers[0] || null;
  const topAssister = s.assisters[0] || null;
  const mostUsed = playerRows[0] || null;

  const printArea = document.getElementById('print-area');

  let html = `
  <div class="print-card" style="padding:20px; font-family:-apple-system, sans-serif;">
    <div class="print-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:15px;">
      <div>
        <h1 style="font-size:20px; margin:0; text-transform:uppercase; color:#000;">RELATÓRIO CONSOLIDADO</h1>
        <p style="font-size:14px; font-weight:bold; margin:4px 0 0 0; color:#333;">${filterLabel}</p>
        <p style="font-size:11px; color:#555; margin:3px 0 0 0;">Clube: <b>${getClubAndEscalao()}</b> | Época: <b>${activeSeason === 'TUDO' ? 'Todas' : activeSeason}</b></p>
      </div>
      ${getClubLogoHtml()}
    </div>

    <h3 style="font-size:12px; font-weight:bold; margin:0 0 8px 0; border-bottom:1px solid #000; padding-bottom:3px; text-transform:uppercase;">📊 Resumo de Jogos</h3>
    <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:15px; text-align:center;">
      <div style="background:#F3F4F6; border-radius:6px; padding:8px;"><div style="font-size:18px; font-weight:bold;">${totalJogos}</div><div style="font-size:9px; color:#666; text-transform:uppercase;">Jogos</div></div>
      <div style="background:#F3F4F6; border-radius:6px; padding:8px;"><div style="font-size:18px; font-weight:bold; color:#166534;">${s.wins}V ${s.draws}E ${s.losses}D</div><div style="font-size:9px; color:#666; text-transform:uppercase;">Resultado</div></div>
      <div style="background:#F3F4F6; border-radius:6px; padding:8px;"><div style="font-size:18px; font-weight:bold;">${aproveitamento}%</div><div style="font-size:9px; color:#666; text-transform:uppercase;">Aproveitamento</div></div>
      <div style="background:#F3F4F6; border-radius:6px; padding:8px;"><div style="font-size:18px; font-weight:bold;">${mediaGM} / ${mediaGS}</div><div style="font-size:9px; color:#666; text-transform:uppercase;">Média GM/GS</div></div>
    </div>

    <div style="display:flex; gap:10px; margin-bottom:15px;">
      <div style="flex:1; border:1px solid #CCC; border-radius:6px; padding:10px; text-align:center;">
        <div style="font-size:9px; color:#666; text-transform:uppercase; font-weight:bold;">Em Casa</div>
        <div style="font-size:13px; font-weight:bold; margin-top:3px;">${s.casaWins}V ${s.casaDraws}E ${s.casaLosses}D</div>
      </div>
      <div style="flex:1; border:1px solid #CCC; border-radius:6px; padding:10px; text-align:center;">
        <div style="font-size:9px; color:#666; text-transform:uppercase; font-weight:bold;">Fora</div>
        <div style="font-size:13px; font-weight:bold; margin-top:3px;">${s.foraWins}V ${s.foraDraws}E ${s.foraLosses}D</div>
      </div>
    </div>

    ${s.last5Form && s.last5Form.length > 0 ? `
    <h3 style="font-size:12px; font-weight:bold; margin:0 0 8px 0; border-bottom:1px solid #000; padding-bottom:3px; text-transform:uppercase;">📈 Forma (Últimos ${s.last5Form.length})</h3>
    <div style="margin-bottom:15px;">${s.last5Form.map(r => `<span style="display:inline-block; width:22px; height:22px; line-height:22px; border-radius:50%; text-align:center; font-weight:bold; font-size:11px; margin-right:6px; background:${r==='V'?'#166534':(r==='E'?'#CA8A04':'#B91C1C')}; color:#fff;">${r}</span>`).join('')}</div>` : ''}

    <h3 style="font-size:12px; font-weight:bold; margin:0 0 8px 0; border-bottom:1px solid #000; padding-bottom:3px; text-transform:uppercase;">⭐ Destaques da Competição</h3>
    <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:15px; font-size:11px;">
      <div style="border:1px solid #CCC; border-radius:6px; padding:8px; text-align:center;"><div style="font-size:9px; color:#666; text-transform:uppercase;">Melhor Marcador</div><div style="font-weight:bold; margin-top:3px;">${topScorer ? `${topScorer.name} (${topScorer.count})` : '-'}</div></div>
      <div style="border:1px solid #CCC; border-radius:6px; padding:8px; text-align:center;"><div style="font-size:9px; color:#666; text-transform:uppercase;">Melhor Assistente</div><div style="font-weight:bold; margin-top:3px;">${topAssister ? `${topAssister.name} (${topAssister.count})` : '-'}</div></div>
      <div style="border:1px solid #CCC; border-radius:6px; padding:8px; text-align:center;"><div style="font-size:9px; color:#666; text-transform:uppercase;">Mais Utilizado</div><div style="font-weight:bold; margin-top:3px;">${mostUsed ? `${mostUsed.name} (${mostUsed.minutes}')` : '-'}</div></div>
    </div>

    <h3 style="font-size:12px; font-weight:bold; margin:0 0 8px 0; border-bottom:1px solid #000; padding-bottom:3px; text-transform:uppercase;">👥 Estatísticas do Plantel</h3>
    <table style="width:100%; border-collapse:collapse; font-size:10px; margin-bottom:15px;">
      <tr style="border-bottom:1px solid #000;"><th style="text-align:left; padding:4px;">Jogador</th><th style="padding:4px;">Min</th><th style="padding:4px;">Tit.</th><th style="padding:4px;">G</th><th style="padding:4px;">A</th><th style="padding:4px;">🟨</th><th style="padding:4px;">🟥</th></tr>
      ${playerRows.map(r => `<tr style="border-bottom:1px solid #EEE;"><td style="padding:4px;">${r.name}</td><td style="text-align:center; padding:4px;">${r.minutes}'</td><td style="text-align:center; padding:4px;">${r.starts}</td><td style="text-align:center; padding:4px;">${r.goals}</td><td style="text-align:center; padding:4px;">${r.assists}</td><td style="text-align:center; padding:4px;">${r.yellow}</td><td style="text-align:center; padding:4px;">${r.red}</td></tr>`).join('') || '<tr><td colspan="7" style="padding:8px; text-align:center; color:#666;">Sem dados de plantel.</td></tr>'}
    </table>

    <h3 style="font-size:12px; font-weight:bold; margin:0 0 8px 0; border-bottom:1px solid #000; padding-bottom:3px; text-transform:uppercase;">🏋️ Treino no Período</h3>
    <div style="border:1px solid #CCC; border-radius:6px; padding:10px; margin-bottom:15px; font-size:11px;">
      ${trainingMetrics.count > 0
        ? `Treinos realizados: <b>${trainingMetrics.count}</b> &nbsp;|&nbsp; Aproveitamento médio da equipa: <b>${trainingMetrics.pct}%</b><br><span style="font-size:9px; color:#888;">Calculado com base no plantel a partir da respetiva data de entrada de cada atleta, entre ${trainingMetrics.startDate.split('-').reverse().join('/')} e ${trainingMetrics.endDate.split('-').reverse().join('/')}.</span>`
        : 'Sem treinos registados neste período.'}
    </div>

    <h3 style="font-size:12px; font-weight:bold; margin:0 0 6px 0; border-bottom:1px solid #000; padding-bottom:3px; text-transform:uppercase;">💬 Balanço Tático & Conclusão</h3>
    <div style="border:1px solid #CCC; background:#FFF; border-radius:6px; padding:10px; min-height:60px; font-size:11px; line-height:1.4; color:#333; margin-bottom:20px; white-space:pre-wrap;">
      ${conclusao || 'Sem balanço registado para este período.'}
    </div>

    <div style="margin-top:30px; display:flex; justify-content:space-between; align-items:flex-end;">
      <div style="font-size:10px; color:#666;">• Relatório Consolidado — Coachfolio v3.5.1</div>
      <div style="text-align:center; width:200px; border-top:1px solid #000; padding-top:4px; font-size:11px; font-weight:bold;">
        O Treinador
      </div>
    </div>
  </div>`;

  printArea.innerHTML = html;
  window.openSafePrintModal();
};
window.statsSeasonFilter = undefined;
function calcularEstatisticaJogador(playerId, targetSeason = state.currentSeason, typeFilter = 'todos', phaseFilter = 'todas', tourFilter = 'todas') {
  let golos = 0, assistencias = 0, amarelos = 0, vermelhos = 0, somaAvaliacoes = 0, numAvaliacoes = 0, faltasTreino = 0, jogosTitular = 0, totalSegundosJogo = 0, presencasTreino = 0, jogosConvocado = 0, jogosUtilizado = 0;
  let minutosTreinoCumpridos = 0, minutosTreinoTotais = 0, golosSofridos = 0;
  
  if (!IS_LICENSED || !state || !playerId) {
    return { golos:0, assistencias:0, amarelos:0, vermelhos:0, media:'-', faltasTreino:0, presencasTreino:0, totalTreinos:0, minutosTreinoCumpridos:0, minutosTreinoTotais:0, jogosTitular:0, jogosConvocado:0, jogosUtilizado:0, minutos:"0m 0s", totalSegundosJogo:0, golosSofridos:0 };
  }

  const validTrainings = (state.trainings || []).filter(tr => tr && (tr.status === undefined || tr.status === 'completed') && (targetSeason === 'TUDO' || getEntitySeason(tr) === targetSeason));
  
  let totalTreinos = validTrainings.length;
  validTrainings.forEach(tr => { minutosTreinoTotais += (parseInt(tr.duration, 10) || 90); });

  const pInfo = state.roster.find(x=>x.id===playerId);
  const isGK = pInfo && typeof pInfo.positions === 'string' && getPosRank(pInfo.positions) === 1;

  (state.matches || []).filter(m => {
    if (!m) return false;
    if (targetSeason !== 'TUDO' && getEntitySeason(m) !== targetSeason) return false;
    if (typeFilter !== 'todos' && m.type !== typeFilter) return false;
    if (typeFilter === 'campeonato' && phaseFilter !== 'todas' && (m.phase||'').trim() !== phaseFilter) return false;
    if (typeFilter === 'torneio' && tourFilter !== 'todas' && (m.tournamentName||'').trim() !== tourFilter) return false;
    return true;
  }).forEach(m => {
    const usedInMatch = (m.lineup || []).includes(playerId) || (m.subs || []).some(s => s && s.inId === playerId);
    const calledUpList = (m.originalSchedule && m.originalSchedule.callup && m.originalSchedule.callup.length > 0) ? m.originalSchedule.callup : null;
    
    // Convocatória conta SEMPRE
    if (calledUpList ? calledUpList.includes(playerId) : usedInMatch) jogosConvocado++;

    if (state.trackSubs && m.finished) {
      // SE NÃO FOR PARA IGNORAR, CONTA TUDO O RESTO
      if (!m.ignoreMinutes) {
        if (usedInMatch) jogosUtilizado++;
        if ((m.lineup || []).includes(playerId)) jogosTitular++; 
        if (typeof calcPlayerMinutes === 'function') totalSegundosJogo += calcPlayerMinutes(m, playerId); 
      }
    }    
    (m.goals || []).forEach(g => { 
      if (g && g.type === 'scored' && g.scorerId === playerId) golos++; 
      if (g && g.type === 'scored' && g.assistId === playerId) assistencias++; 
      
      if (g && g.type === 'conceded') {
          if (g.gkId && g.gkId !== 'auto' && g.gkId !== 'none') {
              // Se selecionaste explicitamente o jogador (GR ou jogador de campo adaptado)
              if (g.gkId === playerId) golosSofridos++;
          } else {
              // Apenas aplica o cálculo legado se fores um GR de ofício (para jogos antigos)
              if (isGK) {
                  if (!state.trackSubs || m.ignoreMinutes || !m.lineup || m.lineup.length === 0) {
                      // Se ignoraste os minutos e não marcaste manual, assume o Titular
                      if (m.lineup && m.lineup.includes(playerId)) golosSofridos++;
                  } else {
                      let goalHalf = g.half || 1; let goalMin = g.minute || 0;
                      let currentXI = [...(m.lineup || [])];
                      let subsBeforeGoal = (m.subs || []).filter(s => {
                          if (s.half < goalHalf) return true;
                          if (s.half === goalHalf) { if (s.isHalftime) return true; return (s.minute || 0) <= goalMin; }
                          return false;
                      }).sort((a,b) => (a.half - b.half) || (a.isHalftime ? -1 : 1) || ((a.minute||0) - (b.minute||0)));
                      subsBeforeGoal.forEach(s => { currentXI = currentXI.filter(id => id !== s.outId); currentXI.push(s.inId); });
                      if (currentXI.includes(playerId)) golosSofridos++;
                  }
              }
          }
      }
    });  
    (m.cards || []).forEach(c => { 
      if (c && c.playerId === playerId) { if (c.color === 'Amarelo') amarelos++; else vermelhos++; } 
    });
    if (m.ratings && m.ratings[playerId]) { somaAvaliacoes += m.ratings[playerId]; numAvaliacoes++; }
  });
  
  validTrainings.forEach(tr => {
    const dur = parseInt(tr.duration, 10) || 90;
    let absReason = null;
    if (Array.isArray(tr.absences)) { absReason = tr.absences.includes(playerId) ? 'injustificada' : null; }
    else if (tr.absences && tr.absences[playerId]) { absReason = tr.absences[playerId]; }

    // Só razões de ausência total (nunca esteve no treino) contam como falta.
    // Atrasado/Dispensado/Lesão/Castigo significam que esteve presente parte do tempo — conta como presença.
    const trueAbsenceReasons = ['injustificada', 'justificada'];

    if (absReason && trueAbsenceReasons.includes(absReason)) {
      faltasTreino++;
      if (tr.customMinutes && tr.customMinutes[playerId] != null) { minutosTreinoCumpridos += parseInt(tr.customMinutes[playerId], 10); }
    } else if (absReason) {
      presencasTreino++;
      minutosTreinoCumpridos += (tr.customMinutes && tr.customMinutes[playerId] != null) ? parseInt(tr.customMinutes[playerId], 10) : 0;
    } else { 
      presencasTreino++; minutosTreinoCumpridos += dur; 
    }
  });
  
  return { 
    golos, assistencias, amarelos, vermelhos, 
    media: numAvaliacoes > 0 ? (somaAvaliacoes / numAvaliacoes).toFixed(1) : '-', 
    faltasTreino, presencasTreino, totalTreinos, 
    minutosTreinoCumpridos, minutosTreinoTotais,
    jogosTitular, jogosConvocado, jogosUtilizado, 
    minutos: formatSecsToMinSec(totalSegundosJogo),
    totalSegundosJogo, golosSofridos 
  };
}
function generatePlayerBarsHTML(stats, maxStats, isGK = false, isPDF = false) {
    const playerMins = Math.round((stats.totalSegundosJogo || 0) / 60);
    const maxMins = Math.round((maxStats.minutos || 1) / 60) || 1;

    // Definição de cores e contrastes automáticos para App (Escuro) vs PDF (Claro)
    const labelColor = isPDF ? '#333333' : 'var(--muted)';
    const valColor = isPDF ? '#000000' : 'var(--chalk)';
    const barBg = isPDF ? '#D1D5DB' : 'var(--surface-2)';

    const attrs = [
        { label: 'MINS', val: playerMins, max: maxMins, color: '#D9A441' },
        { label: 'GOLOS', val: stats.golos || 0, max: maxStats.golos || 1, color: isPDF ? '#374151' : 'var(--chalk)' },
        { label: 'ASSIST', val: stats.assistencias || 0, max: maxStats.assist || 1, color: '#2563EB' },
        { label: 'TITUL.', val: stats.jogosTitular || 0, max: maxStats.jogos || 1, color: '#059669' }
    ];

    if (isGK) {
        attrs.push({
            label: 'SOFRIDOS',
            val: stats.golosSofridos || 0,
            max: maxStats.golosSofridos || 1,
            color: '#DC2626'
        });
    }

    let html = '<div style="display:flex; flex-direction:column; gap:8px; width:100%; text-align:left;">';
    attrs.forEach(a => {
        let pct = a.max > 0 ? (a.val / a.max) * 100 : 0;
        pct = Math.min(100, Math.max(0, pct));
        
        html += `<div style="display:flex; align-items:center; font-size:9px;">
          <div style="width:52px; color:${labelColor}; font-weight:bold;">${a.label}</div>
          <div style="flex:1; background:${barBg}; height:6px; border-radius:3px; overflow:hidden; margin:0 8px;">
            <div style="width:${pct}%; height:100%; background:${a.color}; border-radius:3px;"></div>
          </div>
          <div style="width:25px; text-align:right; font-weight:bold; font-family:ui-monospace, monospace; color:${valColor};">${a.val}</div>
        </div>`;
    });
    html += '</div>';
    return html;
}

function generateDonutChartSVG(minutosCumpridos, minutosTotais) {
    const size = 100; const cx = 50; const cy = 50; const r = 35;
    if(!minutosTotais || minutosTotais === 0) return `<svg viewBox="0 0 100 100" style="width:100%; height:auto; max-width:100px; margin:0 auto; display:block;"><circle cx="50" cy="50" r="35" fill="none" stroke="var(--surface-2)" stroke-width="12"/></svg>`;
    
    // Calcula a percentagem exata com base nos minutos de treino
    const pctP = Math.min(1, Math.max(0, minutosCumpridos / minutosTotais)); 
    const dashP = pctP * 2 * Math.PI * r; 
    const dashEmpty = 2 * Math.PI * r;
    
    return `<svg viewBox="0 0 100 100" style="width:100%; height:auto; max-width:120px; margin:0 auto; display:block; transform:rotate(-90deg);"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--red)" stroke-width="14"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--green)" stroke-width="14" stroke-dasharray="${dashP} ${dashEmpty}" /><text x="${cx}" y="${cy}" fill="currentColor" font-size="14" font-weight="bold" text-anchor="middle" dominant-baseline="central" transform="rotate(90, ${cx}, ${cy})">${Math.round(pctP*100)}%</text></svg>`;
}
window.exportStatsPlayersPDF = function() {
    let activeSeason = window.statsSeasonFilter === 'todas' ? 'TUDO' : (window.statsSeasonFilter || state.currentSeason);
    const roster = eligiblePlayers().sort((a,b) => (a.name||'').localeCompare(b.name||''));
    let html = `
    <div class="print-card">
       <div class="print-header" style="display:flex; justify-content:space-between; align-items:center;">
           <div>
             <h1>Estatísticas Individuais de Plantel</h1>
             <p>${t('rep_gen')} ${new Date().toLocaleDateString('pt-PT')} | Época: ${activeSeason === 'TUDO' ? 'Histórico Total' : activeSeason} | ${getClubAndEscalao()}</p>
           </div>
           ${getClubLogoHtml()}
       </div>
       <table style="width:100%; border-collapse:collapse; text-align:center; font-size:12px;">
         <tr>
           <th style="text-align:left;">Nome do Jogador</th>
           <th>Pres</th>
           <th>MinT</th>
           <th>Conv</th>
           <th>Util</th>
           <th>Mins</th>
           <th>GM</th>
           <th>A</th>
           <th>GS</th>
           <th>🟨</th>
           <th>🟥</th>
         </tr>
         ${roster.map(p => {
             // O Segredo: Passar todos os filtros para o PDF sai igual ao que estás a ver na app
             const st = calcularEstatisticaJogador(p.id, activeSeason, statsFilter, statsPhaseFilter, statsTournamentFilter);
             const isGK = p.positions && typeof p.positions === 'string' && (p.positions.toUpperCase().includes('GR') || p.positions.toUpperCase().includes('GK'));
             return `<tr>
               <td style="text-align:left; font-weight:bold;">${p.name}</td>
               <td>${st.presencasTreino}</td>
               <td>${st.minutosTreinoCumpridos}'</td>
               <td>${st.jogosConvocado}</td>
               <td>${st.jogosUtilizado}</td>
               <td>${st.minutos}</td>
               <td>${st.golos}</td>
               <td>${st.assistencias}</td>
               <td>${isGK ? st.golosSofridos : '-'}</td>
               <td>${st.amarelos}</td>
               <td>${st.vermelhos}</td>
             </tr>`;
         }).join('')}
       </table>
    </div>`;
    const printArea = document.getElementById('print-area'); 
    printArea.innerHTML = html; 
    window.openSafePrintModal();
};
// HELPER: Constrói o desenho do campo tático para o PDF do Treino
window.buildExerciseTacticalPitchSVG = function(notebookId) {
  const play = (state.tacticalNotebook || []).find(x => x.id === notebookId);
  if (!play || !play.tactics) return '';

  const isHalf = !!play.halfPitch;
  const pieceBg = state.teamColor || '#D9A441';
  const pieceColor = typeof getContrastColor === 'function' ? getContrastColor(pieceBg) : '#000000';
  const oppBg = state.oppColor || '#C8493F';
  const oppColor = typeof getContrastColor === 'function' ? getContrastColor(oppBg) : '#FFFFFF';

  let piecesSVG = '';
  (play.tactics || []).forEach(p => {
    const cx = Number.isFinite(Number(p.x)) ? Number(p.x) : 50;
    const cy = Number.isFinite(Number(p.y)) ? Number(p.y) : 50;
    const svgY = (cy / 100) * 75; // Converte para a escala 4:3 do SVG

    if (p.kind === 'own' || p.kind === 'opp') {
        const bg = p.kind === 'own' ? pieceBg : oppBg;
        const fg = p.kind === 'own' ? pieceColor : oppColor;
        const label = p.label || '';
        piecesSVG += `<circle cx="${cx}" cy="${svgY}" r="3.5" fill="${bg}" stroke="#FFFFFF" stroke-width="0.5" /><text x="${cx}" y="${svgY + 1.2}" fill="${fg}" font-size="3" font-weight="bold" font-family="-apple-system, sans-serif" text-anchor="middle">${label}</text>`;
    } else if (p.kind === 'ball') {
        piecesSVG += `<circle cx="${cx}" cy="${svgY}" r="2" fill="#FFF" stroke="#000" stroke-width="0.5" />`;
    } else {
        let svgContent = '';
        if (p.kind === 'cone') svgContent = `<polygon points="-3,4 3,4 1.5,-4 -1.5,-4" fill="${p.color || '#FF9500'}" stroke="#000" stroke-width="0.5"/><ellipse cx="0" cy="4" rx="4" ry="1.5" fill="${p.color || '#FF9500'}" stroke="#000" stroke-width="0.5"/>`;
        else if (p.kind === 'minigoal') svgContent = `<rect x="-5" y="-3" width="10" height="6" rx="1" fill="none" stroke="#FFFFFF" stroke-width="1.5"/><line x1="-5" y1="-3" x2="5" y2="-3" stroke="#FF3B30" stroke-width="1"/>`;
        else if (p.kind === 'pole') svgContent = `<circle cx="0" cy="0" r="2" fill="${p.color || '#FF2D55'}" stroke="#000" stroke-width="0.5"/><line x1="0" y1="0" x2="0" y2="-6" stroke="${p.color || '#FF2D55'}" stroke-width="1.5"/>`;
        else if (p.kind === 'rope') svgContent = `<line x1="-8" y1="-3" x2="8" y2="-3" stroke="#EAB308" stroke-width="0.8"/><line x1="-8" y1="3" x2="8" y2="3" stroke="#EAB308" stroke-width="0.8"/><line x1="-6" y1="-3" x2="-6" y2="3" stroke="#EAB308" stroke-width="0.8"/><line x1="-2" y1="-3" x2="-2" y2="3" stroke="#EAB308" stroke-width="0.8"/><line x1="2" y1="-3" x2="2" y2="3" stroke="#EAB308" stroke-width="0.8"/><line x1="6" y1="-3" x2="6" y2="3" stroke="#EAB308" stroke-width="0.8"/>`;
        piecesSVG += `<g transform="translate(${cx}, ${svgY}) scale(0.6)">${svgContent}</g>`;
    }
  });

  let pathsSVG = '';
  (play.tacticPaths || []).forEach(path => {
    if (!path.points || path.points.length === 0) return;
    const pts = path.points.map(pt => `${pt.x},${(pt.y / 100) * 75}`).join(' ');
    pathsSVG += `<polyline points="${pts}" fill="none" stroke="${path.color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />`;
  });

  return `
    <div style="width:100%; aspect-ratio:4/3; background:#113821; border-radius:6px; overflow:hidden; position:relative;">
      <svg viewBox="0 0 100 75" style="width:100%; height:100%; display:block;">
        <rect x="0" y="0" width="100" height="75" fill="#113821" />
        <rect x="3" y="3" width="94" height="69" fill="none" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
        ${isHalf ? `
            <line x1="3" y1="72" x2="97" y2="72" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
            <circle cx="50" cy="72" r="14" fill="none" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
            <rect x="22" y="3" width="56" height="18" fill="none" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
            <rect x="34" y="3" width="32" height="7" fill="none" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
        ` : `
            <line x1="50" y1="3" x2="50" y2="72" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
            <circle cx="50" cy="37.5" r="10" fill="none" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
            <rect x="3" y="20" width="14" height="35" fill="none" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
            <rect x="83" y="20" width="14" height="35" fill="none" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
        `}
        ${pathsSVG}
        ${piecesSVG}
      </svg>
    </div>`;
};

window.exportTrainingPDF = function(trId, mode = 'full') {
  const tr = state.trainings.find(t => t.id === trId);
  if (!tr) return;

  const dateStr = tr.date.split('-').reverse().join('/');
  const duration = tr.duration || 90;
  const isCompleted = tr.status === undefined || tr.status === 'completed';

  let attendanceHtml = '';
  
  // SÓ GERA A TABELA SE FOR O MODO COMPLETO
  if (mode === 'full') {
      let absObj = {};
      if (Array.isArray(tr.absences)) {
        tr.absences.forEach(id => absObj[id] = 'injustificada');
      } else {
        absObj = tr.absences || {};
      }

      const allPlayers = eligiblePlayers();
      
      let rowsHtml = '';
      allPlayers.forEach((p, idx) => {
        const reason = absObj[p.id];
        let statusText = '<span style="color:#059669; font-weight:bold;">🟢 Presente</span>';
        let minsCumpridos = `${duration}'`;

        if (reason) {
          if (reason === 'injustificada') statusText = '<span style="color:#DC2626; font-weight:bold;">🔴 Faltou (Injustificada)</span>';
          else if (reason === 'justificada') statusText = '<span style="color:#D97706; font-weight:bold;">🟡 Ausente (Justificada)</span>';
          else if (reason === 'atrasado') statusText = '<span style="color:#CA8A04; font-weight:bold;">🕐 Atrasado</span>';
          else if (reason === 'lesao') statusText = '<span style="color:#2563EB; font-weight:bold;">🩹 Lesionado / Médico</span>';
          else if (reason === 'castigo') statusText = '<span style="color:#DC2626; font-weight:bold;">🟥 Castigado</span>';
          else if (reason === 'dispensado') statusText = '<span style="color:#4B5563; font-weight:bold;">⚪ Dispensado</span>';

          const customMins = tr.customMinutes && tr.customMinutes[p.id] != null ? tr.customMinutes[p.id] : 0;
          minsCumpridos = `${customMins}' / ${duration}'`;
        }

        let bg = idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF';

        rowsHtml += `
          <tr style="background:${bg}; border-bottom:1px solid #E5E7EB;">
            <td style="text-align:left; font-weight:bold; padding:6px 12px; color:#111827;">${playerLabel(p)}</td>
            <td style="text-align:center; padding:6px 0;">${statusText}</td>
            <td style="text-align:center; font-family:monospace; font-weight:bold; color:#374151;">${minsCumpridos}</td>
          </tr>`;
      });

      attendanceHtml = `
      <div style="background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px; padding:12px; margin-bottom:18px;">
        <h3 style="font-size:11px; font-weight:800; margin:0 0 8px 0; border-bottom:2px solid #0E211A; padding-bottom:4px; text-transform:uppercase; color:#0E211A;">
          🏃 Controlo de Presenças & Tempo Efetivo (${allPlayers.length} Atletas)
        </h3>
        <table style="width:100%; border-collapse:collapse; font-size:11px;">
          <thead>
            <tr style="background:#E5E7EB; color:#374151;">
              <th style="text-align:left; padding:6px 12px;">Atleta</th>
              <th style="text-align:center;">Estado da Presença</th>
              <th style="text-align:center;">Tempo Cumprido</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>`;
  }

  // BLOCO DE EXERCÍCIOS PARA O PDF
  let exercisesPdfHtml = '';
  if (tr.exercises && tr.exercises.length > 0) {
    let exCards = tr.exercises.map((ex, idx) => {
      const svgHTML = window.buildExerciseTacticalPitchSVG ? window.buildExerciseTacticalPitchSVG(ex.notebookId) : '';
      return `
        <div style="border:1px solid #D1D5DB; background:#FFF; border-radius:8px; padding:10px; page-break-inside:avoid; display:flex; flex-direction:column;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
              <span style="font-size:11px; font-weight:bold; color:#111827;">${idx + 1}. ${ex.name}</span>
              <span style="font-size:10px; font-weight:bold; color:#D9A441; background:#FEF3C7; padding:2px 6px; border-radius:4px;">${ex.duration} Min</span>
          </div>
          ${svgHTML ? `<div style="margin-top:auto;">${svgHTML}</div>` : `<div style="font-size:10px; color:#9CA3AF; text-align:center; padding:10px;">Sem esquema visual</div>`}
        </div>
      `;
    }).join('');

    exercisesPdfHtml = `
      <div style="background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px; padding:12px; margin-bottom:18px;">
        <h3 style="margin:0 0 10px 0; color:#0E211A; font-size:12px; font-weight:800; text-transform:uppercase; border-bottom:1px solid #D1D5DB; padding-bottom:4px;">📋 Esquemas Táticos da Sessão</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          ${exCards}
        </div>
      </div>`;
  }

  const planText = (tr.plan || tr.notes || '').trim();
  const obsText = (tr.obs || '').trim();

  let html = `
    <div class="print-card" style="padding:24px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#111827;">
      <div class="print-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #0E211A; padding-bottom:12px; margin-bottom:18px;">
        <div>
          <h1 style="font-size:20px; margin:0; text-transform:uppercase; letter-spacing:0.05em; color:#0E211A; font-weight:800;">RELATÓRIO DE SESSÃO DE TREINO</h1>
          <p style="font-size:18px; font-weight:800; margin:4px 0 0 0; color:#D9A441;">Data: ${dateStr} &nbsp;|&nbsp; Duração Total: ${duration} Min</p>
          <p style="font-size:11px; color:#4B5563; margin-top:2px;">Clube: <b>${getClubAndEscalao()}</b> &nbsp;|&nbsp; Época: <b>${tr.season || state.currentSeason}</b> &nbsp;|&nbsp; Estado: <b>${isCompleted ? 'Concluído' : 'Agendado'}</b></p>
        </div>
        ${getClubLogoHtml()}
      </div>

      ${exercisesPdfHtml}

      ${planText ? `
      <div style="border:1px solid #E5E7EB; padding:12px; border-radius:8px; background:#F9FAFB; margin-bottom:18px; page-break-inside:avoid;">
        <h3 style="margin:0 0 6px 0; color:#0E211A; font-size:11px; font-weight:800; text-transform:uppercase; border-bottom:1px solid #D1D5DB; padding-bottom:3px;">🏋️‍♂️ Plano Descritivo da Sessão</h3>
        <div style="white-space:pre-wrap; font-size:11px; line-height:1.5; color:#1F2937;">${planText}</div>
      </div>` : ''}

      ${obsText ? `
      <div style="border:1px solid #E5E7EB; padding:12px; border-radius:8px; background:#F9FAFB; margin-bottom:18px; page-break-inside:avoid;">
        <h3 style="margin:0 0 6px 0; color:#0E211A; font-size:11px; font-weight:800; text-transform:uppercase; border-bottom:1px solid #D1D5DB; padding-bottom:3px;">📝 Notas & Observações</h3>
        <div style="white-space:pre-wrap; font-size:11px; line-height:1.5; color:#1F2937;">${obsText}</div>
      </div>` : ''}

      ${attendanceHtml}

      <div style="margin-top:24px; display:flex; justify-content:space-between; align-items:flex-end;">
        <div style="font-size:10px; color:#6B7280;">• Documento de Análise & Registo — Coachfolio v3.5</div>
        <div style="text-align:center; width:200px; border-top:1.5px solid #111827; padding-top:4px; font-size:11px; font-weight:bold;">A Equipa Técnica</div>
      </div>
    </div>`;

  document.getElementById('print-area').innerHTML = html;
  window.openSafePrintModal();
};

function renderStats(){
  const seasons = getSeasonsList();
  let activeSeason = window.statsSeasonFilter === 'todas' ? 'TUDO' : (window.statsSeasonFilter || state.currentSeason);
  
  const s = computeStats(statsFilter, activeSeason, statsPhaseFilter, statsTournamentFilter); 
  let html = `${topbarHtml(t('hub_team_title'))}${renderTeamSubHeader()}
    <div class="seg" style="margin-bottom:12px;"><div class="seg-btn ${statsViewMode==='team'?'active':''}" onclick="statsViewMode='team'; render()">${t('st_team')}</div><div class="seg-btn ${statsViewMode==='players'?'active':''}" onclick="statsViewMode='players'; render()">${t('st_players')}</div></div>`;

  let seasonFilterUI = seasons.length > 1 ? `<div style="margin-bottom:14px; overflow-x:auto; display:flex; gap:6px; padding-bottom:6px;"><div class="seg-btn ${activeSeason==='TUDO'?'active':''}" style="flex:none; padding:8px 12px; font-size:10px;" onclick="window.statsSeasonFilter='todas'; render()">Tudo</div>${seasons.map(season=>`<div class="seg-btn ${activeSeason===season?'active':''}" style="flex:none; padding:8px 12px; font-size:10px;" onclick="window.statsSeasonFilter='${season}'; render()">${season}</div>`).join('')}</div>` : '';
  html += seasonFilterUI;

  // OS NOVOS FILTROS ALINHADOS E INTELIGENTES (Sem Fases nos Torneios e limpo no "Todos")
  let matchFiltersUI = `
    <div class="seg" style="margin-bottom: 8px;">
      <div class="seg-btn ${statsFilter==='todos'?'active':''}" onclick="statsFilter='todos'; statsPhaseFilter='todas'; statsTournamentFilter='todas'; render()">${t('st_all')}</div>
      <div class="seg-btn ${statsFilter==='amigavel'?'active':''}" onclick="statsFilter='amigavel'; statsPhaseFilter='todas'; statsTournamentFilter='todas'; render()">${t('sch_friendly')}</div>
      <div class="seg-btn ${statsFilter==='campeonato'?'active':''}" onclick="statsFilter='campeonato'; statsPhaseFilter='todas'; statsTournamentFilter='todas'; render()">${t('sch_champ')}</div>
      <div class="seg-btn ${statsFilter==='torneio'?'active':''}" onclick="statsFilter='torneio'; statsPhaseFilter='todas'; statsTournamentFilter='todas'; render()">${t('sch_tour')}</div>
    </div>
    ${(statsFilter === 'campeonato' && s.availablePhases.length > 0) ? `<div class="seg" style="margin-bottom: 16px;"><div class="seg-btn ${statsPhaseFilter==='todas'?'active':''}" onclick="statsPhaseFilter='todas'; render()" style="padding:6px; font-size:10px;">${t('st_all_phases')}</div>${s.availablePhases.map(ph => `<div class="seg-btn ${statsPhaseFilter===ph?'active':''}" onclick="statsPhaseFilter='${ph}'; render()" style="padding:6px; font-size:10px;">${ph}</div>`).join('')}</div>` : ''}
    ${(statsFilter === 'torneio' && s.availableTournaments.length > 0) ? `<div class="seg" style="margin-bottom: 16px;"><div class="seg-btn ${statsTournamentFilter==='todas'?'active':''}" onclick="statsTournamentFilter='todas'; render()" style="padding:6px; font-size:10px;">Todos os Torneios</div>${s.availableTournaments.map(tn => `<div class="seg-btn ${statsTournamentFilter===tn?'active':''}" onclick="statsTournamentFilter='${escapeHTML(tn)}'; render()" style="padding:6px; font-size:10px;">${tn}</div>`).join('')}</div>` : ''}
  `;
  
  if ((statsFilter === 'todos' || statsFilter === 'amigavel') || (statsFilter === 'campeonato' && s.availablePhases.length === 0) || (statsFilter === 'torneio' && s.availableTournaments.length === 0)) {
      matchFiltersUI += `<div style="margin-bottom:16px;"></div>`;
  }
  
  html += matchFiltersUI;

  if (statsViewMode === 'players') {
      let playerStatsArray = eligiblePlayers().map(p => {
          // Passamos os filtros todos para os jogadores acompanharem a equipa
          const st = calcularEstatisticaJogador(p.id, activeSeason, statsFilter, statsPhaseFilter, statsTournamentFilter); 
          const pPct = st.minutosTreinoTotais > 0 ? Math.round((st.minutosTreinoCumpridos / st.minutosTreinoTotais)*100) : 0;
          return { player: p, st: st, pPct: pPct };
      });

      playerStatsArray.sort((a, b) => {
          let valA, valB;
          switch(statsSortCol) {
              case 'nome': valA = (a.player.name||'').toLowerCase(); valB = (b.player.name||'').toLowerCase(); break;
              case 'presencas': valA = a.st.presencasTreino; valB = b.st.presencasTreino; break;
              case 'mint': valA = a.st.minutosTreinoCumpridos; valB = b.st.minutosTreinoCumpridos; break;
              case 'j': valA = a.st.jogosConvocado; valB = b.st.jogosConvocado; break;
              case 'u': valA = a.st.jogosUtilizado; valB = b.st.jogosUtilizado; break;
              case 'minutos': valA = a.st.totalSegundosJogo; valB = b.st.totalSegundosJogo; break;
              case 'g': valA = a.st.golos; valB = b.st.golos; break;
              case 'a': valA = a.st.assistencias; valB = b.st.assistencias; break;
              case 'gs': valA = a.st.golosSofridos; valB = b.st.golosSofridos; break;
              case 'amarelos': valA = a.st.amarelos; valB = b.st.amarelos; break;
              case 'vermelhos': valA = a.st.vermelhos; valB = b.st.vermelhos; break;
              default: valA = a.st.totalSegundosJogo; valB = b.st.totalSegundosJogo;
          }
          if (valA < valB) return statsSortAsc ? -1 : 1;
          if (valA > valB) return statsSortAsc ? 1 : -1;
          return 0;
      });

      const getSortIcon = (col) => statsSortCol === col ? (statsSortAsc ? ' ↑' : ' ↓') : '';
      
      let tableHtml = `<div class="stats-table-wrapper"><table class="stats-table">
        <tr>
          <th class="p-name" onclick="setStatsSort('nome')">${t('pl_sort_name')}${getSortIcon('nome')}</th>
          <th onclick="setStatsSort('presencas')">Pres${getSortIcon('presencas')}</th>
          <th onclick="setStatsSort('mint')">MinT${getSortIcon('mint')}</th>
          <th onclick="setStatsSort('j')">Conv${getSortIcon('j')}</th>
          <th onclick="setStatsSort('u')">Util${getSortIcon('u')}</th>
          <th onclick="setStatsSort('minutos')">Mins${getSortIcon('minutos')}</th>
          <th onclick="setStatsSort('g')">GM${getSortIcon('g')}</th>
          <th onclick="setStatsSort('a')">A${getSortIcon('a')}</th>
          <th onclick="setStatsSort('gs')">GS${getSortIcon('gs')}</th>
          <th onclick="setStatsSort('amarelos')">🟨${getSortIcon('amarelos')}</th>
          <th onclick="setStatsSort('vermelhos')">🟥${getSortIcon('vermelhos')}</th>
        </tr>`;
      
      playerStatsArray.forEach(item => {
          const p = item.player; const st = item.st; const pPct = item.pPct;
          const isGK = p.positions && typeof p.positions === 'string' && p.positions.toUpperCase().includes('GR');
          tableHtml += `<tr onclick="expandedPlayer='${p.id}'; navigateToTab('plantel');" style="cursor:pointer;">
            <td class="p-name">${p.name}</td>
            <td>${st.presencasTreino}</td>
            <td style="color:${pPct>=80?'var(--green)':(pPct>=50?'var(--yellow)':'var(--red)')}; font-weight:bold;">${st.minutosTreinoCumpridos}'</td>
            <td>${st.jogosConvocado}</td>
            <td>${st.jogosUtilizado}</td>
            <td style="color:var(--gold); font-weight:bold;">${st.minutos}</td>
            <td>${st.golos}</td>
            <td>${st.assistencias}</td>
            <td>${isGK ? st.golosSofridos : '-'}</td>
            <td>${st.amarelos}</td>
            <td>${st.vermelhos}</td>
          </tr>`;
      });
      
      tableHtml += `</table></div><div style="display:flex; gap:10px; margin-top:14px;"><button class="btn btn-outline" style="flex:1; border-style:dashed;" onclick="exportCsv()">${t('exp_csv')}</button><button class="btn btn-gold" style="flex:1;" onclick="exportStatsPlayersPDF()">📄 Exportar PDF</button></div>`;
      return html + tableHtml;
  }

  let bal1 = (s.scoredHalf[1] || 0) - (s.concededHalf[1] || 0); let color1 = bal1 > 0 ? 'var(--green)' : (bal1 < 0 ? 'var(--red)' : 'var(--muted)');
  let bal2 = (s.scoredHalf[2] || 0) - (s.concededHalf[2] || 0); let color2 = bal2 > 0 ? 'var(--green)' : (bal2 < 0 ? 'var(--red)' : 'var(--muted)');
  let formHtml = '';
  if(s.last5Form && s.last5Form.length > 0) { formHtml = `<div class="section-title" style="margin-top:16px;">${t('st_form')}</div><div class="card"><div style="font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:0.1em; margin-bottom:10px; font-weight:600;">${t('st_form_last', {n: s.last5Form.length})}</div><div class="chart-form-row"><div class="chart-form-line"></div>${s.last5Form.map(res => `<div class="form-dot ${res}" style="background:${res==='V'?'var(--green)':(res==='E'?'var(--yellow)':'var(--red)')}; color:#000; width:24px; height:24px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px; margin-right:8px;">${res}</div>`).join('')}</div></div>`; }
  
  let goalsChartHtml = '';
  if(s.last6Matches && s.last6Matches.length > 0) {
      let maxG = 1; s.last6Matches.forEach(m => { const sc = m.goals.filter(g=>g.type==='scored').length; const co = m.goals.filter(g=>g.type==='conceded').length; if(sc > maxG) maxG = sc; if(co > maxG) maxG = co; });
      const barsHtml = s.last6Matches.map(m => {
           const sc = m.goals.filter(g=>g.type==='scored').length; const co = m.goals.filter(g=>g.type==='conceded').length;
           const scPct = (sc / maxG) * 100; const coPct = (co / maxG) * 100; const shortOpp = m.opponent.split(' ')[0];
           const msg = m.location === 'casa' ? getMyClub() + ' ' + sc + ' - ' + co + ' ' + m.opponent : m.opponent + ' ' + co + ' - ' + sc + ' ' + getMyClub();
           return `<div class="chart-bar-group" onclick="showToast('${escapeHTML(msg)}')" style="cursor:pointer;"><div class="chart-bars"><div class="chart-bar scored" style="height:${scPct}%;"></div><div class="chart-bar conceded" style="height:${coPct}%;"></div></div><div class="chart-x-label">${escapeHTML(shortOpp)}</div></div>`;
       }).join('');
      goalsChartHtml = `<div class="card" style="margin-top:10px;"><div style="font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:0.1em; margin-bottom:4px; display:flex; justify-content:space-between; font-weight:600;"><span>${t('st_evol', {n:s.last6Matches.length})}</span><span><span style="color:var(--gold);">■ GM</span> <span style="color:var(--red); margin-left:4px;">■ GS</span></span></div><div class="chart-bar-container">${barsHtml}</div></div>`;
  }
  
  return html + `
    <div class="section-title" style="margin-top:0;">${t('st_global')}</div>
    <div class="stat-grid" style="grid-template-columns:1fr 1fr 1fr;"><div class="stat-box"><div class="num" style="color:var(--gold)">${s.wins}</div><div class="lbl">${t('st_wins')}</div></div><div class="stat-box"><div class="num" style="color:var(--chalk)">${s.draws}</div><div class="lbl">${t('st_draws')}</div></div><div class="stat-box"><div class="num" style="color:var(--red)">${s.losses}</div><div class="lbl">${t('st_losses')}</div></div></div>
    <div class="stat-grid" style="grid-template-columns:1fr 1fr; gap:6px;"><div class="stat-box" style="padding:10px;"><div class="lbl">${t('match_home')}</div><div class="num mono" style="font-size:16px; margin-top:4px; color:var(--chalk);">${s.casaWins}V &nbsp;${s.casaDraws}E &nbsp;${s.casaLosses}D</div></div><div class="stat-box" style="padding:10px;"><div class="lbl">${t('match_away')}</div><div class="num mono" style="font-size:16px; margin-top:4px; color:var(--chalk);">${s.foraWins}V &nbsp;${s.foraDraws}E &nbsp;${s.foraLosses}D</div></div></div>
    <div class="section-title">${t('st_ga')}</div>
    <div class="card"><div style="display:flex; justify-content:space-between;"><span style="color:var(--gold); font-weight:bold;">⚽ ${s.scored} ${t('match_scored')}</span><span style="color:var(--red); font-weight:bold;">🥅 ${s.conceded} ${t('match_conc')}</span></div></div>
    <div style="display:flex; gap:10px;">
       <div class="card" style="flex:1;"><div style="margin-bottom:10px; color:var(--muted); font-size:11px; text-transform:uppercase; font-weight:700;">${t('st_top_s')}</div>${s.scorers.slice(0,5).map((sc,i)=>`<div class="scorer-row" style="padding:6px 0;"><span><span style="color:var(--muted); font-size:10px;">${i+1}</span> ${sc.name}</span><span class="n mono">${sc.count} ⚽</span></div>`).join('') || `<div class="empty">${t('st_no_goals')}</div>`}</div>
       <div class="card" style="flex:1;"><div style="margin-bottom:10px; color:var(--muted); font-size:11px; text-transform:uppercase; font-weight:700;">${t('st_top_a')}</div>${s.assisters.slice(0,5).map((a,i)=>`<div class="scorer-row" style="padding:6px 0;"><span><span style="color:var(--muted); font-size:10px;">${i+1}</span> ${a.name}</span><span class="n mono">${a.count} 🎯</span></div>`).join('') || `<div class="empty">${t('st_no_assists')}</div>`}</div>
    </div>
    <div class="section-title" style="margin-top:16px;">${t('st_half')}</div>
    <div class="card">
      <div style="display:flex; justify-content:space-between; margin-bottom:8px; padding-bottom:8px; border-bottom:1px solid var(--line);"><div><b style="color:var(--chalk); font-size:13px;">${t('match_half1')}</b><br><span style="font-size:11px; color:var(--muted);">${s.scoredHalf[1]||0} ${t('match_scored')} | ${s.concededHalf[1]||0} ${t('match_conc')}</span></div><div style="text-align:right;"><span style="font-size:10px; color:var(--muted); text-transform:uppercase;">${t('st_bal')}</span><br><b style="font-size:16px; color:${color1}; font-family:ui-monospace, monospace;">${bal1>0?'+':''}${bal1}</b></div></div>
      <div style="display:flex; justify-content:space-between;"><div><b style="color:var(--chalk); font-size:13px;">${t('match_half2')}</b><br><span style="font-size:11px; color:var(--muted);">${s.scoredHalf[2]||0} ${t('match_scored')} | ${s.concededHalf[2]||0} ${t('match_conc')}</span></div><div style="text-align:right;"><span style="font-size:10px; color:var(--muted); text-transform:uppercase;">${t('st_bal')}</span><br><b style="font-size:16px; color:${color2}; font-family:ui-monospace, monospace;">${bal2>0?'+':''}${bal2}</b></div></div>
    </div>
    ${formHtml}
    ${goalsChartHtml}
    ${(s.matches && s.matches.length > 0) ? `<div class="card" style="margin-top:16px; border-color:var(--gold-dim);">
      <div class="section-title" style="margin-top:0;">📝 Balanço da Equipa Técnica</div>
      <textarea placeholder="Ex: Fase muito positiva, com evolução na construção. A melhorar: transição defensiva em bolas paradas." style="width:100%; min-height:70px; background:var(--surface-2); border:1px solid var(--line); border-radius:8px; padding:8px; color:var(--chalk); font-size:12px; font-family:inherit;" oninput="uiSavePhaseConclusion(this.value)">${escapeHTML(getPhaseConclusion())}</textarea>
      <button class="btn btn-gold" style="width:100%; margin-top:12px;" onclick="exportGlobalStatsPDF()">📄 Exportar Relatório Consolidado (PDF)</button>
    </div>` : ''}
  `;
}
// ==========================================
// MÓDULO DA CAIXINHA DAS MULTAS
// ==========================================

window.uiSaveFine = function() {
    if(!fineForm.playerId) return showToast('Seleciona o jogador.'); 
    if(!fineForm.reason.trim()) return showToast('Escreve o motivo.'); 
    if(isNaN(fineForm.value) || fineForm.value <= 0) return showToast('Valor inválido.');
    if(!state.fines) state.fines = []; 
    state.fines.unshift({ id: uid(), playerId: fineForm.playerId, reason: escapeHTML(fineForm.reason), value: parseFloat(fineForm.value), paid: false, date: fineForm.date || new Date().toISOString().slice(0,10) });
    fineForm = null; saveState(); render(); showToast('Multa registada.');
};

window.finesUnlocked = false; // A caixinha começa sempre trancada

window.toggleFineStatus = function(fId) { 
    const f = state.fines.find(x => x.id === fId); 
    if(f) { 
        if (f.paid && !window.finesUnlocked) {
            if (typeof showToast === 'function') showToast('🔒 Multa protegida! Clica no Aloquete para corrigir erros.');
            return;
        }
        f.paid = !f.paid; 
        saveState(); 
        render(); 
    } 
};

window.toggleFinesLock = function() {
    window.finesUnlocked = !window.finesUnlocked;
    render();
    if (typeof showToast === 'function') showToast(window.finesUnlocked ? '🔓 Caixinha destrancada para edição!' : '🔒 Caixinha protegida!');
};

window.deleteFine = function(fId) { 
    state.fines = state.fines.filter(x => x.id !== fId); 
    saveState(); render(); 
};

window.exportExtratoCaixinha = function() {
    if(!state.fines) return;
    let html = `<div class="print-card"><div class="print-header"><h1>Extrato Caixinha do Balneário</h1><p>${t('rep_gen')} ${new Date().toLocaleDateString('pt-PT')} | ${getClubAndEscalao()}</p></div><h2>Saldo Global: ${state.fines.filter(f => f.paid).reduce((sum, f) => sum + f.value, 0).toFixed(2)}€</h2><table><tr><th>Data</th><th>Jogador</th><th>Motivo</th><th>Valor</th><th>Estado</th></tr>${state.fines.map(f => `<tr><td>${f.date.split('-').reverse().join('/')}</td><td>${playerName(f.playerId)}</td><td>${f.reason}</td><td>${f.value.toFixed(2)}€</td><td style="color:${f.paid?'green':'red'}; font-weight:bold;">${f.paid?'Pago':'Pendente'}</td></tr>`).join('')}</table></div>`;
    const printArea = document.getElementById('print-area'); printArea.innerHTML = html; window.openSafePrintModal();
};
function renderCaixinha() {
    if(fineForm) {
        let playerOpts = '<option value="" disabled selected>Escolher Jogador...</option>'; eligiblePlayers().forEach(p => playerOpts += `<option value="${p.id}" ${fineForm.playerId===p.id?'selected':''}>${playerLabel(p)}</option>`);
        return `${topbarHtml(t('fine_new'))}${renderTeamSubHeader()}<div class="card"><div class="field"><label>Data</label><input type="date" value="${fineForm.date}" oninput="fineForm.date=this.value"></div><div class="field"><label>Jogador</label><select onchange="fineForm.playerId=this.value">${playerOpts}</select></div><div class="field"><label>${t('fine_reason')}</label><input type="text" placeholder="Ex: Cartão Amarelo" value="${fineForm.reason||''}" oninput="fineForm.reason=this.value"></div><div class="field" style="margin-bottom:0;"><label>${t('fine_val')}</label><input type="number" step="0.5" min="0.5" placeholder="5.00" value="${fineForm.value||''}" oninput="fineForm.value=this.value"></div></div><button class="btn btn-gold" style="width:100%; margin-bottom:10px;" onclick="uiSaveFine()">${t('fine_save')}</button><button class="btn btn-outline" style="width:100%;" onclick="fineForm=null; render()">${t('cancel')}</button>`;
    }
    
    if(!state.fines) state.fines = []; 
    if(window.finesUnlocked === undefined) window.finesUnlocked = false; // Garante que a fechadura arranca trancada
    
    let total = state.fines.filter(f => f.paid).reduce((sum, f) => sum + f.value, 0);
    
    let html = `${topbarHtml(t('fine_title'))}${renderTeamSubHeader()}
    <div class="card" style="text-align:center; padding:20px; border-color:var(--gold);">
        <div style="font-size:11px; color:var(--muted); text-transform:uppercase; font-weight:bold; letter-spacing:0.1em;">Saldo Global</div>
        <div style="font-size:36px; color:var(--gold); font-weight:bold; margin-top:4px; font-family:ui-monospace, monospace;">${total.toFixed(2)}€</div>
    </div>
    
    <div style="display:flex; gap:8px; margin-bottom:16px;">
        <button class="btn btn-gold" style="flex:1;" onclick="fineForm={date: new Date().toISOString().slice(0,10), playerId:'', reason:'', value:''}; render()">${t('fine_new')}</button>
        <!-- BOTÃO MESTRE: A lógica agora está colada direto no clique -->
        <button class="btn btn-outline" style="flex:none; padding:10px 20px; font-size:18px;" onclick="window.finesUnlocked = !window.finesUnlocked; render(); showToast(window.finesUnlocked ? '🔓 Caixinha Destrancada!' : '🔒 Caixinha Trancada!');">${window.finesUnlocked ? '🔓' : '🔒'}</button>
    </div>`;
    
    if(state.fines.length === 0) { 
        html += `<div class="empty">${t('fine_empty')}</div>`; 
    } else {
        html += `<div class="fines-list">`;
        state.fines.forEach(f => { 
            let statusCls = f.paid ? 'paid' : 'pending'; 
            let lockIcon = (f.paid && !window.finesUnlocked) ? `<span style="margin-left:6px; font-size:14px;" title="Protegido">🔒</span>` : '';
            
            // O botão de estado (Bolinha verde/vermelha) também já leva a inteligência dentro de si
            html += `<div class="fine-item">
                <div class="fine-status ${statusCls}" onclick="if(${f.paid} && !window.finesUnlocked){ showToast('🔒 Protegido! Clica no cadeado grande no topo para abrir.'); } else { const obj = state.fines.find(x => x.id === '${f.id}'); if(obj){ obj.paid = !obj.paid; saveState(); render(); } }"></div>
                <div class="fine-info">
                    <div class="fine-name">${playerName(f.playerId)}</div>
                    <div class="fine-reason">${f.date.split('-').reverse().join('/')} · ${f.reason}</div>
                </div>
                <div class="fine-val" style="display:flex; align-items:center; justify-content:flex-end;">
                    ${f.value.toFixed(2)}€ ${lockIcon}
                </div>
                <button class="quick-del" style="margin-left:12px; font-size:12px;" onclick="askConfirm('Apagar multa?', ()=>deleteFine('${f.id}'))">🗑</button>
            </div>`; 
        });
        html += `</div><button class="btn btn-outline" style="width:100%; margin-top:14px; border-style:dashed;" onclick="exportExtratoCaixinha()">📄 Exportar Extrato (PDF)</button>`;
    }
    return html;
}
window.exportExtratoCaixinha = function() {
    if(!state.fines) return;
    let html = `<div class="print-card"><div class="print-header"><h1>Extrato Caixinha do Balneário</h1><p>${t('rep_gen')} ${new Date().toLocaleDateString('pt-PT')} | ${getClubAndEscalao()}</p></div><h2>Saldo Global: ${state.fines.filter(f => f.paid).reduce((sum, f) => sum + f.value, 0).toFixed(2)}€</h2><table><tr><th>Data</th><th>Jogador</th><th>Motivo</th><th>Valor</th><th>Estado</th></tr>${state.fines.map(f => `<tr><td>${f.date.split('-').reverse().join('/')}</td><td>${playerName(f.playerId)}</td><td>${f.reason}</td><td>${f.value.toFixed(2)}€</td><td style="color:${f.paid?'green':'red'}; font-weight:bold;">${f.paid?'Pago':'Pendente'}</td></tr>`).join('')}</table></div>`;
    const printArea = document.getElementById('print-area'); printArea.innerHTML = html; window.openSafePrintModal();
}
window.uiSaveLeague = function() { if(!leagueForm.name || !leagueForm.name.trim()) return; state.leagues.push({ id: uid(), name: escapeHTML(leagueForm.name.trim()), teams: [], matches: [] }); leagueForm = null; saveState(); render(); };
window.deleteLeague = function(id) { state.leagues = state.leagues.filter(l => l.id !== id); saveState(); render(); };
window.uiAddLeagueTeam = function(lgId) { const input = document.getElementById('lg-team-input'); if(!input || !input.value.trim()) return; const lg = state.leagues.find(l => l.id === lgId); if(lg && !lg.teams.includes(input.value.trim())) { lg.teams.push(escapeHTML(input.value.trim())); saveState(); render(); } };
window.uiRemoveLeagueTeam = function(lgId, index) { const lg = state.leagues.find(l => l.id === lgId); if(lg) { const tName = lg.teams[index]; lg.teams.splice(index, 1); lg.matches = lg.matches.filter(m => m.h !== tName && m.a !== tName); saveState(); render(); } };
window.uiEditLeagueMatch = function(lgId, mId) { const lg = state.leagues.find(l => l.id === lgId); const m = lg.matches.find(x => x.id === mId); if(m) { editingLgMatch = { lgId, mId, md: m.md, h: m.h, a: m.a, hg: m.hg, ag: m.ag }; render(); } };
window.uiCancelEditLeagueMatch = function() { editingLgMatch = null; render(); };
window.uiAddLeagueMatch = function(lgId) {
    const lg = state.leagues.find(l => l.id === lgId); if(!lg) return;
    const h = document.getElementById('lg-match-h').value; const a = document.getElementById('lg-match-a').value; const hg = document.getElementById('lg-match-hg').value; const ag = document.getElementById('lg-match-ag').value; let md = document.getElementById('lg-match-md').value;
    if(h && a && h !== a && hg !== '' && ag !== '') { if (editingLgMatch && editingLgMatch.lgId === lgId) { const m = lg.matches.find(x => x.id === editingLgMatch.mId); if (m) { m.md = escapeHTML(md); m.h = h; m.a = a; m.hg = parseInt(hg); m.ag = parseInt(ag); } editingLgMatch = null; } else { if(!md) md = '1'; lg.matches.push({ id: uid(), md: escapeHTML(md), h: h, a: a, hg: parseInt(hg), ag: parseInt(ag) }); } saveState(); render(); } else { showToast("Dados inválidos."); }
};
window.uiRemoveLeagueMatch = function(lgId, mId) { const lg = state.leagues.find(l => l.id === lgId); if(lg) { lg.matches = lg.matches.filter(m => m.id !== mId); saveState(); render(); } };
window.filterLeagueTeams = function(lgId) {
    const mdInput = document.getElementById('lg-match-md'); if(!mdInput) return; const md = mdInput.value; const lg = state.leagues.find(l=>l.id===lgId); if(!lg) return;
    const played = lg.matches.filter(m => m.md === md && (!editingLgMatch || m.id !== editingLgMatch.mId)).flatMap(m => [m.h, m.a]);
    const selH = document.getElementById('lg-match-h'); const selA = document.getElementById('lg-match-a'); if(!selH || !selA) return;
    const valH = selH.value; const valA = selA.value; let optsH = '<option value="" disabled ' + (!valH ? 'selected' : '') + '>Casa...</option>'; let optsA = '<option value="" disabled ' + (!valA ? 'selected' : '') + '>Fora...</option>';
    lg.teams.forEach(tName => { if(!played.includes(tName) || tName === valH) { optsH += '<option value="'+tName+'" '+(tName===valH?'selected':'')+'>'+tName+'</option>'; } if(!played.includes(tName) || tName === valA) { optsA += '<option value="'+tName+'" '+(tName===valA?'selected':'')+'>'+tName+'</option>'; } });
    selH.innerHTML = optsH; selA.innerHTML = optsA;
};

function renderClassificacoes() {
    if(leagueForm) { return `${topbarHtml(t('lg_new'))}${renderTeamSubHeader()}<div class="card"><div class="field" style="margin-bottom:0;"><label>${t('lg_name')}</label><input type="text" placeholder="Ex: Liga Concelhia" value="${leagueForm.name||''}" oninput="leagueForm.name=this.value"></div></div><button class="btn btn-gold" style="width:100%; margin-bottom:10px;" onclick="uiSaveLeague()">${t('save')}</button><button class="btn btn-outline" style="width:100%;" onclick="leagueForm=null; render()">${t('cancel')}</button>`; }
    let html = `${topbarHtml(t('hub_team_title'))}${renderTeamSubHeader()}<button class="btn btn-gold" style="width:100%; margin-bottom:14px;" onclick="leagueForm={name:''}; render()">${t('lg_new')}</button>`;
    if(!state.leagues || state.leagues.length === 0) { html += `<div class="empty">Sem competições registadas.</div>`; } else {
        state.leagues.forEach(lg => {
            const open = expandedLeague === lg.id;
            html += `<div class="card match-item" onclick="if(!event.target.closest('button') && !event.target.closest('input') && !event.target.closest('select')){ expandedLeague=expandedLeague==='${lg.id}'?null:'${lg.id}'; editingLgMatch=null; render(); }"><div class="match-head-row"><div class="match-head" style="flex:1;"><div class="opp">🏆 ${lg.name}</div></div><button class="quick-del" onclick="event.stopPropagation(); askConfirm('Apagar competição?', ()=>deleteLeague('${lg.id}'))">🗑</button></div>`;
            if(open) {
                let table = {}; lg.teams.forEach(t => table[t] = { name: t, p:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0 });
                lg.matches.forEach(m => { if(!table[m.h] || !table[m.a]) return; table[m.h].p++; table[m.a].p++; table[m.h].gf += m.hg; table[m.h].ga += m.ag; table[m.h].gd += (m.hg - m.ag); table[m.a].gf += m.ag; table[m.a].ga += m.hg; table[m.a].gd += (m.ag - m.hg); if(m.hg > m.ag) { table[m.h].w++; table[m.h].pts += 3; table[m.a].l++; } else if(m.hg === m.ag) { table[m.h].d++; table[m.a].d++; table[m.h].pts += 1; table[m.a].pts += 1; } else { table[m.a].w++; table[m.a].pts += 3; table[m.h].l++; } });
                let sortedTable = Object.values(table).sort((a,b) => { if(b.pts !== a.pts) return b.pts - a.pts; if(b.gd !== a.gd) return b.gd - a.gd; return b.gf - a.gf; });
                html += `<div style="border-top:1px solid var(--line); padding-top:12px; margin-top:12px; cursor:default;" onclick="event.stopPropagation();">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <div class="panel-title" style="margin:0;">${t('lg_table')}</div>
                    <button class="btn btn-outline" style="font-size:10px; padding:4px 8px;" onclick="exportLeaguePDF('${lg.id}')">📄 Exportar PDF</button>
                  </div>`;
                if(sortedTable.length > 0) {
                    html += `<table class="league-table"><tr><th style="width:20px;">#</th><th class="team-name">Equipa</th><th>P</th><th>V</th><th>E</th><th>D</th><th>GM</th><th>GS</th><th>DG</th><th>Pts</th></tr>`;
                    sortedTable.forEach((row, idx) => { let isMyClub = row.name === getMyClub() || row.name === state.myClubName; html += `<tr style="${isMyClub?'background:var(--surface-2);':''}"><td style="color:var(--muted);">${idx+1}</td><td class="team-name" style="${isMyClub?'color:var(--gold);':''}">${row.name}</td><td>${row.p}</td><td>${row.w}</td><td>${row.d}</td><td>${row.l}</td><td>${row.gf}</td><td>${row.ga}</td><td>${row.gd>0?'+':''}${row.gd}</td><td><b style="color:var(--chalk);">${row.pts}</b></td></tr>`; });
                    html += `</table>`;
                } else { html += `<div class="empty" style="padding:10px;">Adiciona equipas abaixo.</div>`; }
                html += `<div class="panel-title" style="margin-top:20px;">${t('lg_teams')}</div><div class="seg" style="margin-bottom:10px;">${lg.teams.map((tName, idx) => `<div class="seg-btn" style="display:flex; justify-content:space-between; align-items:center;">${tName} <span style="color:var(--red); font-size:14px; margin-left:8px;" onclick="event.stopPropagation(); askConfirm('${t('msg_del_lg_team')}', ()=>uiRemoveLeagueTeam('${lg.id}',${idx}))">✕</span></div>`).join('')}</div><div class="add-row" style="margin-top:0;"><input id="lg-team-input" type="text" placeholder="Nome da Equipa"><button onclick="uiAddLeagueTeam('${lg.id}')">+</button></div>`;
                if(lg.teams.length >= 2) {
                    html += `<div class="panel-title" style="margin-top:20px;">${t('lg_matches')}</div>`;
                    lg.matches.slice().reverse().forEach(m => { html += `<div style="display:flex; justify-content:space-between; align-items:center; background:var(--surface-2); padding:8px 12px; border-radius:6px; margin-bottom:6px; font-size:12px;"><div style="flex:1;">${m.md ? `<b style="color:var(--gold); margin-right:6px;">J${m.md}</b>` : ''}${m.h} <b style="margin:0 4px;">${m.hg} - ${m.ag}</b> ${m.a}</div><div style="display:flex; gap:8px;"><button class="quick-del" style="font-size:12px; color:var(--muted);" onclick="uiEditLeagueMatch('${lg.id}', '${m.id}')">✏️</button><button class="quick-del" style="font-size:12px; color:var(--red);" onclick="askConfirm('${t('msg_del_lg_match')}', ()=>uiRemoveLeagueMatch('${lg.id}', '${m.id}'))">✕</button></div></div>`; });
                    let isEditingMatch = editingLgMatch && editingLgMatch.lgId === lg.id; let mdVal = isEditingMatch ? editingLgMatch.md : ''; if(!isEditingMatch && !mdVal && lg.matches.length > 0) mdVal = lg.matches[lg.matches.length - 1].md;
                    let playedTeamsInMd = lg.matches.filter(m => m.md === mdVal && (!isEditingMatch || m.id !== editingLgMatch.mId)).flatMap(m => [m.h, m.a]); let hVal = isEditingMatch ? editingLgMatch.h : ''; let aVal = isEditingMatch ? editingLgMatch.a : ''; let hgVal = isEditingMatch ? editingLgMatch.hg : ''; let agVal = isEditingMatch ? editingLgMatch.ag : '';
                    let teamOptsH = `<option value="" disabled ${!hVal?'selected':''}>Casa...</option>`; let teamOptsA = `<option value="" disabled ${!aVal?'selected':''}>Fora...</option>`;
                    lg.teams.forEach(tName => { if(!playedTeamsInMd.includes(tName) || tName === hVal) { teamOptsH += `<option value="${tName}" ${tName===hVal?'selected':''}>${tName}</option>`; } if(!playedTeamsInMd.includes(tName) || tName === aVal) { teamOptsA += `<option value="${tName}" ${tName===aVal?'selected':''}>${tName}</option>`; } });
                    html += `<div style="background:var(--surface-2); padding:10px; border-radius:8px; border:1px solid ${isEditingMatch?'var(--gold)':'var(--line)'}; margin-top:10px;">${isEditingMatch ? `<div style="color:var(--gold); font-size:10px; font-weight:bold; text-transform:uppercase; margin-bottom:8px;">A editar resultado...</div>` : ''}<div style="display:flex; gap:6px; margin-bottom:6px;"><input type="text" id="lg-match-md" placeholder="Jornada" value="${mdVal}" oninput="filterLeagueTeams('${lg.id}')" style="width:70px; background:var(--surface); border:1px solid var(--line); color:var(--chalk); border-radius:6px; padding:6px; font-size:12px; text-align:center;"><select id="lg-match-h" style="flex:1; background:var(--surface); border:1px solid var(--line); color:var(--chalk); border-radius:6px; padding:6px; font-size:12px;">${teamOptsH}</select><input type="number" id="lg-match-hg" placeholder="G" value="${hgVal}" style="width:40px; background:var(--surface); border:1px solid var(--line); color:var(--chalk); border-radius:6px; padding:6px; font-size:12px; text-align:center;"></div><div style="display:flex; gap:6px; margin-bottom:8px;"><div style="width:70px; text-align:center; font-size:10px; color:var(--muted); line-height:2.5;">VS</div><select id="lg-match-a" style="flex:1; background:var(--surface); border:1px solid var(--line); color:var(--chalk); border-radius:6px; padding:6px; font-size:12px;">${teamOptsA}</select><input type="number" id="lg-match-ag" placeholder="G" value="${agVal}" style="width:40px; background:var(--surface); border:1px solid var(--line); color:var(--chalk); border-radius:6px; padding:6px; font-size:12px; text-align:center;"></div><div style="display:flex; gap:6px;">${isEditingMatch ? `<button class="btn btn-outline" style="flex:1; font-size:11px; padding:8px;" onclick="uiCancelEditLeagueMatch()">${t('cancel')}</button>` : ''}<button class="btn btn-outline" style="flex:1; font-size:11px; padding:8px; ${isEditingMatch?'border-color:var(--gold); color:var(--gold);':''}" onclick="uiAddLeagueMatch('${lg.id}')">${isEditingMatch ? t('save') : t('lg_add_match')}</button></div></div>`;
                }
                html += `</div>`;
            }
            html += `</div>`;
        });
    }
    return html;
}

window.clearPlayerPos = function(id) {
    const p = state.roster.find(x=>x.id===id);
    if(p) { p.positions = ''; saveState(); render(); }
};

window.togglePlayerPos = function(id, pos) {
    const p = state.roster.find(x=>x.id===id); if(!p) return;
    let safePos = typeof p.positions === 'string' ? p.positions : '';
    let cur = safePos.split(',').map(x=>x.trim()).filter(Boolean);
    if(cur.includes(pos)) cur = cur.filter(x=>x!==pos);
    else { if(cur.length >= 5) { showToast('Máximo de 5 posições!'); return; } cur.push(pos); }
    p.positions = cur.join(', '); saveState(); render();
};
window.exportCsv = function() {
  let activeSeason = window.statsSeasonFilter === 'todas' ? 'TUDO' : (window.statsSeasonFilter || state.currentSeason);
  const roster = eligiblePlayers(); 
  let csv = "Nome_Name,Numero_Number,Posicao_Position,Idade_Age,Golos_Goals,Assistencias_Assists,GolosSofridos_Conceded,Amarelos_Yellows,Vermelhos_Reds,FaltasTreino_TrainingAbsences,JogosTitular_Starts,MinutosJogados_MinutesPlayed,AvaliacaoMedia_AvgRating\n";
  roster.forEach(p => {
     // O Segredo: O Excel também sai com os filtros que o Mister tiver selecionados
     const st = calcularEstatisticaJogador(p.id, activeSeason, statsFilter, statsPhaseFilter, statsTournamentFilter); 
     const isGK = p.positions && typeof p.positions === 'string' && p.positions.toUpperCase().includes('GR');
     const gs = isGK ? st.golosSofridos : '-';
     const idade = p.birthDate ? (computeAge(p.birthDate)||'') : ''; 
     // 🧹 Garante que o Excel não leva lixo de HTML na exportação
     const nome = `"${cleanHTML(p.name||'').replace(/"/g, '""')}"`; 
     const pos = `"${cleanHTML(p.positions||'').replace(/"/g, '""')}"`;
     csv += `${nome},${p.number||''},${pos},${idade},${st.golos},${st.assistencias},${gs},${st.amarelos},${st.vermelhos},${st.faltasTreino},${st.jogosTitular},${st.minutos},${st.media}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `coachfolio-estatisticas-${activeSeason === 'TUDO' ? 'totais' : activeSeason.replace('/','-')}-${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); showToast(t('msg_csv_exp'));
};
window.switchStaffTab = function(tab) {
  staffSubTab = tab;
  render();
};

window.saveStaffMember = function() {
  if (!staffForm || !staffForm.name) { showToast('Preencha o nome do elemento.'); return; }
  if (!state.staff) state.staff = [];
  const cleanStaff = { ...staffForm, name: escapeHTML((staffForm.name||'').trim()), role: escapeHTML((staffForm.role||'').trim()) };
  if (cleanStaff.id) {
    const idx = state.staff.findIndex(s => s.id === cleanStaff.id);
    if (idx !== -1) state.staff[idx] = cleanStaff;
  } else {
    cleanStaff.id = 'st_' + Date.now();
    state.staff.push(cleanStaff);
  }
  saveState();
  staffForm = null;
  render();
  showToast('Elemento guardado!');
};

window.deleteStaffMember = function(id) {
  state.staff = (state.staff || []).filter(s => s.id !== id);
  saveState();
  render();
  showToast('Elemento removido.');
};
window.exportPlayerPDF = function(pId) {
  const p = (state.roster || []).filter(x => x.active !== false).find(x => x.id === pId);
  if (!p) { showToast('Atleta não encontrado.'); return; }

  const activeSeason = window.statsSeasonFilter === 'todas' ? 'TUDO' : (window.statsSeasonFilter || state.currentSeason);
  const st = calcularEstatisticaJogador(p.id, activeSeason);

  let totalMatchSecs = 0, totalTeamGoals = 0, totalTeamAssists = 0, totalTeamConceded = 0, totalFinishedMatches = 0;
  (state.matches || []).filter(m => m && m.finished && !m.ignoreMinutes && (activeSeason === 'TUDO' || getEntitySeason(m) === activeSeason)).forEach(m => {
    totalFinishedMatches++;
    (m.goals || []).forEach(g => {
      if (g.type === 'scored') {
        totalTeamGoals++;
        if (g.assistId && g.assistId !== 'none' && g.assistId !== 'unknown') totalTeamAssists++;
      } else if (g.type === 'conceded') {
        totalTeamConceded++;
      }
    });
    if (m.timer && (m.timer.half1DurationMs != null || m.timer.half2DurationMs != null || m.timer.elapsedMs != null)) {
      let ms1 = m.timer.half1DurationMs || 0, ms2 = m.timer.half2DurationMs || 0;
      let msTotal = (ms1 + ms2) > 0 ? (ms1 + ms2) : (m.timer.elapsedMs || 0);
      totalMatchSecs += Math.round(msTotal / 1000);
    } else {
      totalMatchSecs += ((m.manualMatchDuration || 90) * 60);
    }
  });

  const maxStats = {
    minutos: totalMatchSecs || 1,
    golos: totalTeamGoals || 1,
    assist: totalTeamAssists || 1,
    jogos: totalFinishedMatches || 1,
    golosSofridos: totalTeamConceded || 1
  };

  const safePos = typeof p.positions === 'string' ? p.positions : '';
  const firstPos = safePos ? safePos.split(',')[0].trim() : 'N/D';
  const otherPos = safePos ? safePos.split(',').slice(1).map(x => x.trim()).join(', ') || '—' : '—';
  const isGK = safePos.toUpperCase().includes('GR') || safePos.toUpperCase().includes('GK');
  const age = p.birthDate ? computeAge(p.birthDate) : null;

  const playerBarsHtml = generatePlayerBarsHTML(st, maxStats, isGK, true);
  const donutChartHtml = generateDonutChartSVG(st.minutosTreinoCumpridos, st.minutosTreinoTotais);

  let html = `
  <div class="print-card" style="padding:20px; font-family:-apple-system, sans-serif;">
    <div class="print-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:15px;">
      <div style="flex:1;">
        <h1 style="font-size:22px; margin:0; text-transform:uppercase; color:#000;">FICHA DE RENDIMENTO INDIVIDUAL</h1>
        <div style="font-size:18px; font-weight:bold; margin-top:4px; color:#333;">${p.number ? `${p.number} ` : ''}${p.name}</div>
        <p style="font-size:11px; color:#555; margin:3px 0 0 0;">Clube: <b>${getClubAndEscalao()}</b> | Época: <b>${activeSeason === 'TUDO' ? 'Histórico Total' : activeSeason}</b></p>
      </div>
      ${getClubLogoHtml()}
    </div>

    <!-- DADOS DO PERFIL -->
    <div style="background:#F3F4F6; border:1px solid #E5E7EB; border-radius:8px; padding:10px 14px; margin-bottom:15px; display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:11px;">
      <div><b>Posição Principal:</b> ${firstPos}</div>
      <div><b>Outras Posições:</b> ${otherPos}</div>
      <div><b>Data de Nascimento:</b> ${p.birthDate || 'N/D'}</div>
      <div><b>Idade:</b> ${age !== null ? `${age} anos` : 'N/D'}</div>
    </div>

    <!-- ESTATÍSTICAS DE COMPETIÇÃO -->
    <h3 style="font-size:12px; font-weight:bold; margin:0 0 8px 0; border-bottom:1px solid #000; padding-bottom:3px; text-transform:uppercase;">📊 Estatísticas de Competição</h3>
    <div style="display:flex; gap:8px; margin-bottom:15px; text-align:center;">
      <div style="flex:1; border:1px solid #CCC; background:#FFF; border-radius:6px; padding:8px 4px;">
        <div style="font-size:9px; color:#666; font-weight:bold; text-transform:uppercase;">Convocatórias</div>
        <div style="font-size:16px; font-weight:bold; color:#000; margin-top:2px;">${st.jogosConvocado}</div>
      </div>
      <div style="flex:1; border:1px solid #CCC; background:#FFF; border-radius:6px; padding:8px 4px;">
        <div style="font-size:9px; color:#666; font-weight:bold; text-transform:uppercase;">Tempo Total</div>
        <div style="font-size:16px; font-weight:bold; color:#000; margin-top:2px; font-family:monospace;">${st.minutos}</div>
      </div>
      <div style="flex:1; border:1px solid #CCC; background:#FFF; border-radius:6px; padding:8px 4px;">
        <div style="font-size:9px; color:#666; font-weight:bold; text-transform:uppercase;">Golos (GM)</div>
        <div style="font-size:16px; font-weight:bold; color:#000; margin-top:2px;">${st.golos}</div>
      </div>
      <div style="flex:1; border:1px solid #CCC; background:#FFF; border-radius:6px; padding:8px 4px;">
        <div style="font-size:9px; color:#666; font-weight:bold; text-transform:uppercase;">Assist.</div>
        <div style="font-size:16px; font-weight:bold; color:#000; margin-top:2px;">${st.assistencias}</div>
      </div>
      <div style="flex:1; border:1px solid #CCC; background:#FFF; border-radius:6px; padding:8px 4px;">
        <div style="font-size:9px; color:#666; font-weight:bold; text-transform:uppercase;">Sofridos (GS)</div>
        <div style="font-size:16px; font-weight:bold; color:#000; margin-top:2px;">${isGK ? st.golosSofridos : '-'}</div>
      </div>
    </div>

    <!-- ANÁLISE GRÁFICA VISUAL -->
    <h3 style="font-size:12px; font-weight:bold; margin:0 0 8px 0; border-bottom:1px solid #000; padding-bottom:3px; text-transform:uppercase;">📈 Análise Gráfica Visual</h3>
    <div style="border:1px solid #CCC; background:#FFF; border-radius:6px; padding:12px; margin-bottom:15px; display:flex; align-items:center; justify-content:space-between; gap:15px;">
      <div style="flex:1;">
        ${playerBarsHtml}
      </div>
      <div style="width:110px; text-align:center; border-left:1px solid #EEE; padding-left:10px;">
        ${donutChartHtml}
        <div style="font-size:8px; font-weight:bold; color:#444; margin-top:4px; text-transform:uppercase;">Assiduidade Treino</div>
      </div>
    </div>

    <!-- TREINO & ASSIDUIDADE -->
    <h3 style="font-size:12px; font-weight:bold; margin:0 0 8px 0; border-bottom:1px solid #000; padding-bottom:3px; text-transform:uppercase;">🏋️ Treino & Assiduidade</h3>
    <div style="background:#F3F4F6; border:1px solid #E5E7EB; border-radius:6px; padding:10px 14px; margin-bottom:15px; display:flex; justify-content:space-between; font-size:11px;">
      <div>Sessões Realizadas: <b>${st.totalTreinos}</b></div>
      <div>Presenças: <b>${st.presencasTreino}</b> | Faltas: <b>${st.faltasTreino}</b></div>
      <div>Minutos de Treino: <b>${st.minutosTreinoCumpridos}'</b></div>
    </div>

    <!-- OBSERVAÇÕES DO TREINADOR -->
    <h3 style="font-size:12px; font-weight:bold; margin:0 0 8px 0; border-bottom:1px solid #000; padding-bottom:3px; text-transform:uppercase;">📝 Observações do Treinador</h3>
    <div style="border:1px solid #CCC; background:#FFF; border-radius:6px; padding:10px; min-height:60px; font-size:11px; line-height:1.4; color:#333; margin-bottom:20px; white-space:pre-wrap;">
      ${p.notes || 'Sem observações adicionais registadas na ficha do atleta.'}
    </div>

    <!-- RODAPÉ DE ASSINATURA -->
    <div style="margin-top:20px; display:flex; justify-content:space-between; align-items:flex-end;">
      <div style="font-size:10px; color:#666;">
        Relatório Individual Emitido por Coachfolio v3.5.1
      </div>
      <div style="text-align:center; width:200px; border-top:1px solid #000; padding-top:4px; font-size:11px; font-weight:bold;">
        O Treinador / Coordenação
      </div>
    </div>
  </div>`;

  document.getElementById('print-area').innerHTML = html;
  window.openSafePrintModal();
};
window.renderPlantel = function() {
  const activeRoster = eligiblePlayers();
  let totalMins = 0; 
  let totalPlayersWithMins = 0;
  if (state.showFairPlay) { 
    activeRoster.forEach(p => { 
      const st = calcularEstatisticaJogador(p.id); 
      if (st && st.totalSegundosJogo > 0) { 
        totalMins += st.totalSegundosJogo; 
        totalPlayersWithMins++; 
      } 
    }); 
  }

  let html = `${topbarHtml(t('hub_team_title'))}${renderTeamSubHeader()}`;

  html += `
    <div class="seg" style="margin-bottom:10px;">
      <div class="seg-btn ${staffSubTab==='jogadores'?'active':''}" onclick="switchStaffTab('jogadores')" style="font-size:10px; padding:8px 4px;">🏃 ${t('pl_tab_players')} (${activeRoster.length})</div>
      <div class="seg-btn ${staffSubTab==='comparar'?'active':''}" onclick="switchStaffTab('comparar')" style="font-size:10px; padding:8px 4px;">⚖️ ${t('pl_tab_compare')}</div>
      <div class="seg-btn ${staffSubTab==='staff'?'active':''}" onclick="switchStaffTab('staff')" style="font-size:10px; padding:8px 4px;">👔 ${t('pl_tab_staff')} (${(state.staff || []).length})</div>
    </div>
  `;

  if (staffSubTab === 'jogadores') {
    const currentSort = state.rosterSortBy || 'posicao';
    html += `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; background:var(--surface-2); padding:6px 10px; border-radius:8px; border:1px solid var(--line);">
        <span style="font-size:10px; color:var(--muted); font-weight:bold; text-transform:uppercase;">${t('pl_sort_by')}</span>
        <div class="seg" style="margin-top:0; flex:none; gap:4px;">
          <button class="seg-btn ${currentSort==='posicao'?'active':''}" style="font-size:9px; padding:4px 8px;" onclick="state.rosterSortBy='posicao'; saveState(); render();">${t('pl_sort_pos')}</button>
          <button class="seg-btn ${currentSort==='nome'?'active':''}" style="font-size:9px; padding:4px 8px;" onclick="state.rosterSortBy='nome'; saveState(); render();">${t('pl_sort_name')}</button>
          <button class="seg-btn ${currentSort==='numero'?'active':''}" style="font-size:9px; padding:4px 8px;" onclick="state.rosterSortBy='numero'; saveState(); render();">${t('pl_sort_num')}</button>
        </div>
      </div>
    `;

    if (activeRoster.length === 0) {
      html += `<div class="empty">${t('pl_none')}</div>
        <div class="add-row" style="margin-bottom:15px;"><input id="new-player-input" type="text" placeholder="${t('pl_add_ph')}"><button onclick="uiAddPlayer()">+</button></div>`;
    } else {
      let totalMatchSecs = 0;
      let totalTeamGoals = 0;
      let totalTeamAssists = 0;
      let totalTeamConceded = 0;
      let totalFinishedMatches = 0;

      (state.matches || []).filter(m => m && m.finished && !m.ignoreMinutes && (m.season || state.currentSeason) === state.currentSeason).forEach(m => {
          totalFinishedMatches++;
          
          (m.goals || []).forEach(g => {
              if (g.type === 'scored') {
                  totalTeamGoals++;
                  if (g.assistId && g.assistId !== 'none' && g.assistId !== 'unknown') {
                      totalTeamAssists++;
                  }
              } else if (g.type === 'conceded') {
                  totalTeamConceded++;
              }
          });

          if (m.timer && (m.timer.half1DurationMs != null || m.timer.half2DurationMs != null || m.timer.elapsedMs != null)) {
              let ms1 = m.timer.half1DurationMs || 0;
              let ms2 = m.timer.half2DurationMs || 0;
              let msTotal = (ms1 + ms2) > 0 ? (ms1 + ms2) : (m.timer.elapsedMs || 0);
              totalMatchSecs += Math.round(msTotal / 1000);
          } else {
              let durationMins = m.manualMatchDuration || 90;
              totalMatchSecs += (durationMins * 60);
          }
      });

      let maxStats = { 
          minutos: totalMatchSecs || 1, 
          golos: totalTeamGoals || 1, 
          assist: totalTeamAssists || 1, 
          jogos: totalFinishedMatches || 1,
          golosSofridos: totalTeamConceded || 1
      };

      html += `<div style="display:flex; flex-direction:column; gap:0px; margin-bottom:15px;">`;

      sortPlayerObjs(activeRoster).forEach(p => {
        const isExpanded = expandedPlayer === p.id;
        const isEditing = editingPlayerId === p.id;
        const st = calcularEstatisticaJogador(p.id);
        const age = p.birthDate ? computeAge(p.birthDate) : null;

        let fairPlayDot = '';
        if (state.showFairPlay && totalPlayersWithMins > 0) {
          const avgMinsSecs = totalMins / totalPlayersWithMins;
          const pSecs = st.totalSegundosJogo;
          if (pSecs >= avgMinsSecs * 0.8) {
            fairPlayDot = '<span title="Minutos Equilibrados" style="margin-left:4px;">🟢</span>';
          } else if (pSecs >= avgMinsSecs * 0.4) {
            fairPlayDot = '<span title="Abaixo da Média" style="margin-left:4px;">🟡</span>';
          } else {
            fairPlayDot = '<span title="Pouco Utilizado" style="margin-left:4px;">🔴</span>';
          }
        }

        let posBadges = '';
        const safePos = typeof p.positions === 'string' ? p.positions : '';
        if (safePos.trim() !== '') {
          posBadges = safePos.split(',').map(pos => `<span style="background:var(--gold-dim); color:var(--gold); border:1px solid var(--gold); border-radius:4px; padding:1px 5px; font-size:9px; font-weight:bold; margin-right:4px;">${pos.trim()}</span>`).join('');
        }

        const isGK = safePos.toUpperCase().includes('GR') || safePos.toUpperCase().includes('GK');

        html += `<div class="player-item">
          <div class="player-row" style="padding:12px 6px;" onclick="expandedPlayer = expandedPlayer === '${p.id}' ? null : '${p.id}'; editingPlayerId = null; render();">
            <div style="display:flex; align-items:center; gap:8px; text-align:left;">
              <span style="color:var(--gold); font-weight:bold; font-size:15px;" class="mono">${p.number !== null && p.number !== undefined && p.number !== '' ? p.number : ''}</span>
              <span style="font-weight:bold; color:var(--chalk); font-size:15px;">${p.name || t('pl_no_name')}</span>
              ${p.medicalNotes ? `<span style="font-size:12px; margin-left:4px;" title="Alerta Médico">🚑</span>` : ''}
              ${posBadges}
              ${age !== null ? `<span style="font-size:12px; color:var(--muted); font-weight:normal;">- ${age}${t('pl_yrs')}</span>` : ''}
              ${fairPlayDot}
            </div>
          </div>`;

        if (isExpanded) {
          if (isEditing) {
            html += `<div style="background:var(--surface); border:1px solid var(--gold); border-radius:12px; padding:14px; margin:8px 0 14px; text-align:left;">
              <div class="panel-title" style="color:var(--gold); margin-bottom:10px;">${t('pl_edit')}</div>
              <div class="grid-btns" style="margin-bottom:10px;">
                <div class="field" style="margin-bottom:0;"><label>${t('pl_num')}</label><input type="number" value="${p.number || ''}" onchange="updatePlayerNumber('${p.id}', this.value)"></div>
                <div class="field" style="margin-bottom:0;"><label>${t('pl_name')}</label><input type="text" value="${p.name || ''}" onchange="updatePlayerName('${p.id}', this.value)"></div>
              </div>
              <div class="field" style="margin-bottom:10px;"><label>${t('pl_dob')}</label><input type="text" placeholder="Ex: 15.05.2010" value="${p.birthDate || ''}" onchange="updatePlayerBirthDate('${p.id}', this.value)"></div>
              
              <div class="field" style="margin-bottom:10px;">
                <label>📝 Observações Individuais do Atleta</label>
                <textarea placeholder="Ex: Atleta com boa visão de jogo. A trabalhar o pé não dominante..." onchange="updatePlayerNotes('${p.id}', this.value)" style="min-height:60px; font-size:12px;">${p.notes || ''}</textarea>
              </div>

              <!-- SECÇÃO SAÚDE E EMERGÊNCIA (EDIÇÃO) -->
              <div class="panel-title" style="color:var(--gold); margin-top:16px; margin-bottom:10px;">🚑 Saúde & Emergência</div>
              <div class="grid-btns" style="margin-bottom:10px;">
                <div class="field" style="margin-bottom:0;"><label>Enc. de Educação / Emergência</label><input type="text" placeholder="Nome" value="${p.contactName || ''}" onchange="updatePlayerContactName('${p.id}', this.value)"></div>
                <div class="field" style="margin-bottom:0;"><label>Nº Telemóvel</label><input type="tel" placeholder="Ex: 912345678" value="${p.contactPhone || ''}" onchange="updatePlayerContactPhone('${p.id}', this.value)"></div>
              </div>
              <div class="field" style="margin-bottom:12px;">
                <label>🩹 Notas Médicas (Alergias, Lesões...)</label>
                <textarea placeholder="Ex: Asmático. Lesão no joelho direito em recuperação..." onchange="updatePlayerMedicalNotes('${p.id}', this.value)" style="min-height:60px; font-size:12px;">${p.medicalNotes || ''}</textarea>
              </div>

              <div class="field" style="margin-bottom:12px; margin-top:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                  <label style="margin:0;">${t('pl_pos')}</label>
                  ${safePos ? `<button class="quick-del" style="font-size:9px; border:1px solid var(--line); border-radius:4px; padding:2px 6px;" onclick="clearPlayerPos('${p.id}')">🧹 LIMPAR</button>` : ''}
                </div>
                <div style="font-size:11px; color:var(--gold); font-weight:bold; margin-bottom:8px;">${safePos || 'Nenhuma'}</div>
                <div class="seg" style="flex-wrap:wrap; gap:4px;">
                  ${['GR','DC','DD','DE','MDC','MC','MOC','EXT','PL'].map(pos => `<div class="seg-btn ${safePos.includes(pos)?'active':''}" style="flex:none; padding:5px 8px; font-size:10px;" onclick="togglePlayerPos('${p.id}', '${pos}')">${pos}</div>`).join('')}
                </div>
              </div>
              <div style="display:flex; gap:8px; margin-top:12px;">
                <button class="btn btn-gold" style="flex:1;" onclick="editingPlayerId=null; render();">${t('pl_done')}</button>
                <button class="btn btn-red" style="flex:none; padding:0 12px;" onclick="askConfirm('${t('msg_del_pl')}', ()=>{ removePlayer('${p.id}'); expandedPlayer=null; editingPlayerId=null; render(); })">🗑️</button>
              </div>
            </div>`;
          } else {
            const playerBars = generatePlayerBarsHTML(st, maxStats, isGK, false);
            const donutChart = generateDonutChartSVG(st.minutosTreinoCumpridos, st.minutosTreinoTotais);

            html += `<div style="background:var(--surface); border:1px solid var(--line); border-radius:12px; padding:14px; margin:6px 0 14px; text-align:left;">
              
              <div class="profile-stats-grid" style="grid-template-columns:repeat(5, 1fr); gap:4px; margin-bottom:10px;">
                <div class="profile-stat" style="padding:12px 2px;">
                  <div class="val" style="color:var(--gold); font-size:14px;">${st.minutos}</div>
                  <div class="lbl" style="font-size:7px;">MIN. JOGO</div>
                </div>
                <div class="profile-stat" style="padding:12px 2px;">
                  <div class="val" style="color:#3b82f6; font-size:14px;">${st.minutosTreinoCumpridos}'</div>
                  <div class="lbl" style="font-size:7px;">TREINO</div>
                </div>
                <div class="profile-stat" style="padding:12px 2px;">
                  <div class="val" style="font-size:14px;">${st.golos}</div>
                  <div class="lbl" style="font-size:7px;">⚽ GM</div>
                </div>
                <div class="profile-stat" style="padding:12px 2px;">
                  <div class="val" style="color:#3b82f6; font-size:14px;">${st.assistencias}</div>
                  <div class="lbl" style="font-size:7px;">🎯 ASS.</div>
                </div>
                <div class="profile-stat" style="padding:12px 2px;">
                  <div class="val" style="font-size:14px;">${isGK ? st.golosSofridos : '-'}</div>
                  <div class="lbl" style="font-size:7px;">🥅 GS</div>
                </div>
              </div>

              <div style="background:var(--surface-2); border-radius:8px; padding:10px 12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; font-size:11px;">
                <span style="color:var(--muted); font-weight:bold; text-transform:uppercase;">FORMA & FALTAS</span>
                <div style="display:flex; align-items:center; gap:10px; font-weight:bold;">
                  <span>⭐ ${st.media}</span>
                  <span>📉 ${st.faltasTreino} Faltas</span>
                  <span>🟨 ${st.amarelos}</span>
                  <span>🟥 ${st.vermelhos}</span>
                </div>
              </div>

              <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:14px;">
                <div style="flex:1;">
                  ${playerBars}
                </div>
                <div style="width:90px; text-align:center;">
                  ${donutChart}
                  <div style="font-size:8px; color:var(--muted); font-weight:bold; text-transform:uppercase; margin-top:4px;">ASSIDUIDADE TREINO</div>
                </div>
              </div>

              <!-- ACORDEÃO SAÚDE & EMERGÊNCIA -->
              <div style="margin-bottom:14px; background:var(--surface-2); border:1px solid var(--line); border-radius:8px; overflow:hidden;">
                  <div style="padding:10px 12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; background:${window.expandedHealth === p.id ? 'var(--surface)' : 'transparent'}; border-bottom:${window.expandedHealth === p.id ? '1px solid var(--line)' : 'none'};" onclick="event.stopPropagation(); window.expandedHealth = window.expandedHealth === '${p.id}' ? null : '${p.id}'; render();">
                      <span style="font-size:11px; color:${p.medicalNotes ? 'var(--red)' : 'var(--gold)'}; font-weight:bold; text-transform:uppercase;">🚑 Saúde & Emergência</span>
                      <span style="color:var(--gold); font-size:12px; transition:transform 0.2s;">${window.expandedHealth === p.id ? '▼' : '▶'}</span>
                  </div>
                  ${window.expandedHealth === p.id ? `
                  <div style="padding:12px; animation: fadeIn 0.2s ease-in-out;">
                      <div style="margin-bottom:12px;">
                          <div style="font-size:10px; color:var(--muted); text-transform:uppercase; font-weight:bold; margin-bottom:4px;">Contacto de Emergência / Enc. Ed.</div>
                          ${p.contactName || p.contactPhone ? `
                              <div style="font-size:12px; color:var(--chalk); font-weight:bold; margin-bottom:8px;">${p.contactName || 'Sem Nome'} ${p.contactPhone ? `— ${p.contactPhone}` : ''}</div>
                              ${p.contactPhone ? `
                              <div style="display:flex; gap:8px;">
                                  <a href="tel:${p.contactPhone}" class="btn btn-green" style="flex:1; text-decoration:none; padding:8px; font-size:11px; display:flex; justify-content:center; align-items:center; gap:6px;" onclick="event.stopPropagation();">📞 Ligar</a>
                                  <a href="sms:${p.contactPhone}" class="btn btn-gold" style="flex:1; text-decoration:none; padding:8px; font-size:11px; display:flex; justify-content:center; align-items:center; gap:6px;" onclick="event.stopPropagation();">💬 Enviar SMS</a>
                              </div>
                              ` : ''}
                          ` : `<div style="font-size:11px; color:var(--muted);">Nenhum contacto registado.</div>`}
                      </div>
                      <div>
                          <div style="font-size:10px; color:var(--muted); text-transform:uppercase; font-weight:bold; margin-bottom:4px;">Notas Médicas / Alergias</div>
                          <div style="font-size:11px; color:var(--chalk); background:var(--surface); padding:8px; border-radius:6px; border:1px solid var(--line); white-space:pre-wrap;">${p.medicalNotes || 'Sem notas médicas registadas.'}</div>
                      </div>
                  </div>
                  ` : ''}
              </div>

              <div style="display:flex; gap:8px;">
                <button class="btn btn-outline" style="flex:1; font-size:11px; padding:10px;" onclick="editingPlayerId='${p.id}'; render();">✏️ EDITAR DADOS DO JOGADOR</button>
                <button class="btn btn-gold" style="flex:none; padding:10px 14px; font-size:11px;" onclick="window.exportPlayerPDF('${p.id}')">📄 FICHA PDF</button>
              </div>
            </div>`;
          }
        }

        html += `</div>`;
      });

      html += `</div>
        <div class="add-row" style="margin-bottom:15px;"><input id="new-player-input" type="text" placeholder="${t('pl_add_ph')}"><button onclick="uiAddPlayer()">+</button></div>`;
    }
  }

  if (staffSubTab === 'comparar') {
      let opts1 = `<option value="" ${!window.compareP1?'selected':''}>-- ${t('cancel')} --</option><option value="" disabled>${t('comp_p1')}</option>`;
      let opts2 = `<option value="" ${!window.compareP2?'selected':''}>-- ${t('cancel')} --</option><option value="" disabled>${t('comp_p2')}</option>`;
      sortPlayerObjs(activeRoster).forEach(p => {
          opts1 += `<option value="${p.id}" ${window.compareP1===p.id?'selected':''}>${playerLabel(p)}</option>`;
          opts2 += `<option value="${p.id}" ${window.compareP2===p.id?'selected':''}>${playerLabel(p)}</option>`;
      });

      html += `<div class="card" style="min-height: 300px;">
          <div style="display:flex; gap:10px; margin-bottom:16px;">
              <select style="flex:1; padding:10px 4px; border-radius:6px; background:var(--surface-2); color:var(--chalk); border:1px solid var(--line); font-size:12px; font-weight:bold;" onchange="window.compareP1=this.value; render()">${opts1}</select>
              <div style="display:flex; align-items:center; color:var(--gold); font-size:11px; font-weight:bold;">VS</div>
              <select style="flex:1; padding:10px 4px; border-radius:6px; background:var(--surface-2); color:var(--chalk); border:1px solid var(--line); font-size:12px; font-weight:bold;" onchange="window.compareP2=this.value; render()">${opts2}</select>
          </div>`;

      if (window.compareP1 && window.compareP2 && window.compareP1 !== window.compareP2) {
          const st1 = calcularEstatisticaJogador(window.compareP1, state.currentSeason); 
          const st2 = calcularEstatisticaJogador(window.compareP2, state.currentSeason);

          const p1Obj = (state.roster || []).find(x => x.id === window.compareP1);
          const p2Obj = (state.roster || []).find(x => x.id === window.compareP2);

          const pos1 = p1Obj && typeof p1Obj.positions === 'string' ? p1Obj.positions.toUpperCase() : '';
          const pos2 = p2Obj && typeof p2Obj.positions === 'string' ? p2Obj.positions.toUpperCase() : '';

          const isGK1 = pos1.includes('GR') || pos1.includes('GK');
          const isGK2 = pos2.includes('GR') || pos2.includes('GK');
          const showConcededRow = isGK1 || isGK2;
          
          const renderRow = (label, val1, val2, invert = false) => {
              let c1 = 'var(--chalk)', c2 = 'var(--chalk)';
              if (val1 > val2) { c1 = invert ? 'var(--red)' : 'var(--green)'; c2 = invert ? 'var(--green)' : 'var(--red)'; } 
              else if (val2 > val1) { c2 = invert ? 'var(--red)' : 'var(--green)'; c1 = invert ? 'var(--green)' : 'var(--red)';} 
              else { c1 = 'var(--yellow)'; c2 = 'var(--yellow)'; }
              return `<div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid var(--line); font-size:15px;">
                  <span style="flex:1; text-align:center; color:${c1}; font-weight:bold; font-family:ui-monospace, monospace;">${val1}</span>
                  <span style="flex:1.5; text-align:center; font-size:10px; color:var(--muted); text-transform:uppercase; line-height:1.6; font-weight:bold;">${label}</span>
                  <span style="flex:1; text-align:center; color:${c2}; font-weight:bold; font-family:ui-monospace, monospace;">${val2}</span>
              </div>`;
          };

          const gs1Str = isGK1 ? st1.golosSofridos : '-';
          const gs2Str = isGK2 ? st2.golosSofridos : '-';

          html += `<div style="background:var(--surface-2); border-radius:8px; padding:12px; border:1px solid var(--gold-dim);">
              ${renderRow(t('comp_mins'), Math.round(st1.totalSegundosJogo/60) + "'", Math.round(st2.totalSegundosJogo/60) + "'")}
              ${renderRow(t('comp_goals'), st1.golos, st2.golos)}
              ${renderRow(t('comp_assists'), st1.assistencias, st2.assistencias)}
              ${showConcededRow ? renderRow('GOLOS SOFRIDOS (GS)', gs1Str, gs2Str, true) : ''}
              ${renderRow(t('comp_starts'), st1.jogosTitular, st2.jogosTitular)}
              ${renderRow(t('comp_abs'), st1.faltasTreino, st2.faltasTreino, true)}
              ${renderRow(t('comp_yel'), st1.amarelos, st2.amarelos, true)}
              ${renderRow(t('comp_red'), st1.vermelhos, st2.vermelhos, true)}
          </div>
          <div style="font-size:9px; color:var(--muted); text-align:center; margin-top:10px; text-transform:uppercase;">${t('comp_season')} (${state.currentSeason})</div>`;
      } else if (window.compareP1 === window.compareP2 && window.compareP1) {
          html += `<div class="empty">${t('comp_diff')}</div>`;
      } else {
          html += `<div class="empty" style="margin-top:40px;">${t('comp_select')}</div>`;
      }
      html += `</div>`;
  }

  if (staffSubTab === 'staff') {
    const staffList = state.staff || [];

    if (staffForm) {
      return `${topbarHtml('Membro da Equipa Técnica')}${renderTeamSubHeader()}
        <div class="card">
          <div class="field"><label>Nome</label><input type="text" value="${staffForm.name||''}" oninput="staffForm.name=this.value"></div>
          <div class="field"><label>Cargo / Função</label><input type="text" placeholder="Ex: Treinador Adjunto / Fisioterapeuta" value="${staffForm.role||''}" oninput="staffForm.role=this.value"></div>
        </div>
        <button class="btn btn-gold" style="width:100%; margin-bottom:10px;" onclick="saveStaffMember()">${t('save')}</button>
        <button class="btn btn-outline" style="width:100%;" onclick="staffForm=null; render()">${t('cancel')}</button>`;
    }

    html += `<button class="btn btn-gold" style="width:100%; margin-bottom:14px;" onclick="staffForm={name:'', role:''}; render()">➕ Adicionar Staff</button>`;

    if (staffList.length === 0) {
      html += `<div class="card" style="text-align:center; padding:20px;"><p style="color:var(--muted);">Ainda não existem elementos na equipa técnica.</p></div>`;
    } else {
      html += `<div style="display:flex; flex-direction:column; gap:8px; margin-bottom:15px;">`;
      staffList.forEach(st => {
        html += `
          <div class="card" style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; margin-bottom:0;">
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="width:32px; height:32px; border-radius:50%; background:var(--surface-2); border:1px solid var(--line); display:flex; align-items:center; justify-content:center; font-size:14px;">👔</div>
              <div style="text-align:left;">
                <div style="font-weight:bold; color:var(--chalk); font-size:14px;">${st.name}</div>
                <div style="font-size:11px; color:var(--gold);">${st.role || 'Equipa Técnica'}</div>
              </div>
            </div>
            <button class="quick-del" onclick="askConfirm('Remover este elemento?', ()=>deleteStaffMember('${st.id}'))">🗑</button>
          </div>`;
      });
      html += `</div>`;
    }
  }

  return html;
};

window.uiAddPlayer = function(){ try { if(!state.roster) state.roster = []; const input = document.getElementById('new-player-input'); if(!input) return; const v = input.value; if(v && v.trim() !== '') { state.roster.push({ id: uid(), name: escapeHTML(v.trim()), birthDate: null, number: null, positions: '', active: true, joinDate: new Date().toISOString().slice(0,10) }); input.value = ''; saveState(); render(); } } catch(e) { console.error("Error:", e); alert(t('msg_err_add_pl') + e.message); } };
window.updatePlayerName = function(id, val){ const p=state.roster.find(x=>x.id===id); if(p){p.name=escapeHTML(val.trim()); saveState(); render();} };
window.updatePlayerNumber = function(id, val){ const p=state.roster.find(x=>x.id===id); if(p){p.number=parseInt(val)||null; saveState(); render();} };
window.updatePlayerNotes = function(id, val) {
  const p = (state.roster || []).find(x => x.id === id);
  if (p) {
    p.notes = escapeHTML(val.trim());
    saveState();
  }
};
window.updatePlayerContactName = function(id, val) { const p=state.roster.find(x=>x.id===id); if(p){p.contactName=escapeHTML(val.trim()); saveState();} };
window.updatePlayerContactPhone = function(id, val) { const p=state.roster.find(x=>x.id===id); if(p){p.contactPhone=escapeHTML(val.trim()); saveState();} };
window.updatePlayerMedicalNotes = function(id, val) { const p=state.roster.find(x=>x.id===id); if(p){p.medicalNotes=escapeHTML(val.trim()); saveState();} };

window.updatePlayerBirthDate = function(id, val){ 
  const p = state.roster.find(x=>x.id===id); 
  if(!p) return;
  if(!val || val.trim() === ''){ p.birthDate = null; saveState(); render(); return; }
  let str = val.trim().replace(/[\/\-]/g, '.');
  let pts = str.split('.');
  if(pts.length !== 3){ showToast("Usa o formato: dia.mes.ano"); render(); return; }
  let d = parseInt(pts[0], 10); let m = parseInt(pts[1], 10); let y = parseInt(pts[2], 10);
  if(y < 100) y += (y < 30 ? 2000 : 1900); 
  let dateObj = new Date(y, m-1, d);
  if(isNaN(dateObj.getTime()) || dateObj.getDate() !== d || dateObj.getMonth() !== m-1){ showToast("Data inválida! Verifica o dia/mês."); render(); return; }
  if(dateObj > new Date()){ showToast("O jogador não pode nascer no futuro!"); render(); return; }
  p.birthDate = `${String(d).padStart(2,'0')}.${String(m).padStart(2,'0')}.${y}`;
  saveState(); render();
};

window.removePlayer = function(id){ const p=state.roster.find(x=>x.id===id); if(p){ p.active=false; saveState(); render(); } };

window.exportLeaguePDF = function(lgId) {
  const lg = state.leagues.find(l => l.id === lgId);
  if (!lg) return;

  // Calcula a tabela classificativa atualizada
  let table = {}; 
  lg.teams.forEach(t => table[t] = { name: t, p:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0 });
  lg.matches.forEach(m => { 
    if(!table[m.h] || !table[m.a]) return; 
    table[m.h].p++; table[m.a].p++; 
    table[m.h].gf += m.hg; table[m.h].ga += m.ag; table[m.h].gd += (m.hg - m.ag); 
    table[m.a].gf += m.ag; table[m.a].ga += m.hg; table[m.a].gd += (m.ag - m.hg); 
    if(m.hg > m.ag) { table[m.h].w++; table[m.h].pts += 3; table[m.a].l++; } 
    else if(m.hg === m.ag) { table[m.h].d++; table[m.a].d++; table[m.h].pts += 1; table[m.a].pts += 1; } 
    else { table[m.a].w++; table[m.a].pts += 3; table[m.h].l++; } 
  });

  let sortedTable = Object.values(table).sort((a,b) => { 
    if(b.pts !== a.pts) return b.pts - a.pts; 
    if(b.gd !== a.gd) return b.gd - a.gd; 
    return b.gf - a.gf; 
  });

  let rowsHtml = sortedTable.map((row, idx) => {
    let isMyClub = row.name === getMyClub() || row.name === state.myClubName;
    let bg = isMyClub ? '#FEF3C7' : (idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF');
    return `
      <tr style="background:${bg}; border-bottom:1px solid #E5E7EB; ${isMyClub ? 'font-weight:bold;' : ''}">
        <td style="padding:6px; color:#6B7280;">${idx + 1}</td>
        <td style="text-align:left; padding:6px 10px; color:${isMyClub ? '#D9A441' : '#111827'};">${row.name} ${isMyClub ? '⭐' : ''}</td>
        <td style="padding:6px;">${row.p}</td>
        <td style="padding:6px; color:#16A34A;">${row.w}</td>
        <td style="padding:6px; color:#D97706;">${row.d}</td>
        <td style="padding:6px; color:#DC2626;">${row.l}</td>
        <td style="padding:6px;">${row.gf}</td>
        <td style="padding:6px;">${row.ga}</td>
        <td style="padding:6px;">${row.gd > 0 ? '+' : ''}${row.gd}</td>
        <td style="padding:6px; font-weight:800; font-size:13px; color:#0E211A;">${row.pts}</td>
      </tr>`;
  }).join('');

  let html = `
    <div class="print-card" style="padding:24px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#111827;">
      <div class="print-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #0E211A; padding-bottom:12px; margin-bottom:18px;">
        <div>
          <h1 style="font-size:20px; margin:0; text-transform:uppercase; letter-spacing:0.05em; color:#0E211A; font-weight:800;">TABELA CLASSIFICATIVA OFICIAL</h1>
          <p style="font-size:18px; font-weight:800; margin:4px 0 0 0; color:#D9A441;">🏆 ${lg.name}</p>
          <p style="font-size:11px; color:#4B5563; margin-top:2px;">Clube: <b>${getClubAndEscalao()}</b> &nbsp;|&nbsp; Época: <b>${state.currentSeason}</b> &nbsp;|&nbsp; Emissão: <b>${new Date().toLocaleDateString('pt-PT')}</b></p>
        </div>
        ${getClubLogoHtml()}
      </div>

      <div style="background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px; padding:12px; margin-bottom:20px;">
        <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:center;">
          <thead>
            <tr style="background:#E5E7EB; color:#374151;">
              <th style="width:25px; padding:6px 0;">#</th>
              <th style="text-align:left; padding-left:10px;">Equipa</th>
              <th style="width:30px;">J</th>
              <th style="width:30px;">V</th>
              <th style="width:30px;">E</th>
              <th style="width:30px;">D</th>
              <th style="width:35px;">GM</th>
              <th style="width:35px;">GS</th>
              <th style="width:35px;">DG</th>
              <th style="width:40px;">Pts</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="10" style="padding:10px; color:#9CA3AF;">Sem dados registados.</td></tr>'}
          </tbody>
        </table>
      </div>

      <div style="margin-top:24px; display:flex; justify-content:space-between; align-items:flex-end;">
        <div style="font-size:10px; color:#6B7280;">• Documento informativo de competição — Coachfolio v3.5</div>
        <div style="text-align:center; width:200px; border-top:1.5px solid #111827; padding-top:4px; font-size:11px; font-weight:bold;">A Direção / Coordenação</div>
      </div>
    </div>`;

  document.getElementById('print-area').innerHTML = html;
  window.openSafePrintModal();
};