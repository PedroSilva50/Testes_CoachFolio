function buildMatchReportHTML(m){
  const sc = m.goals.filter(g=>g.type==='scored').length; 
  const co = m.goals.filter(g=>g.type==='conceded').length;
  const dateStr = m.date.split('-').reverse().join('/');
  let locLabel = (m.location||'casa') === 'casa' ? t('match_home') : t('match_away');
  
  let totalMatchMins = 0;
  if (m.isNewManualModel) {
    totalMatchMins = (m.manualHalf1Duration || 0) + (m.manualHalf2Duration || 0);
  } else if (m.singleHalf) {
    totalMatchMins = m.halfDuration || state.defaultHalfDuration || 30;
  } else {
    totalMatchMins = (m.halfDuration || state.defaultHalfDuration || 30) * (m.numberOfHalves || 2);
  }

  let squadIds = [];
  if(m.originalSchedule && m.originalSchedule.callup && m.originalSchedule.callup.length > 0) {
    squadIds = [...m.originalSchedule.callup];
  } else {
    squadIds = [...new Set([
      ...(m.lineup||[]), 
      ...(m.subs||[]).map(s=>s.inId), 
      ...(m.subs||[]).map(s=>s.outId),
      ...Object.keys(m.ratings||{})
    ])];
  }

  if(squadIds.length === 0) { squadIds = eligiblePlayers().map(p => p.id); }
  
  const squadPlayers = squadIds.map(id => (state.roster || []).find(p => p.id === id)).filter(Boolean);
  const starters = []; const usedSubs = []; const unused = [];

  squadPlayers.forEach(p => {
    const isStarter = (m.lineup || []).includes(p.id);
    const wasSubbedIn = (m.subs || []).some(s => s.inId === p.id);
    if (isStarter) starters.push(p);
    else if (wasSubbedIn) usedSubs.push(p);
    else unused.push(p);
  });

  const sortedSquad = [
    ...sortPlayerObjs(starters),
    ...sortPlayerObjs(usedSubs),
    ...sortPlayerObjs(unused)
  ];

  let lineupHtml = '';
  sortedSquad.forEach(p => {
    const isStarter = (m.lineup||[]).includes(p.id);
    const wasSubbedIn = (m.subs||[]).some(s => s.inId === p.id);
    let secs = calcPlayerMinutes(m, p.id);
    let minsStr = formatSecsToMinSec(secs);
    const r = (m.ratings && m.ratings[p.id]) ? `${m.ratings[p.id]}★` : '-';
    let statusLabel = isStarter ? '<b>(XI)</b>' : (wasSubbedIn ? '(Sup)' : '(SNU)');
    lineupHtml += `<tr><td style="text-align:left;">${playerLabel(p)} ${statusLabel}</td><td style="white-space:nowrap; padding:0 6px;">${minsStr}</td><td>${r}</td></tr>`;
  });

  let subsHtml = '';
  (m.subs||[]).forEach(s => {
    let minDisplay = s.isHalftime ? 'INT' : (s.minute != null ? window.getGlobalMinuteDisplay(m, s.half, s.minute) + "'" : '-');
    subsHtml += `<tr><td>${minDisplay}</td><td style="color:#C8493F; text-align:left;">↓ ${playerName(s.outId)}</td><td style="color:#16A34A; text-align:left;">↑ ${playerName(s.inId)}</td></tr>`;
  });

  let goalsHtml = '';
  (m.goals||[]).forEach(g => {
     let desc = g.type==='scored' ? `⚽ ${playerName(g.scorerId)} ${g.assistId&&g.assistId!=='none'? '(Ast: '+playerName(g.assistId)+')':''}` : `🥅 Golo Sofrido`;
     let minDisplay = g.minute != null ? window.getGlobalMinuteDisplay(m, g.half, g.minute) + "'" : (g.half===1?"1ªP":"2ªP");
     goalsHtml += `<tr><td>${minDisplay}</td><td style="text-align:left; font-weight:bold;">${desc}</td></tr>`;
  });

  let cardsHtml = '';
  (m.cards||[]).forEach(c => {
    let minDisplay = c.minute != null ? window.getGlobalMinuteDisplay(m, c.half, c.minute) + "'" : '-';
    cardsHtml += `<tr><td>${minDisplay}</td><td style="text-align:left;">${c.color==='Amarelo'?'🟨':'🟥'} ${playerName(c.playerId)}</td></tr>`;
  });

  const selectedStaffIds = m.originalSchedule?.staffCallup || [];
  const staffList = (state.staff || []).filter(st => selectedStaffIds.includes(st.id));
  let staffRowsHtml = '';
  if (staffList.length === 0) {
    staffRowsHtml = '<tr><td colspan="2" style="text-align:center; padding:6px; color:#666;">Equipa Técnica / Delegado não registados.</td></tr>';
  } else {
    staffList.forEach(st => {
      staffRowsHtml += `<tr><td style="text-align:left; font-weight:bold;">${st.name}</td><td style="text-align:center; color:#444;">${st.role || 'Equipa Técnica'}</td></tr>`;
    });
  }

  let html = `<div class="print-card">
    <div class="print-header" style="display:flex; justify-content:space-between; align-items:center; text-align:left;">
      <div>
        <h1 style="margin:0;">Relatório de Jogo</h1>
        <p style="font-size:18px; font-weight:bold; margin:5px 0 0;">${getMyClub()} ${sc} - ${co} ${m.opponent} (${locLabel})</p>
        <p style="margin:5px 0 0;"><b>${getClubAndEscalao()}</b> | ${dateStr} | Época: ${m.season||state.currentSeason} ${m.capitao ? ' | © Capitão: ' + playerName(m.capitao) : ''} | Duração Real: ${totalMatchMins}'</p>
      </div>
      ${getClubLogoHtml()}
    </div>
    <div style="display:flex; gap:20px; margin-bottom:20px; align-items:flex-start;">
      <div style="flex:1.2;">
        <h3>Convocatória e Minutos (${sortedSquad.length} Jogadores)</h3>
        <table><tr><th style="text-align:left;">Jogador</th><th>Min</th><th>Aval</th></tr>${lineupHtml||'<tr><td colspan="3">Sem registo</td></tr>'}</table>
      </div>
      <div style="flex:1;">
        <h3>Substituições</h3>
        <table><tr><th>Min</th><th style="text-align:left;">Saiu</th><th style="text-align:left;">Entrou</th></tr>${subsHtml||'<tr><td colspan="3">Sem registo</td></tr>'}</table>
        <h3 style="margin-top:15px;">Equipa Técnica Presente</h3>
        <table><tr><th style="text-align:left;">Jogador</th><th style="width:70px;">Min</th><th style="width:40px;">Aval</th></tr>
        <h3 style="margin-top:15px;">Cartões</h3>
        <table><tr><th>Min</th><th style="text-align:left;">Jogador</th></tr>${cardsHtml||'<tr><td colspan="2">Sem registo</td></tr>'}</table>
      </div>
    </div>
    <h3>Golos e Ocorrências</h3>
    <table><tr><th style="width:50px;">Min</th><th style="text-align:left;">Evento</th></tr>${goalsHtml||'<tr><td colspan="2">Sem registo</td></tr>'}</table>
    <h3>Notas do Treinador</h3>
    <p style="white-space:pre-wrap; border:1px solid #CCC; padding:10px; border-radius:6px; background:#FFF; min-height:60px;">${m.notes||'Nenhuma nota registada neste jogo.'}</p>
  </div>`;

  return html;
}
// Desenha o campo tático vetorial horizontal (4:3) em SVG para ser impresso no PDF
window.buildMatchTacticalPitchSVG = function(m) {
  if (!m) return '';

  const kitColor = m.tacticalSnapshot?.kitColor || state.teamColor || '#D9A441';
  const numColor = typeof getContrastColor === 'function' ? getContrastColor(kitColor) : '#000000';
  
  if (!m.tacticalSnapshot || !m.tacticalSnapshot.pieces || m.tacticalSnapshot.pieces.length === 0) {
    if (typeof window.generateMatchTacticalSnapshot === 'function') {
      window.generateMatchTacticalSnapshot(m);
    }
  }

  const pieces = m.tacticalSnapshot?.pieces || [];

  let piecesSVG = '';
  pieces.forEach(p => {
    const pObj = (state.roster || []).find(x => x.id === p.playerId);
    const numLabel = pObj && pObj.number ? String(pObj.number) : (p.label || '?');
    const nameLabel = pObj ? (pObj.name ? pObj.name.split(' ')[0] : '') : (p.name || '');

    const cx = Number.isFinite(Number(p.x)) ? Number(p.x) : 50;
    const cy = Number.isFinite(Number(p.y)) ? Number(p.y) : 50;
    const svgY = (cy / 100) * 75;

    piecesSVG += `
      <!-- Círculo da Camisola -->
      <circle cx="${cx}" cy="${svgY}" r="5" fill="${kitColor}" stroke="#FFFFFF" stroke-width="0.8" />
      <!-- Número no Centro -->
      <text x="${cx}" y="${svgY + 1.5}" fill="${numColor}" font-size="4" font-weight="bold" font-family="-apple-system, sans-serif" text-anchor="middle">${numLabel}</text>
      <!-- Nome do Jogador -->
      ${nameLabel ? `
        <rect x="${cx - 10}" y="${svgY + 5.5}" width="20" height="4.5" rx="1" fill="rgba(0,0,0,0.75)" />
        <text x="${cx}" y="${svgY + 8.8}" fill="#FFFFFF" font-size="3" font-weight="bold" font-family="-apple-system, sans-serif" text-anchor="middle">${nameLabel}</text>
      ` : ''}
    `;
  });

  return `
    <div style="width:100%; max-width:360px; aspect-ratio:4/3; margin:0 auto; background:#113821; border:2px solid #000; border-radius:8px; overflow:hidden; position:relative;">
      <svg viewBox="0 0 100 75" style="width:100%; height:100%; display:block;">
        <rect x="0" y="0" width="100" height="75" fill="#113821" />
        <rect x="3" y="3" width="94" height="69" fill="none" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
        <line x1="50" y1="3" x2="50" y2="72" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
        <circle cx="50" cy="37.5" r="10" fill="none" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
        <rect x="3" y="20" width="14" height="35" fill="none" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
        <rect x="83" y="20" width="14" height="35" fill="none" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
        ${piecesSVG}
      </svg>
    </div>
  `;
};
window.exportMatchPDF = function(mId) {
  const m = state.matches.find(x => x.id === mId);
  if (!m) return;

  const printArea = document.getElementById('print-area');
  const sc = m.goals ? m.goals.filter(g => g.type === 'scored').length : (m.ourGoals || 0);
  const co = m.goals ? m.goals.filter(g => g.type === 'conceded').length : (m.theirGoals || 0);
  const dateStr = m.date ? m.date.split('-').reverse().join('/') : '-';
  let locLabel = (m.location || 'casa') === 'casa' ? t('match_home') : t('match_away');
  
  let totalMatchMins = 0;
  if (m.isNewManualModel) {
    totalMatchMins = (m.manualHalf1Duration || 0) + (m.manualHalf2Duration || 0);
  } else if (m.singleHalf) {
    totalMatchMins = m.halfDuration || state.defaultHalfDuration || 30;
  } else {
    totalMatchMins = (m.halfDuration || state.defaultHalfDuration || 30) * (m.numberOfHalves || 2);
  }

  // 1. Separar Convocatória e Plantel
  let squadIds = [];
  if (m.originalSchedule && m.originalSchedule.callup && m.originalSchedule.callup.length > 0) {
    squadIds = [...m.originalSchedule.callup];
  } else {
    squadIds = [...new Set([
      ...(m.lineup || []), 
      ...(m.subs || []).map(s => s.inId), 
      ...(m.subs || []).map(s => s.outId),
      ...Object.keys(m.ratings || {})
    ])];
  }

  if (squadIds.length === 0) { squadIds = eligiblePlayers().map(p => p.id); }
  
  const squadPlayers = squadIds.map(id => (state.roster || []).find(p => p.id === id)).filter(Boolean);
  const starters = []; const usedSubs = []; const unused = [];

  squadPlayers.forEach(p => {
    const isStarter = (m.lineup || []).includes(p.id);
    const wasSubbedIn = (m.subs || []).some(s => s.inId === p.id);
    if (isStarter) starters.push(p);
    else if (wasSubbedIn) usedSubs.push(p);
    else unused.push(p);
  });

  // Tabela da Equipa Inicial (Sem a coluna Pos)
  let startersHtml = '';
  sortPlayerObjs(starters).forEach(p => {
    startersHtml += `<tr><td style="text-align:center; font-weight:bold; width:35px; padding:6px 0;">${p.number || '-'}</td><td style="text-align:left; font-weight:bold; padding-left:10px;">${p.name || t('pl_no_name')}</td></tr>`;
  });

  // Tabela Completa da Convocatória com Minutos e Avaliações
  const sortedSquad = [
    ...sortPlayerObjs(starters),
    ...sortPlayerObjs(usedSubs),
    ...sortPlayerObjs(unused)
  ];

  let lineupHtml = '';
  sortedSquad.forEach(p => {
    const isStarter = (m.lineup || []).includes(p.id);
    const wasSubbedIn = (m.subs || []).some(s => s.inId === p.id);
    let secs = calcPlayerMinutes(m, p.id);
    let minsStr = formatSecsToMinSec(secs);
    const r = (m.ratings && m.ratings[p.id]) ? `${m.ratings[p.id]}★` : '-';
    let statusLabel = isStarter ? '<b>(XI)</b>' : (wasSubbedIn ? '(Sup)' : '(SNU)');
    
    lineupHtml += `<tr><td style="text-align:left; padding-left:8px;">${playerLabel(p)} ${statusLabel}</td><td style="white-space:nowrap; text-align:center; padding:0 4px;">${minsStr}</td><td style="text-align:center;">${r}</td></tr>`;
  });

  // 2. Substituições, Golos e Cartões
  let subsHtml = '';
  if (m.subs && m.subs.length > 0) {
    m.subs.forEach(s => {
      let minDisplay = s.isHalftime ? 'INT' : (s.minute != null ? window.getGlobalMinuteDisplay(m, s.half, s.minute) + "'" : '-');
      subsHtml += `<tr><td style="width:40px;">${minDisplay}</td><td style="color:#C8493F; text-align:left; padding-left:6px;">↓ ${playerName(s.outId)}</td><td style="color:#16A34A; text-align:left; padding-left:6px;">↑ ${playerName(s.inId)}</td></tr>`;
    });
  }

  let goalsHtml = '';
  if (m.goals && m.goals.length > 0) {
    m.goals.forEach(g => {
       let subTag = g.goalSubtype === 'penalti' ? ' (Penálti)' : (g.goalSubtype === 'autogolo' ? ' (Autogolo)' : '');
       let desc = '';
       if (g.type === 'scored') {
         desc = g.scorerId === 'autogolo' ? `⚽ Autogolo (Adversário)` : `⚽ ${playerName(g.scorerId)}${subTag} ${g.assistId && g.assistId !== 'none' ? '(Ast: ' + playerName(g.assistId) + ')' : ''}`;
       } else {
         let ownGoalPlayer = g.scorerId ? ` [${playerName(g.scorerId)}]` : '';
         desc = `🥅 Golo Sofrido${subTag}${ownGoalPlayer}`;
       }
       let minDisplay = g.minute != null ? window.getGlobalMinuteDisplay(m, g.half, g.minute) + "'" : (g.half === 1 ? "1ªP" : "2ªP");
       goalsHtml += `<tr><td style="width:50px;">${minDisplay}</td><td style="text-align:left; font-weight:bold; padding-left:10px;">${desc}</td></tr>`;
    });
  }

  let cardsHtml = '';
  if (m.cards && m.cards.length > 0) {
    m.cards.forEach(c => {
      let minDisplay = c.minute != null ? window.getGlobalMinuteDisplay(m, c.half, c.minute) + "'" : '-';
      cardsHtml += `<tr><td style="width:50px;">${minDisplay}</td><td style="text-align:left; padding-left:10px;">${c.color === 'Amarelo' ? '🟨' : '🟥'} ${playerName(c.playerId)}</td></tr>`;
    });
  }

  // 3. Equipa Técnica Presente em Linha
  const selectedStaffIds = m.originalSchedule?.staffCallup || [];
  const staffList = (state.staff || []).filter(st => selectedStaffIds.includes(st.id));
  let staffStr = staffList.length > 0 
    ? staffList.map(st => `<b>${st.name}</b> (${st.role || 'Equipa Técnica'})`).join(' &nbsp;•&nbsp; ')
    : 'Sem registo oficial de elementos presentes.';

  // 4. Desenho do Campo Tático
  const tacticalPitchSVG = window.buildMatchTacticalPitchSVG ? window.buildMatchTacticalPitchSVG(m) : '';

  let html = `<div class="print-card" style="padding:20px; font-family:-apple-system, sans-serif;">
    <!-- CABEÇALHO COM EMBLEMA DO CLUBE -->
    <div class="print-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:15px;">
      <div>
        <h1 style="font-size:22px; margin:0; text-transform:uppercase; color:#000;">RELATÓRIO DE JOGO</h1>
        <p style="font-size:18px; font-weight:bold; margin:4px 0 0 0; color:#333;">${getMyClub()} ${sc} - ${co} ${m.opponent || 'Adversário'} (${locLabel})</p>
        <p style="font-size:11px; color:#555; margin:3px 0 0 0;"><b>${getClubAndEscalao()}</b> | ${dateStr} | Época: <b>${m.season || state.currentSeason}</b> ${m.capitao ? ' | © Capitão: ' + playerName(m.capitao) : ''} | Duração: <b>${totalMatchMins}'</b></p>
      </div>
      ${getClubLogoHtml()}
    </div>

    <!-- BLOCO 1: EQUIPA INICIAL (SEM POSIÇÃO) & CAMPO TÁTICO EXPANDIDO -->
    <div style="display:flex; gap:15px; margin-bottom:15px; align-items:flex-start;">
      <div style="flex:0.8;">
        <h3 style="font-size:12px; font-weight:bold; margin:0 0 6px 0; border-bottom:1px solid #000; padding-bottom:3px; text-transform:uppercase;">Equipa Inicial (${starters.length} Titulares)</h3>
        <table style="width:100%; border-collapse:collapse; font-size:11px;">
          <thead><tr><th style="width:35px;">Nº</th><th style="text-align:left; padding-left:10px;">Jogador</th></tr></thead>
          <tbody>${startersHtml || '<tr><td colspan="2" style="text-align:center; padding:6px;">Sem titulares definidos</td></tr>'}</tbody>
        </table>
      </div>
      <div style="flex:1.2; text-align:center;">
        <h3 style="font-size:12px; font-weight:bold; margin:0 0 6px 0; border-bottom:1px solid #000; padding-bottom:3px; text-transform:uppercase;">Disposição Tática em Campo</h3>
        ${tacticalPitchSVG}
      </div>
    </div>

    <!-- BLOCO 2: INCIDÊNCIAS DO JOGO -->
    <div style="display:flex; gap:20px; margin-bottom:15px; align-items:flex-start;">
      <div style="flex:1.2;">
        <h3 style="font-size:12px; font-weight:bold; margin:0 0 6px 0; border-bottom:1px solid #000; padding-bottom:3px; text-transform:uppercase;">Golos e Ocorrências</h3>
        <table style="width:100%; border-collapse:collapse; font-size:11px;">
          <thead><tr><th style="width:50px;">Min</th><th style="text-align:left; padding-left:10px;">Evento</th></tr></thead>
          <tbody>${goalsHtml || '<tr><td colspan="2" style="text-align:center; padding:6px; color:#666;">Sem golos registados</td></tr>'}</tbody>
        </table>
      </div>

      <div style="flex:1;">
        <h3 style="font-size:12px; font-weight:bold; margin:0 0 6px 0; border-bottom:1px solid #000; padding-bottom:3px; text-transform:uppercase;">Substituições & Cartões</h3>
        <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:8px;">
          <thead><tr><th style="width:40px;">Min</th><th style="text-align:left; padding-left:6px;">Saiu</th><th style="text-align:left; padding-left:6px;">Entrou</th></tr></thead>
          <tbody>${subsHtml || '<tr><td colspan="3" style="text-align:center; padding:4px; color:#666;">Sem substituições</td></tr>'}</tbody>
        </table>
        <table style="width:100%; border-collapse:collapse; font-size:11px;">
          <thead><tr><th style="width:50px;">Min</th><th style="text-align:left; padding-left:10px;">Jogador</th></tr></thead>
          <tbody>${cardsHtml || '<tr><td colspan="2" style="text-align:center; padding:4px; color:#666;">Sem cartões registados</td></tr>'}</tbody>
        </table>
      </div>
    </div>

    <!-- BLOCO 3: CONVOCATÓRIA E MINUTOS -->
    <h3 style="font-size:12px; font-weight:bold; margin:0 0 6px 0; border-bottom:1px solid #000; padding-bottom:3px; text-transform:uppercase;">Convocatória e Minutos de Jogo (${sortedSquad.length} Atletas)</h3>
    <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:15px;">
      <thead><tr><th style="text-align:left; padding-left:8px;">Jogador</th><th style="width:75px; text-align:center;">Minutos</th><th style="width:40px; text-align:center;">Aval</th></tr></thead>
      <tbody>${lineupHtml || '<tr><td colspan="3" style="text-align:center; padding:6px;">Sem registo de convocatória</td></tr>'}</tbody>
    </table>

    <!-- BLOCO 4: EQUIPA TÉCNICA PRESENTES -->
    <h3 style="font-size:12px; font-weight:bold; margin:0 0 4px 0; border-bottom:1px solid #000; padding-bottom:3px; text-transform:uppercase;">Equipa Técnica Presente</h3>
    <p style="font-size:11px; margin:0 0 15px 0; color:#333;">${staffStr}</p>

    <!-- BLOCO 5: NOTAS DO TREINADOR -->
    ${m.notes ? `
    <h3 style="font-size:12px; font-weight:bold; margin:0 0 6px 0; border-bottom:1px solid #000; padding-bottom:3px; text-transform:uppercase;">Notas do Treinador</h3>
    <p style="white-space:pre-wrap; border:1px solid #CCC; padding:8px; border-radius:6px; background:#FFF; min-height:40px; font-size:11px; line-height:1.4; color:#333; margin-bottom:15px;">${m.notes}</p>
    ` : ''}

    <div style="margin-top:20px; display:flex; justify-content:space-between; align-items:flex-end;">
      <div style="font-size:10px; color:#666;">• Ficha de jogo gerada via Coachfolio v3.5.1</div>
      <div style="text-align:center; width:200px; border-top:1px solid #000; padding-top:4px; font-size:11px; font-weight:bold;">A Equipa Técnica</div>
    </div>
  </div>`;

  printArea.innerHTML = html;
  window.openSafePrintModal();
};
window.exportSeasonPDF = function(season){
  const seasonId = season || state.currentSeason;
  const seasonMatches = (state.matches || [])
    .filter(m => (m.season || state.currentSeason) === seasonId)
    .slice()
    .sort((a,b) => {
      const dateA = a && a.date ? String(a.date) : '';
      const dateB = b && b.date ? String(b.date) : '';
      return dateA.localeCompare(dateB);
    });

  if (seasonMatches.length === 0) {
    showToast('Sem jogos registados nesta época para exportar.');
    return;
  }

  const combinedHtml = seasonMatches
    .map(m => `<div style="page-break-after: always;">${buildMatchReportHTML(m)}</div>`)
    .join('');

  const printArea = document.getElementById('print-area');
  if (printArea) {
    printArea.innerHTML = combinedHtml;
    window.openSafePrintModal();
  } else {
    showToast('Erro ao aceder à área de impressão.');
  }
};
// 1. Gera ou atualiza a disposição tática padrão dos titulares do jogo (Horizontal 4:3)
window.generateMatchTacticalSnapshot = function(m) {
  if (!m) return;
  
  const format = state.tacticFormat || 11;
  const starters = (m.lineup || []).slice(0, format);
  const ownKitColor = state.teamColor || '#D9A441';
  
  if (!m.tacticalSnapshot) {
    m.tacticalSnapshot = {
      format: format,
      kitColor: ownKitColor,
      pieces: []
    };
  }

  if (!m.tacticalSnapshot.pieces || m.tacticalSnapshot.pieces.length === 0) {
    const pieces = [];
    starters.forEach((pId, idx) => {
      const p = (state.roster || []).find(x => x.id === pId);
      const numLabel = p && p.number ? String(p.number) : String(idx + 1);
      const nameLabel = p ? (p.name ? p.name.split(' ')[0] : '') : '';

      // Posições horizontais padrão (Guarda-redes na baliza esquerda x=12)
      let x = 12, y = 50;
      if (idx > 0) {
        let col = Math.floor((idx - 1) / 3);
        let row = (idx - 1) % 3;
        x = 30 + (col * 22);
        y = 20 + (row * 30);
      }

      pieces.push({
        id: pId || uid(),
        playerId: pId,
        label: numLabel,
        name: nameLabel,
        x: x,
        y: Math.max(10, Math.min(90, y))
      });
    });

    m.tacticalSnapshot.pieces = pieces;
  }

  saveState();
};

// 2. Abre o Quadro Tático associado ao jogo atual
window.openMatchTacticalBoard = function(mId) {
  const m = state.matches.find(x => x.id === mId);
  if (!m) return;

  // Garante que o snapshot existe com a equipa inicial
  window.generateMatchTacticalSnapshot(m);

  // Define o estado de edição exclusiva do jogo
  window.editingMatchTacticsId = mId;
  state.tacticFormat = m.tacticalSnapshot.format || state.tacticFormat || 11;
  state.tactics = (m.tacticalSnapshot.pieces || []).map(p => ({
    id: p.id || uid(),
    kind: 'own',
    playerId: p.playerId,
    label: p.label,
    x: p.x,
    y: p.y
  }));

  saveState();
  navigateToHub('estrategia');
  navigateToTab('tatica');
};
window.saveMatchTacticalBoardAndReturn = function() {
  const mId = window.editingMatchTacticsId;
  const m = state.matches.find(x => x.id === mId);
  
  if (m) {
    if (!m.tacticalSnapshot) m.tacticalSnapshot = {};
    
    m.tacticalSnapshot.pieces = (state.tactics || []).map(p => {
      const pObj = (state.roster || []).find(x => x.id === p.playerId);
      return {
        id: p.id,
        playerId: p.playerId,
        label: p.label,
        name: pObj ? (pObj.name ? pObj.name.split(' ')[0] : '') : '',
        x: p.x,
        y: p.y
      };
    });

    saveState();
    showToast('Esquema tático guardado no jogo! 💾');
  }

  window.editingMatchTacticsId = null;
  navigateToHub('jogo');
  navigateToTab('jogo');
};