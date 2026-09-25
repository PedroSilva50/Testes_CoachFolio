const STORAGE_KEY = 'coach-app-data-v1';
const usingClaudeStorage = (typeof window.storage !== 'undefined');
const storageAdapter = {
  async get(key){ if(usingClaudeStorage){ try{ return await window.storage.get(key); }catch(e){ return null; } } else { const v = localStorage.getItem(key); return v ? { key, value: v } : null; } },
  async set(key, value){ if(usingClaudeStorage) return await window.storage.set(key, value); else { localStorage.setItem(key, value); return { key, value }; } }
};

let saveQueue = Promise.resolve();

window.saveState = function() { 
  if (typeof IS_LICENSED !== 'undefined' && !IS_LICENSED) return Promise.resolve();
  
  state.schemaVersion = 1; 
  state.lastBackupDate = Date.now(); 
  
  saveQueue = saveQueue.then(async () => {
    try { 
      await storageAdapter.set(STORAGE_KEY, JSON.stringify(state)); 
    } catch(e) { 
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || (e.message && e.message.includes('quota'))) { 
        alert(typeof t === 'function' ? t('msg_quota') : 'Espaço Esgotado! O telemóvel não tem memória.'); 
      } else { 
        console.error("Erro ao guardar estado:", e); 
      } 
    } 
  });
  return saveQueue;
};

window.loadState = async function(){
  try{
    if (typeof IS_LICENSED !== 'undefined' && !IS_LICENSED) return;

    const res = await storageAdapter.get(STORAGE_KEY);
    if(res && res.value) {
       state = JSON.parse(res.value);
       
       if (!state.isActivated && ((state.matches && state.matches.length > 0) || (state.roster && state.roster.length > 0) || (state.schedule && state.schedule.length > 0))) {
           state.isActivated = true;
       }

       if(!state.schemaVersion) state.schemaVersion = 1;
       if(state.isActivated === undefined) state.isActivated = false;

       if(!state.roster) state.roster = []; if(!state.matches) state.matches = []; if(!state.trainings) state.trainings = []; if(!state.schedule) state.schedule = []; if(!state.phaseReports) state.phaseReports = {}; if(!state.scoutingBook) state.scoutingBook = {};
       if(!state.tactics) state.tactics = []; if(!state.tacticPaths) state.tacticPaths = []; if(!state.tacticalNotebook) state.tacticalNotebook = []; if(!state.videos) state.videos = []; if(!state.diary) state.diary = []; if(!state.leagues) state.leagues = []; if(!state.fines) state.fines = []; if(!state.staff) state.staff = [];
       if(!state.tacticFormat) state.tacticFormat = 11;
       if(state.trackSubs === undefined) state.trackSubs = true;
       if(state.showFairPlay === undefined) state.showFairPlay = true;
       if(state.enableVideos === undefined) state.enableVideos = true;
       if(state.enableDiary === undefined) state.enableDiary = true;
       if(state.enableLeagues === undefined) state.enableLeagues = true;
       if(state.enableFines === undefined) state.enableFines = false;
       if(state.enableBirthdays === undefined) state.enableBirthdays = false;
       if(state.tacticHalfPitch === undefined) state.tacticHalfPitch = false;
       if(state.keepScreenAwake === undefined) state.keepScreenAwake = false;
       if(state.defaultHalfDuration === undefined) state.defaultHalfDuration = 30;
       if(state.escalao === undefined) state.escalao = '';
       if(!state.teamColor) state.teamColor = '#D9A441';
       if(!state.oppColor) state.oppColor = '#C8493F';
       if(!state.seasonFormat) state.seasonFormat = 'europeu';
       if(!state.currentSeason) state.currentSeason = typeof defaultSeason === 'function' ? defaultSeason() : '24/25';
       if(!state.theme) state.theme = 'original'; if(!state.lang) state.lang = 'pt'; if(!state.myClubName) state.myClubName = '';
       if(!state.rosterSortBy) state.rosterSortBy = 'posicao';
       if(!state.lastBackupDate && state.matches.length > 0) state.lastBackupDate = Date.now() - (8 * 24 * 60 * 60 * 1000); 

       state.roster.forEach(p => {
           if (p.positions !== undefined && p.positions !== null && typeof p.positions !== 'string') {
               p.positions = Array.isArray(p.positions) ? p.positions.join(', ') : '';
           }
           if (!p.positions || p.positions === 'null' || p.positions === 'undefined') {
               p.positions = '';
           }
       });
       
    } else { state.currentSeason = typeof defaultSeason === 'function' ? defaultSeason() : '24/25'; }
  } catch(e) {
    document.body.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#0E211A; color:#F3EFE6; text-align:center; padding:20px; font-family:sans-serif;">
        <span style="font-size:50px; margin-bottom:20px;">⚠️</span>
        <h2 style="color:#C8493F; margin:0 0 10px 0; text-transform:uppercase;">Falha de Leitura</h2>
        <p style="color:#8FA79B; font-size:14px; max-width:400px; line-height:1.5; margin-bottom:20px;">
          Ocorreu um erro a ler a base de dados. Para não perderes os registos, a aplicação foi bloqueada por precaução.
        </p>
        <button style="padding:12px 20px; background:var(--gold); border:none; border-radius:8px; font-weight:bold; cursor:pointer;" onclick="if(typeof exportDataJSON === 'function') exportDataJSON(); else alert('Função ainda não carregada.')">1. Exportar Backup de Emergência</button>
        <button style="padding:12px 20px; background:transparent; border:1px solid var(--muted); color:var(--muted); border-radius:8px; font-weight:bold; cursor:pointer; margin-top:10px;" onclick="window.location.reload()">2. Tentar Novamente</button>
      </div>`;
    throw new Error("Falha Crítica ao carregar dados. Execução interrompida.");
  }
  if(typeof applyTheme === 'function') applyTheme(state.theme || 'original'); 
  window.checkActivationAndRender(); 
};

window.verifyKey = function(identifier, key) {
    const _p = ['Q09B', 'Q0gy', 'Ng==']; 
    const secret = atob(_p.join('')); 
    const str = (identifier || 'COACH').trim().toUpperCase() + secret;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    const expected = Math.abs(hash).toString(16).toUpperCase().substring(0, 6);
    return key.trim().toUpperCase() === expected;
};

window.checkActivationAndRender = function() {
    if (typeof render === 'function') render(); 
};

window.calcularEstatisticaJogador = function(playerId, targetSeason = state.currentSeason, typeFilter = 'todos', phaseFilter = 'todas', tourFilter = 'todas') {
  let golos = 0, assistencias = 0, amarelos = 0, vermelhos = 0, somaAvaliacoes = 0, numAvaliacoes = 0, faltasTreino = 0, jogosTitular = 0, totalSegundosJogo = 0, presencasTreino = 0, jogosConvocado = 0, jogosUtilizado = 0;
  let minutosTreinoCumpridos = 0, minutosTreinoTotais = 0, golosSofridos = 0;
  
  if (typeof IS_LICENSED !== 'undefined' && !IS_LICENSED || !state || !playerId) {
    return { golos:0, assistencias:0, amarelos:0, vermelhos:0, media:'-', faltasTreino:0, presencasTreino:0, totalTreinos:0, minutosTreinoCumpridos:0, minutosTreinoTotais:0, jogosTitular:0, jogosConvocado:0, jogosUtilizado:0, minutos:"0m 0s", totalSegundosJogo:0, golosSofridos:0 };
  }

  const pInfo = state.roster.find(x=>x.id===playerId);
  const isGK = pInfo && typeof pInfo.positions === 'string' && getPosRank(pInfo.positions) === 1;
  
  // 🛡️ DETETAR A DATA DE ENTRADA DO JOGADOR
  const playerJoinDate = (pInfo && pInfo.joinDate) ? pInfo.joinDate : null; 

  const validTrainings = (state.trainings || []).filter(tr => tr && (tr.status === undefined || tr.status === 'completed') && (targetSeason === 'TUDO' || getEntitySeason(tr) === targetSeason));
  
  let totalTreinos = 0;

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
    
    if (calledUpList ? calledUpList.includes(playerId) : usedInMatch) jogosConvocado++;

    if (state.trackSubs && m.finished) {
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
              if (g.gkId === playerId) golosSofridos++;
          } else {
              if (isGK) {
                  if (!state.trackSubs || m.ignoreMinutes || !m.lineup || m.lineup.length === 0) {
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
    // 🛡️ IGNORAR TREINOS ANTES DA DATA DE ENTRADA DO JOGADOR
    if (playerJoinDate && tr.date && tr.date < playerJoinDate) return;

    totalTreinos++;
    const dur = parseInt(tr.duration, 10) || 90;
    minutosTreinoTotais += dur;

    let absReason = null;
    if (Array.isArray(tr.absences)) { absReason = tr.absences.includes(playerId) ? 'injustificada' : null; }
    else if (tr.absences && tr.absences[playerId]) { absReason = tr.absences[playerId]; }

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
    minutos: typeof formatSecsToMinSec === 'function' ? formatSecsToMinSec(totalSegundosJogo) : Math.round(totalSegundosJogo/60) + "'",
    totalSegundosJogo, golosSofridos 
  };
};

window.wipeAllData = function() {
  // 🔒 BARREIRA DA DEMO: PROÍBE O RESET DA APLICAÇÃO
  if (!state.isActivated) {
      modalConfig = { type: 'freemium', message: 'A limpeza total de dados (Reset) está bloqueada na versão de demonstração. Desbloqueia a versão PRO para teres controlo total da tua aplicação!' };
      const root = document.getElementById('modal-root');
      if (root) root.innerHTML = typeof renderModalHTML === 'function' ? renderModalHTML() : '';
      return;
  }

  if (confirm("ATENÇÃO: Vais APAGAR TODOS OS DADOS (Plantel, Jogos, Treinos, etc) da aplicação no teu dispositivo.\n\nTens a certeza absoluta?")) {
    if (confirm("Aviso final: Esta ação é irreversível. Todos os dados serão eliminados agora.")) {
        localStorage.removeItem(STORAGE_KEY);
        window.location.reload();
    }
  }
};