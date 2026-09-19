const STORAGE_KEY = 'coach-app-data-v1';
const usingClaudeStorage = (typeof window.storage !== 'undefined');
const storageAdapter = {
  async get(key){ if(usingClaudeStorage){ try{ return await window.storage.get(key); }catch(e){ return null; } } else { const v = localStorage.getItem(key); return v ? { key, value: v } : null; } },
  async set(key, value){ if(usingClaudeStorage) return await window.storage.set(key, value); else { localStorage.setItem(key, value); return { key, value }; } }
};
// 🛡️ 1. FILA DE GRAVAÇÃO (SAVE QUEUE) - Fim dos atropelamentos de dados
let saveQueue = Promise.resolve();

function saveState() { 
  if (!IS_LICENSED) return Promise.resolve();
  
  state.schemaVersion = 1; // Assinatura da versão para o futuro
  
  saveQueue = saveQueue.then(async () => {
    try { 
      await storageAdapter.set(STORAGE_KEY, JSON.stringify(state)); 
      state.lastBackupDate = Date.now();
    } catch(e) { 
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || (e.message && e.message.includes('quota'))) { 
        alert(t('msg_quota')); 
      } else { 
        console.error("Erro ao guardar estado:", e); 
      } 
    } 
  });
  return saveQueue;
}

// 🛡️ 2. PROTEÇÃO DE CARREGAMENTO & DIREITOS ADQUIRIDOS (GRANDFATHERING)
async function loadState(){
  try{
    if (!IS_LICENSED) return;

    const res = await storageAdapter.get(STORAGE_KEY);
    if(res && res.value) {
       state = JSON.parse(res.value);
       
       // DIREITOS ADQUIRIDOS: Se o treinador já tem dados na memória, é cliente antigo, ativa automaticamente!
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
       if(!state.currentSeason) state.currentSeason = defaultSeason();
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
       
    } else { state.currentSeason = defaultSeason(); }
  } catch(e) {
    // ⚠️ ECRÃ VERMELHO DE EMERGÊNCIA: Protege os dados se houver falha de leitura
    document.body.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#0E211A; color:#F3EFE6; text-align:center; padding:20px; font-family:sans-serif;">
        <span style="font-size:50px; margin-bottom:20px;">⚠️</span>
        <h2 style="color:#C8493F; margin:0 0 10px 0; text-transform:uppercase;">Falha de Leitura</h2>
        <p style="color:#8FA79B; font-size:14px; max-width:400px; line-height:1.5; margin-bottom:20px;">
          Ocorreu um erro a ler a base de dados. Para não perderes os registos, a aplicação foi bloqueada por precaução.
        </p>
        <button style="padding:12px 20px; background:var(--gold); border:none; border-radius:8px; font-weight:bold; cursor:pointer;" onclick="exportDataJSON()">1. Exportar Backup de Emergência</button>
        <button style="padding:12px 20px; background:transparent; border:1px solid var(--muted); color:var(--muted); border-radius:8px; font-weight:bold; cursor:pointer; margin-top:10px;" onclick="window.location.reload()">2. Tentar Novamente</button>
      </div>`;
    throw new Error("Falha Crítica ao carregar dados. Execução interrompida.");
  }
  applyTheme(state.theme || 'original'); 
  checkActivationAndRender(); // Entra no verificador de licença em vez do render direto
}
// 🛡️ 3. SISTEMA DE ATIVAÇÃO POR CHAVE ÚNICA (OFFLINE - OFUSCADO)
function verifyKey(identifier, key) {
    // A palavra secreta está ofuscada e dividida. O curioso só vê lixo informático.
    const _p = ['Q09B', 'Q0gy', 'Ng==']; 
    const secret = atob(_p.join('')); 
    
    const str = identifier.trim().toUpperCase() + secret;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    const expected = Math.abs(hash).toString(16).toUpperCase().substring(0, 6);
    return key.trim().toUpperCase() === expected;
}
window.activateApp = function() {
    const idVal = document.getElementById('act-id').value;
    const kVal = document.getElementById('act-key').value;
    
    if(!idVal || !kVal) { 
        showToast('Preenche os dois campos!'); 
        return; 
    }
    
    if(verifyKey(idVal, kVal)) {
        state.isActivated = true;
        saveState(); // Grava a licença no telemóvel
        render(); // Desbloqueia e carrega o Menu Inicial!
    } else {
        showToast('Chave de Ativação Inválida!');
    }
}

function checkActivationAndRender() {
    if (state.isActivated) {
        render(); // Cliente ativado, a vida segue normal.
    } else {
        // Esconde a barra de navegação para ficar um ecrã limpo
        const nav = document.getElementById('navbar');
        if (nav) nav.style.display = 'none';
        
        // Ecrã de bloqueio compacto e sem scroll
        document.getElementById('app').innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; padding:20px; box-sizing:border-box; background:var(--bg); color:var(--chalk); text-align:center; font-family:-apple-system, sans-serif; margin-top:-20px;">
            
            <div style="width:70px; height:70px; margin-bottom:12px;">${ballIconSvg()}</div>
            <h1 style="color:var(--chalk); margin:0 0 4px 0; font-size:24px; letter-spacing:0.05em;">COACHFOLIO</h1>
            <p style="color:var(--muted); font-size:10px; margin-bottom:24px; text-transform:uppercase; letter-spacing:1px;">App de um Treinador, para Treinadores!</p>
            
            <div style="background:var(--surface); border:1px solid var(--line); border-radius:12px; padding:20px; width:100%; max-width:320px; box-sizing:border-box;">
                <p style="font-size:12px; margin-top:0; margin-bottom:20px;">Para usares a aplicação, introduz a tua chave.</p>
                
                <div style="text-align:left; margin-bottom:12px;">
                    <label style="display:block; font-size:10px; color:var(--muted); text-transform:uppercase; margin-bottom:4px; font-weight:bold;">Telemóvel ou Email</label>
                    <input type="text" id="act-id" placeholder="Ex: 912345678" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--line); background:var(--surface-2); color:var(--chalk); font-size:14px; box-sizing:border-box;">
                </div>
                
                <div style="text-align:left; margin-bottom:20px;">
                    <label style="display:block; font-size:10px; color:var(--muted); text-transform:uppercase; margin-bottom:4px; font-weight:bold;">Chave de Ativação</label>
                    <input type="text" id="act-key" placeholder="Ex: A4F9B2" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--line); background:var(--surface-2); color:var(--chalk); font-size:14px; box-sizing:border-box; text-transform:uppercase;">
                </div>
                
                <button style="width:100%; padding:12px; background:var(--gold); color:#000; border:none; border-radius:8px; font-weight:bold; font-size:14px; cursor:pointer;" onclick="activateApp()">Desbloquear</button>
            </div>
          </div>
        `;
    }
}