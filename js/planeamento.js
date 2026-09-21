window.uiUpdateSearch = function(val){ matchSearchQuery = val; render(); const el = document.getElementById('match-search-input'); if(el){ el.focus(); el.setSelectionRange(el.value.length, el.value.length); } };

window.toggleStaffCallup = function(schId, stId) {
  const s = state.schedule.find(x => x.id === schId);
  if (s) {
    if (!s.staffCallup) s.staffCallup = [];
    if (s.staffCallup.includes(stId)) s.staffCallup = s.staffCallup.filter(x => x !== stId);
    else s.staffCallup.push(stId);
    saveState();
    render();
  }
};

window.exportCallupPDF = function(schId) {
  const s = state.schedule.find(x => x.id === schId);
  if (!s) return;

  const dateStr = s.date.split('-').reverse().join('/');
  const timeParts = s.time.split(':');
  let d = new Date();
  d.setHours(parseInt(timeParts[0], 10), parseInt(timeParts[1], 10));
  d.setHours(d.getHours() - 1);
  const meetTime = String(d.getHours()).padStart(2, '0') + 'h' + String(d.getMinutes()).padStart(2, '0');

  let compLabel = s.type === 'torneio' 
    ? `Torneio: ${s.tournamentName}${s.phase ? ' - ' + s.phase : ''}${s.matchday ? ' (Jornada ' + s.matchday + ')' : ''}` 
    : (s.type === 'campeonato' ? `Campeonato${s.phase ? ' - ' + s.phase : ''}${s.matchday ? ' (Jornada ' + s.matchday + ')' : ''}` : 'Jogo Amigável');

  let locLabel = s.location === 'casa' ? 'CASA' : 'FORA';
  let matchTitle = s.location === 'casa' ? `${getMyClub()} 🆚 ${s.opponent}` : `${s.opponent} 🆚 ${getMyClub()}`;

  const called = sortPlayerObjs(eligiblePlayers().filter(p => s.callup.includes(p.id)));
  let rowsHtml = '';
  if (called.length === 0) {
    rowsHtml = '<tr><td colspan="3" style="text-align:center; padding:15px;">Nenhum jogador selecionado.</td></tr>';
  } else {
    called.forEach((p, idx) => {
      const numVal = (p.number !== null && p.number !== undefined && p.number !== '') ? p.number : (idx + 1);
      rowsHtml += `
        <tr>
          <td style="text-align:center; font-weight:bold; width:45px;">${numVal}</td>
          <td style="text-align:left; font-weight:bold; padding-left:12px;">${p.name || 'Sem Nome'}</td>
          <td style="width:200px;"></td>
        </tr>`;
    });
  }

  const selectedStaffIds = s.staffCallup || [];
  const staffList = (state.staff || []).filter(st => selectedStaffIds.includes(st.id));
  let staffRowsHtml = '';
  if (staffList.length === 0) {
    staffRowsHtml = `
      <tr>
        <td style="text-align:left; font-weight:bold; padding-left:12px;">Equipa Técnica / Delegado</td>
        <td style="text-align:center; color:#666;">Treinador / Responsável</td>
        <td style="width:200px;"></td>
      </tr>`;
  } else {
    staffList.forEach(st => {
      staffRowsHtml += `
        <tr>
          <td style="text-align:left; font-weight:bold; padding-left:12px;">${st.name}</td>
          <td style="text-align:center; font-weight:600; color:#444;">${st.role || 'Equipa Técnica'}</td>
          <td style="width:200px;"></td>
        </tr>`;
    });
  }

  let html = `
    <div class="print-card" style="padding:20px; font-family:-apple-system, sans-serif;">
      <div class="print-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:15px;">
        <div>
          <h1 style="font-size:22px; margin:0; text-transform:uppercase; color:#000;">CONVOCATÓRIA OFICIAL</h1>
          <p style="font-size:20px; font-weight:bold; margin-top:5px; color:#000;">${matchTitle}</p>
          <p style="font-size:13px; color:#444; margin-top:2px;">${compLabel} | Local: <b>${locLabel}</b></p>
        </div>
        ${typeof getClubLogoHtml === 'function' ? getClubLogoHtml() : ''}
      </div>

      <div style="display:flex; justify-content:space-around; align-items:center; background:#EEE; padding:12px 15px; border-radius:6px; margin-bottom:20px; border:1px solid #DDD; font-size:14px;">
        <div><b>📅 Data do Jogo:</b> ${dateStr}</div>
        <div><b>📍 Hora de Comparência:</b> <span style="font-size:16px; font-weight:bold; color:#000;">${meetTime}</span></div>
      </div>

      <h3 style="font-size:13px; font-weight:bold; margin-bottom:10px; text-transform:uppercase; border-bottom:1px solid #000; padding-bottom:3px;">Atletas Convocados (${called.length})</h3>
      <table style="width:100%; border-collapse:collapse; font-size:12px; margin-bottom:20px;">
        <thead>
          <tr>
            <th style="width:45px; text-align:center;">Núm</th>
            <th style="text-align:left; padding-left:12px;">Nome do Atleta</th>
            <th style="width:200px; text-align:center;">Assinatura / Rubrica</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <h3 style="font-size:13px; font-weight:bold; margin-bottom:10px; text-transform:uppercase; border-bottom:1px solid #000; padding-bottom:3px;">Equipa Técnica Convocada (${staffList.length})</h3>
      <table style="width:100%; border-collapse:collapse; font-size:12px;">
        <thead>
          <tr>
            <th style="text-align:left; padding-left:12px;">Nome</th>
            <th style="text-align:center;">Cargo / Função</th>
            <th style="width:200px; text-align:center;">Assinatura / Rubrica</th>
          </tr>
        </thead>
        <tbody>
          ${staffRowsHtml}
        </tbody>
      </table>

      <div style="margin-top:30px; display:flex; justify-content:space-between; align-items:flex-end;">
        <div style="font-size:10px; color:#666;">
          <p style="margin:2px 0;">• Comparência obrigatória à hora marcada com o equipamento oficial.</p>
          <p style="margin:2px 0;">• Em caso de força maior, avisar a equipa técnica com antecedência.</p>
        </div>
        <div style="text-align:center; width:200px; border-top:1px solid #000; padding-top:5px; font-size:11px; font-weight:bold;">
          A Direção / Equipa Técnica
        </div>
      </div>
    </div>`;

  document.getElementById('print-area').innerHTML = html;
  if(typeof window.openSafePrintModal === 'function') window.openSafePrintModal();
};

window.openScouting = function(schId) {
  let s = state.schedule.find(x => x.id === schId);
  if (!s) {
    const m = state.matches.find(x => x.id === schId || (x.originalSchedule && x.originalSchedule.id === schId));
    if (m) {
      if (!m.originalSchedule) m.originalSchedule = { id: m.id, opponent: m.opponent };
      s = m.originalSchedule;
    }
  }

  if (s) {
    if (!s.scouting || (!s.scouting.system && !s.scouting.keyPlayers && !s.scouting.gamePlan)) {
      if (!state.scoutingBook) state.scoutingBook = {};
      const oppKey = (s.opponent || '').trim().toLowerCase();
      const bookEntry = state.scoutingBook[oppKey];

      if (bookEntry && (bookEntry.system || bookEntry.keyPlayers || bookEntry.gamePlan)) {
        s.scouting = JSON.parse(JSON.stringify(bookEntry));
        showToast('Ficha de Scouting deste adversário carregada! 👁️');
      } else {
        s.scouting = { system: '', block: 'Médio', buildUp: 'Apoiada desde trás', keyPlayers: '', setPieces: '', gamePlan: '' };
      }
    }

    modalConfig = { type: 'scouting', schId: s.id };
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = typeof renderModalHTML === 'function' ? renderModalHTML() : '';
  } else {
    showToast('Não foi possível abrir a ficha de Scouting.');
  }
};

window.saveScoutingData = function(schId) {
  let s = state.schedule.find(x => x.id === schId);
  if (!s) {
    const m = state.matches.find(x => x.id === schId || (x.originalSchedule && x.originalSchedule.id === schId));
    if (m) {
      if (!m.originalSchedule) m.originalSchedule = { id: m.id, opponent: m.opponent };
      s = m.originalSchedule;
    }
  }

  if (!s) return;
  if (!s.scouting) s.scouting = {};

  s.scouting.system = escapeHTML(document.getElementById('scout-system')?.value || '');
  s.scouting.block = document.getElementById('scout-block')?.value || 'Médio';
  s.scouting.buildUp = document.getElementById('scout-buildup')?.value || 'Apoiada desde trás';
  s.scouting.keyPlayers = escapeHTML(document.getElementById('scout-keyplayers')?.value || '');
  s.scouting.setPieces = escapeHTML(document.getElementById('scout-setpieces')?.value || '');
  s.scouting.gamePlan = escapeHTML(document.getElementById('scout-gameplan')?.value || '');

  if (!state.scoutingBook) state.scoutingBook = {};
  const oppKey = (s.opponent || '').trim().toLowerCase();
  if (oppKey) state.scoutingBook[oppKey] = JSON.parse(JSON.stringify(s.scouting));

  saveState(); 
  if(typeof closeModal === 'function') closeModal();
  showToast('Análise de Scouting gravada com sucesso! 👁️');
  render(); 
};

window.deleteScoutingData = function(schId) {
  const s = state.schedule.find(x => x.id === schId);
  if (!s || !s.scouting) return;
  
  if (confirm('Tem a certeza que deseja eliminar a análise de scouting deste jogo?')) {
    delete s.scouting;
    saveState();
    if(typeof closeModal === 'function') closeModal();
    showToast('Análise de scouting eliminada! 🗑️');
    render();
  }
};

window.exportScoutingPDF = function(schId) {
  let s = state.schedule.find(x => x.id === schId);
  if (!s) {
    const m = state.matches.find(x => x.id === schId || (x.originalSchedule && x.originalSchedule.id === schId));
    if (m) {
      if (!m.originalSchedule) m.originalSchedule = { id: m.id, opponent: m.opponent };
      s = m.originalSchedule;
    }
  }

  if (!s || !s.scouting) {
    showToast('Sem dados de scouting para exportar.');
    return;
  }

  const sc = s.scouting;
  const printArea = document.getElementById('print-area');

  let html = `
  <div class="print-card" style="padding:24px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#111827;">
    <div class="print-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #0E211A; padding-bottom:12px; margin-bottom:18px;">
      <div>
        <h1 style="font-size:20px; margin:0; text-transform:uppercase; letter-spacing:0.05em; color:#0E211A; font-weight:800;">RELATÓRIO TÁTICO DE SCOUTING</h1>
        <p style="font-size:18px; font-weight:800; margin:4px 0 0 0; color:#D9A441;">Adversário: ${s.opponent || 'N/D'}</p>
        <p style="font-size:11px; color:#4B5563; margin-top:2px;">Clube: <b>${getClubAndEscalao()}</b> &nbsp;|&nbsp; Época: <b>${s.season || state.currentSeason}</b></p>
      </div>
      ${typeof getClubLogoHtml === 'function' ? getClubLogoHtml() : ''}
    </div>

    <!-- PAINEL DE TÁTICA E BLOCO -->
    <div style="background:#F3F4F6; border:1px solid #E5E7EB; border-radius:8px; padding:12px; margin-bottom:18px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; font-size:11px; text-align:center; page-break-inside:avoid;">
      <div>
        <div style="font-size:9px; color:#6B7280; font-weight:800; text-transform:uppercase;">Sistema Tático Base</div>
        <div style="font-size:15px; font-weight:800; color:#0E211A; margin-top:2px;">${sc.system || 'N/D'}</div>
      </div>
      <div>
        <div style="font-size:9px; color:#6B7280; font-weight:800; text-transform:uppercase;">Bloco Defensivo</div>
        <div style="font-size:15px; font-weight:800; color:#0E211A; margin-top:2px;">${sc.block || 'Médio'}</div>
      </div>
      <div>
        <div style="font-size:9px; color:#6B7280; font-weight:800; text-transform:uppercase;">Construção / Saída</div>
        <div style="font-size:15px; font-weight:800; color:#0E211A; margin-top:2px;">${sc.buildUp || 'Apoiada'}</div>
      </div>
    </div>

    <!-- JOGADORES CHAVE / ALERTAS -->
    <div style="background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px; padding:12px; margin-bottom:16px; page-break-inside:avoid;">
      <h3 style="font-size:11px; font-weight:800; margin:0 0 6px 0; border-bottom:1px solid #D1D5DB; padding-bottom:3px; text-transform:uppercase; color:#0E211A;">⚠️ Jogadores-Chave & Alertas Individuais</h3>
      <div style="font-size:11px; line-height:1.5; color:#1F2937; white-space:pre-wrap;">${sc.keyPlayers || 'Sem alertas individuais registados.'}</div>
    </div>

    <!-- BOLAS PARADAS -->
    <div style="background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px; padding:12px; margin-bottom:16px; page-break-inside:avoid;">
      <h3 style="font-size:11px; font-weight:800; margin:0 0 6px 0; border-bottom:1px solid #D1D5DB; padding-bottom:3px; text-transform:uppercase; color:#0E211A;">🎯 Bolas Paradas (Ofensivas / Defensivas)</h3>
      <div style="font-size:11px; line-height:1.5; color:#1F2937; white-space:pre-wrap;">${sc.setPieces || 'Sem observações de bolas paradas registadas.'}</div>
    </div>

    <!-- PLANO DE JOGO -->
    <div style="background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px; padding:12px; margin-bottom:18px; page-break-inside:avoid;">
      <h3 style="font-size:11px; font-weight:800; margin:0 0 6px 0; border-bottom:1px solid #D1D5DB; padding-bottom:3px; text-transform:uppercase; color:#0E211A;">💡 Estratégia & Plano de Jogo</h3>
      <div style="font-size:11px; line-height:1.5; color:#1F2937; white-space:pre-wrap;">${sc.gamePlan || 'Sem plano de jogo especificado.'}</div>
    </div>

    <div style="margin-top:24px; display:flex; justify-content:space-between; align-items:flex-end;">
      <div style="font-size:10px; color:#6B7280;">• Análise Tática de Observação — Coachfolio v3.5</div>
      <div style="text-align:center; width:200px; border-top:1.5px solid #111827; padding-top:4px; font-size:11px; font-weight:bold;">O Observador / Treinador</div>
    </div>
  </div>`;

  printArea.innerHTML = html;
  if(typeof window.openSafePrintModal === 'function') window.openSafePrintModal();
};

function renderCalendario(){
  if(schedulingNew){
    if(!schForm.date) schForm.date = new Date().toISOString().slice(0,10);
    if(schForm.numberOfHalves === undefined) schForm.numberOfHalves = 2;
    if(schForm.halfDuration === undefined) schForm.halfDuration = state.defaultHalfDuration || 30;
    if(!schForm.games || schForm.games.length===0) schForm.games = [{id: uid(), phase: '', matchday: '', opp: '', date: schForm.date, time: '09:00'}];
    
    let batchHtml = '';
    if (schForm.isBatch) {
        batchHtml = `<div class="card"><div class="field"><label>${t('sch_tour_name')}</label><input type="text" placeholder="${t('sch_tour_ph')}" value="${schForm.tournamentName||''}" oninput="schForm.tournamentName=this.value"></div>
        <div class="grid-btns"><div class="field" style="margin-bottom:0;"><label>Nº de Partes</label><div class="seg" style="margin-top:0;"><div class="seg-btn ${schForm.numberOfHalves===1?'active':''}" onclick="schForm.numberOfHalves=1; render()">1 Parte</div><div class="seg-btn ${schForm.numberOfHalves!==1?'active':''}" onclick="schForm.numberOfHalves=2; render()">2 Partes</div></div></div><div class="field" style="margin-bottom:0;"><label>Tempo/Parte (Min)</label><input type="number" value="${schForm.halfDuration}" oninput="schForm.halfDuration=parseInt(this.value, 10)||30"></div></div>
        <div class="field" style="margin-top:12px;"><label>${t('sch_loc_gen')}</label><div class="seg"><div class="seg-btn ${schForm.loc==='casa'?'active':''}" onclick="schForm.loc='casa'; render()">${t('match_home')}</div><div class="seg-btn ${schForm.loc==='fora'?'active':''}" onclick="schForm.loc='fora'; render()">${t('match_away')}</div></div></div></div><div class="section-title">${t('sch_tour_games')}</div>
        ${schForm.games.map((g, i) => `<div class="card" style="background:var(--surface-2); border-color:var(--gold-dim); margin-bottom:8px; padding:12px;"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;"><b style="font-size:13px; color:var(--gold);">${t('sch_game')}${i+1}</b><button class="quick-del" onclick="uiRemoveTournamentGame('${g.id}')">✕</button></div><div class="grid-btns" style="margin-bottom:8px;"><div class="field" style="margin-bottom:0;"><input type="text" placeholder="${t('sch_phase_ph')}" value="${g.phase}" oninput="uiUpdateTournamentGame('${g.id}', 'phase', this.value)"></div><div class="field" style="margin-bottom:0;"><input type="text" placeholder="${t('sch_matchday_ph')}" value="${g.matchday}" oninput="uiUpdateTournamentGame('${g.id}', 'matchday', this.value)"></div></div><div class="field" style="margin-bottom:8px;"><input type="text" placeholder="${t('sch_opp')}" value="${g.opp}" oninput="uiUpdateTournamentGame('${g.id}', 'opp', this.value)"></div><div class="grid-btns"><div class="field" style="margin-bottom:0;"><input type="date" value="${g.date}" oninput="uiUpdateTournamentGame('${g.id}', 'date', this.value)"></div><div class="field" style="margin-bottom:0;"><input type="time" value="${g.time}" oninput="uiUpdateTournamentGame('${g.id}', 'time', this.value)"></div></div></div>`).join('')}<button class="btn btn-outline" style="width:100%; margin-bottom:16px; border-style:dashed;" onclick="uiAddTournamentGame()">${t('sch_add_game')}</button>`;
    } else {
        batchHtml = `<div class="card"><div class="field"><label>${t('sch_opp')}</label><input id="sch-opp" type="text" placeholder="${t('sch_opp_ph')}" value="${schForm.opp}" oninput="schForm.opp=this.value"></div><div class="grid-btns"><div class="field"><label>${t('sch_date')}</label><input id="sch-date" type="date" value="${schForm.date}" oninput="schForm.date=this.value"></div><div class="field"><label>${t('sch_time')}</label><input id="sch-time" type="time" value="${schForm.time}" oninput="schForm.time=this.value"></div></div>
        <div class="grid-btns"><div class="field" style="margin-bottom:0;"><label>Nº de Partes</label><div class="seg" style="margin-top:0;"><div class="seg-btn ${schForm.numberOfHalves===1?'active':''}" onclick="schForm.numberOfHalves=1; render()">1 Parte</div><div class="seg-btn ${schForm.numberOfHalves!==1?'active':''}" onclick="schForm.numberOfHalves=2; render()">2 Partes</div></div></div><div class="field" style="margin-bottom:0;"><label>Tempo/Parte (Min)</label><input type="number" value="${schForm.halfDuration}" oninput="schForm.halfDuration=parseInt(this.value, 10)||30"></div></div>
        <div class="field" style="margin-top:12px;"><label>${t('sch_loc_gen')}</label><div class="seg"><div class="seg-btn ${schForm.loc==='casa'?'active':''}" onclick="schForm.loc='casa'; render()">${t('match_home')}</div><div class="seg-btn ${schForm.loc==='fora'?'active':''}" onclick="schForm.loc='fora'; render()">${t('match_away')}</div></div></div><div class="field" style="margin-bottom: ${schForm.type!=='amigavel' ? '12px' : '0'};"><label>${t('sch_type')}</label><div class="seg"><div class="seg-btn ${schForm.type==='amigavel'?'active':''}" onclick="schForm.type='amigavel'; render()">${t('sch_friendly')}</div><div class="seg-btn ${schForm.type==='campeonato'?'active':''}" onclick="schForm.type='campeonato'; render()">${t('sch_champ')}</div><div class="seg-btn ${schForm.type==='torneio'?'active':''}" onclick="schForm.type='torneio'; render()">${t('sch_tour')}</div></div></div>${schForm.type === 'torneio' ? `<div class="field" style="margin-bottom:12px;"><label>${t('sch_tour_name')}</label><input type="text" placeholder="${t('sch_tour_ph')}" value="${schForm.tournamentName||''}" oninput="schForm.tournamentName=this.value"></div>` : ''}${schForm.type === 'torneio' || schForm.type === 'campeonato' ? `<div class="grid-btns"><div class="field" style="margin-bottom:0;"><label>${t('sch_phase')}</label><input type="text" placeholder="${t('sch_phase_ph')}" value="${schForm.phase||''}" oninput="schForm.phase=this.value"></div><div class="field" style="margin-bottom:0;"><label>${t('sch_matchday')}</label><input type="text" placeholder="${t('sch_matchday_ph')}" value="${schForm.matchday||''}" oninput="schForm.matchday=this.value"></div></div>` : ''}</div>`;
    }

    return `${topbarHtml(editingSchId ? t('sch_edit') : t('sch_title'))}${renderPlanSubHeader()}
      ${!editingSchId ? `<div class="seg" style="margin-bottom:16px;"><div class="seg-btn ${!schForm.isBatch?'active':''}" onclick="schForm.isBatch=false; render()">${t('sch_single')}</div><div class="seg-btn ${schForm.isBatch?'active':''}" onclick="schForm.isBatch=true; render()">${t('sch_multi')}</div></div>` : ''}
      ${batchHtml}
      <button class="btn btn-gold" style="width:100%; margin-bottom:10px;" onclick="uiSaveSchedule()">${t('sch_save')}</button><button class="btn btn-outline" style="width:100%;" onclick="schedulingNew=false; editingSchId=null; render()">${t('cancel')}</button>`;
  }
  
  const currentSch = state.schedule.filter(s => (s.season || state.currentSeason) === state.currentSeason);
  
  let html = `${topbarHtml(t('hub_plan_title'))}${renderPlanSubHeader()}<button class="btn btn-gold" style="width:100%; margin-bottom:14px;" onclick="schForm={isBatch:false, opp:'', date:'', time:'09:00', type:'amigavel', loc:'casa', phase:'', matchday:'', tournamentName:'', games:[], numberOfHalves: 2, halfDuration: state.defaultHalfDuration||30 }; editingSchId=null; schedulingNew=true; render()">${t('sch_new')}</button>`;
  
  if(currentSch.length === 0) {
      html += `<div class="empty">${t('sch_none')}</div>`;
      return html;
  }

  const schCards = currentSch.map(s => { 
      const open = expandedSchedule === s.id; 
      
      // 🛡️ CORREÇÃO E EXTRAÇÃO DA LÓGICA DE CLASSE "CASA" E "FORA" 
      const isHomeMatch = (s.location === 'casa' || !s.location);
      const locLabel = isHomeMatch ? t('match_home') : t('match_away');
      const badgeClass = isHomeMatch ? 'casa' : 'fora';

      let h2hHtml = '';
      if(s.opponent && s.opponent.trim() !== '') {
          const oppQuery = s.opponent.trim().toLowerCase();
          const h2hMatches = (state.matches || []).filter(x => x.finished && (x.opponent||'').trim().toLowerCase() === oppQuery).sort((a,b) => new Date(b.date) - new Date(a.date));
          
          if(h2hMatches.length > 0) {
              let w=0, d=0, l=0;
              h2hMatches.forEach(x => {
                  const sc = (x.goals||[]).filter(g=>g.type==='scored').length;
                  const co = (x.goals||[]).filter(g=>g.type==='conceded').length;
                  if(sc>co) w++; else if(sc===co) d++; else l++;
              });
              
              let historyRows = '';
              h2hMatches.slice(0, 3).forEach(x => {
                   const sc = (x.goals||[]).filter(g=>g.type==='scored').length;
                   const co = (x.goals||[]).filter(g=>g.type==='conceded').length;
                   const res = sc > co ? 'V' : (sc === co ? 'E' : 'D');
                   const color = res === 'V' ? 'var(--green)' : (res === 'E' ? 'var(--yellow)' : 'var(--red)');
                   const isHome = x.location === 'casa';
                   historyRows += `
                   <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px dashed var(--line); font-size:11px;">
                     <span style="color:var(--muted);">${x.date.split('-').reverse().join('/')} <span style="font-size:9px;">(${isHome?'CASA':'FORA'})</span></span>
                     <span style="color:${color}; font-weight:bold; font-family:monospace; font-size:13px;">${res} ${sc}-${co}</span>
                   </div>`;
              });
              
              let extraTxt = h2hMatches.length > 3 ? `<div style="font-size:9px; color:var(--muted); text-align:center; margin-top:6px;">+ ${h2hMatches.length - 3} jogo(s) anterior(es)</div>` : '';

              const isH2HOpen = window.expandedH2H === s.id;
              const bgStyle = isH2HOpen ? 'var(--surface)' : 'transparent';
              const borderStyle = isH2HOpen ? '1px solid var(--line)' : 'none';
              const arrowDir = isH2HOpen ? '▼' : '▶';

              h2hHtml = `
              <div style="margin-bottom:14px; background:var(--surface-2); border:1px solid var(--line); border-radius:8px; overflow:hidden;">
                  <div style="padding:10px 12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; background:${bgStyle}; border-bottom:${borderStyle};" onclick="event.stopPropagation(); window.expandedH2H = (window.expandedH2H === '${s.id}' ? null : '${s.id}'); render();">
                      <div style="display:flex; align-items:center; gap:8px;">
                          <span style="font-size:11px; color:var(--gold); font-weight:bold; text-transform:uppercase;">⚔️ Histórico vs ${s.opponent}</span>
                          <span style="font-size:10px; font-weight:bold; color:var(--chalk); background:var(--surface); padding:2px 6px; border-radius:4px;">${w}V ${d}E ${l}D</span>
                      </div>
                      <span style="color:var(--gold); font-size:12px; transition:transform 0.2s;">${arrowDir}</span>
                  </div>`;
                  
              if (isH2HOpen) {
                  h2hHtml += `<div style="padding:12px; animation: fadeIn 0.2s ease-in-out;">${historyRows}${extraTxt}</div>`;
              }
              h2hHtml += `</div>`;
          }
      }

      let typeLabel = '';
      if (s.type === 'torneio') {
          typeLabel = `<span style="color:var(--gold); font-size:11px; display:block; text-transform:uppercase; margin-bottom:2px;">🏆 ${s.tournamentName}${s.phase?' - '+s.phase:''}${s.matchday?' (Jornada '+s.matchday+')':''}</span>`;
      } else if (s.type === 'campeonato' && s.phase) {
          typeLabel = `<span style="color:var(--gold); font-size:11px; display:block; text-transform:uppercase; margin-bottom:2px;">🏆 ${s.phase}${s.matchday?' (Jornada '+s.matchday+')':''}</span>`;
      }

      return `
      <div class="card match-item" onclick="if(!event.target.closest('button') && !event.target.closest('.chip')) { expandedSchedule = expandedSchedule==='${s.id}' ? null : '${s.id}'; render(); }">
        <div class="match-head-row">
            <div class="match-head" style="flex:1;">
                <div>
                    <div class="opp">
                        ${typeLabel}
                        ${s.opponent} <span class="badge-loc ${badgeClass}">${locLabel}</span>
                    </div>
                    <div class="date">${s.date.split('-').reverse().join('/')} às ${s.time} | ${s.numberOfHalves || 2}P de ${s.halfDuration || state.defaultHalfDuration || 30}'</div>
                </div>
            </div>
            <div style="display:flex; gap:6px;">
                <button class="quick-del" style="color:var(--muted);" onclick="event.stopPropagation(); editSchedule('${s.id}')" title="${t('edit')}"><svg style="width:16px; height:16px; transform:translateY(2px);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                <button class="quick-del" style="color:var(--muted);" onclick="event.stopPropagation(); duplicateSchedule('${s.id}')" title="Duplicar">📑</button>
                <button class="quick-del" style="color:var(--gold);" onclick="event.stopPropagation(); startScheduledMatch('${s.id}')" title="Iniciar">▶</button>
                <button class="quick-del" onclick="event.stopPropagation(); askConfirm('${t('msg_del_sch')}', () => deleteSchedule('${s.id}'))" title="${t('del')}">🗑</button>
            </div>
        </div>
        ${open ? `<div class="goal-list" style="margin-top:12px;">
            ${h2hHtml}
            <div class="panel-title" style="margin-bottom:8px;">🏃 ${t('sch_callup')} (${s.callup.length})</div>
            <div class="grid-btns cols-4">${eligiblePlayers().map(p=>`<div class="chip chip-sm ${s.callup.includes(p.id)?'active-green':''}" onclick="event.stopPropagation(); window.toggleCallup('${s.id}', '${p.id}')">${playerLabel(p)}</div>`).join('')}</div>
            <div class="panel-title" style="margin-top:12px; margin-bottom:8px; color:var(--gold);">👔 Equipa Técnica Presença</div>
            <div class="grid-btns cols-4">${(state.staff || []).map(st => `<div class="chip chip-sm ${(s.staffCallup || []).includes(st.id)?'active-green':''}" onclick="event.stopPropagation(); window.toggleStaffCallup('${s.id}', '${st.id}')">${st.name}</div>`).join('')}</div>
            <div class="btn-row" style="margin-top:12px;">
                <button class="btn btn-green" style="font-size:11px; padding:10px;" onclick="event.stopPropagation(); window.copyCallup('${s.id}')">Enviar WhatsApp 📋</button>
                <button class="btn btn-outline" style="font-size:11px; padding:10px;" onclick="event.stopPropagation(); window.exportCallupPDF('${s.id}')">📄 Imprimir PDF</button>
                <button class="btn btn-ghost" style="font-size:11px; padding:10px; color:var(--gold); border:1px solid var(--gold-dim);" onclick="event.stopPropagation(); window.openScouting('${s.id}')">👁️ Scouting</button>
                ${s.scouting ? `<button class="btn btn-outline" style="font-size:11px; padding:10px;" onclick="event.stopPropagation(); window.exportScoutingPDF('${s.id}')">📄 PDF Scouting</button>` : ''}
                <button class="btn btn-ghost" style="font-size:11px; padding:10px;" onclick="event.stopPropagation(); startScheduledMatch('${s.id}')">${t('sch_start')}</button>
            </div>
        </div>` : ''}
      </div>`; 
  }).join('');
  
  html += schCards;
  return html;
}

window.uiSaveTraining = function() {
  if (!trainingForm) return;

  const date = trainingForm.date || new Date().toISOString().slice(0, 10);
  const duration = parseInt(trainingForm.duration, 10) || 90;
  const plan = (trainingForm.plan != null ? trainingForm.plan : trainingForm.notes) || '';
  const obs = trainingForm.obs || '';
  const exercises = trainingForm.exercises ? JSON.parse(JSON.stringify(trainingForm.exercises)) : [];

  let absencesObj = {};
  if (trainingForm.absences) {
    if (Array.isArray(trainingForm.absences)) {
      trainingForm.absences.forEach(id => absencesObj[id] = 'injustificada');
    } else {
      absencesObj = { ...trainingForm.absences };
    }
  }

  const customMinsObj = trainingForm.customMinutes ? { ...trainingForm.customMinutes } : {};

  if (trainingForm.id) {
    const idx = state.trainings.findIndex(t => t.id === trainingForm.id);
    if (idx !== -1) {
      state.trainings[idx] = {
        ...state.trainings[idx],
        date: date,
        duration: duration,
        plan: plan,
        obs: obs,
        notes: plan,
        exercises: exercises,
        absences: absencesObj,
        customMinutes: customMinsObj,
        status: state.trainings[idx].status || 'pending'
      };
    }
  } else {
    const newTr = {
      id: uid(),
      season: state.currentSeason,
      date: date,
      duration: duration,
      plan: plan,
      obs: obs,
      notes: plan,
      exercises: exercises,
      status: 'pending',
      absences: absencesObj,
      customMinutes: customMinsObj
    };
    state.trainings.push(newTr);
  }

  trainingForm = null;
  saveState();
  render();
};

window.setAbsenceReason = function(pId, reason){
  if(!trainingForm.absences) trainingForm.absences = {};
  if(!trainingForm.customMinutes) trainingForm.customMinutes = {};

  if(reason === 'presente'){
    delete trainingForm.absences[pId];
    delete trainingForm.customMinutes[pId];
  } else {
    trainingForm.absences[pId] = reason;
  }
  render();
};

window.setPlayerCustomMinutes = function(pId, mins){
  if(!trainingForm.customMinutes) trainingForm.customMinutes = {};
  const parsed = parseInt(mins, 10);
  if(isNaN(parsed) || parsed < 0) delete trainingForm.customMinutes[pId];
  else trainingForm.customMinutes[pId] = parsed;
};

window.editTraining = function(trId) {
  const tr = state.trainings.find(t => t.id === trId);
  if (!tr) return;
  
  trainingForm = {
    id: tr.id,
    date: tr.date,
    duration: tr.duration || 90,
    plan: tr.plan || tr.notes || '',
    obs: tr.obs || '',
    notes: tr.plan || tr.notes || '',
    exercises: tr.exercises ? JSON.parse(JSON.stringify(tr.exercises)) : [], 
    absences: Array.isArray(tr.absences) 
      ? tr.absences.reduce((acc, id) => { acc[id] = 'injustificada'; return acc; }, {}) 
      : (tr.absences ? { ...tr.absences } : {}),
    customMinutes: tr.customMinutes ? { ...tr.customMinutes } : {}
  };
  
  render();
};

window.deleteTraining = function(id){ state.trainings = state.trainings.filter(t=>t.id!==id); saveState(); render(); };

window.quickCompleteTraining = function(id) {
  const tr = state.trainings.find(t => t.id === id);
  if (!tr) return;

  askConfirm("Concluir este treino? (Os atletas ficarão todos como Presentes).", () => {
    tr.status = 'completed';
    saveState();
    render();
    showToast("Treino concluído com sucesso! 🟢");
  }, 'btn-green'); 
};

function renderTreinos(){
  if(trainingForm){ 
    const reasons = [
      { id: 'injustificada', label: '🔴 Injustificada' },
      { id: 'justificada', label: '🟡 Justificada' },
      { id: 'atrasado', label: '🕐 Atrasado' },
      { id: 'lesao', label: '🩹 Lesão / Médico' },
      { id: 'castigo', label: '🟥 Castigo' },
      { id: 'dispensado', label: '⚪ Dispensado' }
    ];

    const baseDuration = parseInt(trainingForm.duration, 10) || 90;

    if (trainingForm.showPlan === undefined) {
        trainingForm.showPlan = false;
    }

    return `${topbarHtml(trainingForm.id ? '✏️ Editar Treino' : t('tr_new'))}${renderPlanSubHeader()}
      <div class="card">
        <div class="grid-btns">
          <div class="field" style="margin-bottom:0;"><label>${t('sch_date')}</label><input id="tr-date-input" type="date" value="${trainingForm.date}" oninput="trainingForm.date=this.value"></div>
          <div class="field" style="margin-bottom:0;"><label>Duração Total (Min)</label><input id="tr-duration-input" type="number" inputmode="numeric" pattern="[0-9]*" min="15" max="300" step="5" placeholder="Ex: 90" value="${trainingForm.duration || 90}" onclick="this.select()" oninput="trainingForm.duration=parseInt(this.value,10)||'';"></div>
        </div>

        <div style="margin-top:14px; background:var(--surface-2); border:1px solid var(--line); border-radius:8px; overflow:hidden;">
            <div style="padding:10px 12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; background:${trainingForm.showPlan ? 'var(--surface)' : 'transparent'}; border-bottom:${trainingForm.showPlan ? '1px solid var(--line)' : 'none'};" onclick="trainingForm.showPlan = !trainingForm.showPlan; render();">
                <span style="font-size:11px; color:var(--gold); font-weight:bold; text-transform:uppercase;">📋 Plano & Exercícios</span>
                <span style="color:var(--gold); font-size:12px; transition:transform 0.2s;">${trainingForm.showPlan ? '▼' : '▶'}</span>
            </div>
            
            ${trainingForm.showPlan ? `
            <div style="padding:12px; animation: fadeIn 0.2s ease-in-out;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <label style="font-size:11px; color:var(--chalk); font-weight:bold; text-transform:uppercase; margin:0;">🏋️ Exercícios do Caderno</label>
                  <button class="btn btn-gold" style="flex:none; width:auto; font-size:10px; padding:4px 8px;" onclick="openExerciseSelectorModal()">➕ Importar</button>
                </div>

                ${(() => {
                  const sumExercises = (trainingForm.exercises || []).reduce((acc, ex) => acc + (parseInt(ex.duration, 10) || 15), 0);
                  const diff = baseDuration - sumExercises;
                  let tempoInfo = sumExercises > 0 
                      ? (diff > 0 ? `<span style="color:var(--gold);">⏳ Faltam preencher ${diff} min</span>` : (diff < 0 ? `<span style="color:var(--red);">⚠️ Excede ${Math.abs(diff)} min do total!</span>` : `<span style="color:var(--green);">✅ Tempo exato da Sessão</span>`))
                      : `<span style="color:var(--muted);">Gere os minutos importados</span>`;

                  return `<div style="font-size:11px; margin-bottom:10px; font-weight:bold; background:var(--bg); padding:6px 10px; border-radius:6px; border:1px solid var(--line);">${tempoInfo}</div>`;
                })()}

                ${(trainingForm.exercises && trainingForm.exercises.length > 0) ? `
                  <div style="display:flex; flex-direction:column; gap:6px; margin-top:8px;">
                    ${trainingForm.exercises.map((ex, idx) => `
                      <div style="background:var(--surface); border:1px solid var(--line); border-radius:8px; padding:6px 10px; display:flex; justify-content:space-between; align-items:center;">
                        <div style="flex:1;">
                          <div style="font-size:12px; font-weight:bold; color:var(--chalk);">${idx + 1}.${ex.name}</div>
                          <div style="font-size:10px; color:var(--muted); display:flex; align-items:center; gap:6px; margin-top:2px;">
                            <span>Duração:</span>
                            <input type="number" min="1" max="180" value="${ex.duration}" style="width:45px; padding:2px 4px; font-size:11px; text-align:center; background:var(--surface-2); border:1px solid var(--gold); color:var(--gold); font-weight:bold; border-radius:4px;" onchange="updateExerciseDurationInTraining(${idx}, this.value)">
                            <span>Min</span>
                          </div>
                        </div>
                        <div style="display:flex; gap:4px; align-items:center;">
                          <button class="card-mini-btn" style="border:1px solid var(--gold); color:var(--gold); font-size:9px; padding:3px 6px;" onclick="event.stopPropagation(); viewExerciseScheme('${ex.notebookId}')">👁️ Ver</button>
                          <button class="quick-del" style="color:var(--red); font-size:14px; padding:2px 6px;" onclick="event.preventDefault(); event.stopPropagation(); removeExerciseFromTraining(${idx})">✕</button>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                ` : `<div style="font-size:10px; color:var(--muted); margin-top:4px;">Nenhum exercício importado para esta sessão.</div>`}

                <div class="field" style="margin-top:12px; margin-bottom:10px;">
                  <label>🏋️‍♂️ Plano de Treino (Gerado/Editável)</label>
                  <textarea id="tr-plan-input" placeholder="Ex: 1. Meiinho; 2. Posse de bola..." oninput="trainingForm.plan=this.value; trainingForm.notes=this.value;">${escapeHTML(trainingForm.plan || trainingForm.notes || '')}</textarea>
                </div>

                <div class="field" style="margin-bottom:0;">
                  <label>📝 Observações</label>
                  <textarea id="tr-obs-input" placeholder="Ex: Atitude excelente do grupo..." oninput="trainingForm.obs=this.value">${escapeHTML(trainingForm.obs || '')}</textarea>
                </div>
            </div>
            ` : ''}
        </div>
      </div>

      <div class="card">
        <div class="panel-title" style="margin-bottom:6px;">Registo de Presenças & Tempo Efetivo</div>
        <div style="font-size:11px; color:var(--muted); margin-bottom:12px;">Podes ajustar os minutos cumpridos se o jogador foi dispensado/lesionado a meio.</div>
        ${eligiblePlayers().length ? `<div style="display:flex; flex-direction:column; gap:8px;">${eligiblePlayers().map(p => {
          const currentReason = (trainingForm.absences && trainingForm.absences[p.id]) || 'presente';
          const hasCustomMins = currentReason === 'dispensado' || currentReason === 'lesao' || currentReason === 'castigo' || currentReason === 'atrasado';
          const playerMins = (trainingForm.customMinutes && trainingForm.customMinutes[p.id] != null) ? trainingForm.customMinutes[p.id] : (currentReason === 'presente' ? baseDuration : 0);
          const minsLabel = currentReason === 'atrasado' ? 'Minutos cumpridos (chegou atrasado):' : 'Minutos cumpridos antes da saída:';

          return `<div style="display:flex; flex-direction:column; background:var(--surface-2); padding:10px 12px; border-radius:8px; gap:6px;">
            <div style="display:flex; align-items:center; justify-content:space-between;">
              <span style="font-size:13px; font-weight:bold;">${playerLabel(p)}</span>
              <select style="width:auto; padding:4px 8px; font-size:11px; font-weight:bold; background:var(--surface); border:1px solid var(--line); color:var(--chalk); border-radius:6px;" onchange="setAbsenceReason('${p.id}', this.value)">
                <option value="presente" ${currentReason==='presente'?'selected':''}>🟢 Presente</option>
                ${reasons.map(r => `<option value="${r.id}" ${currentReason===r.id?'selected':''}>${r.label}</option>`).join('')}
              </select>
            </div>
            ${hasCustomMins ? `<div style="display:flex; align-items:center; justify-content:flex-end; gap:8px; font-size:11px; color:var(--muted); border-top:1px solid var(--line); padding-top:4px;">
              <span>${minsLabel}</span>
              <input type="number" inputmode="numeric" pattern="[0-9]*" min="0" max="${baseDuration}" value="${playerMins}" style="width:65px; padding:2px 6px; font-size:11px; text-align:center; background:var(--surface); border:1px solid var(--gold); color:var(--gold); font-weight:bold; border-radius:4px;" onclick="this.select()" oninput="setPlayerCustomMinutes('${p.id}', this.value)">
              <span>/ ${baseDuration}'</span>
            </div>` : ''}
          </div>`;
        }).join('')}</div>` : `<div class="empty">${t('pl_none')}</div>`}
      </div>
      <button class="btn btn-gold" style="width:100%; margin-bottom:10px;" onclick="uiSaveTraining()">${t('tr_save')}</button>
      <button class="btn btn-outline" style="width:100%;" onclick="trainingForm=null; render()">${t('cancel')}</button>`; 
  }
  
  const seasons = getPlanSeasons();
  let activeFilter = window.planSeasonFilter === 'todas' ? state.currentSeason : (window.planSeasonFilter || state.currentSeason);
  let filterUI = seasons.length > 1 ? `<div style="margin-bottom:14px; overflow-x:auto; display:flex; gap:6px; padding-bottom:6px;"><div class="seg-btn ${activeFilter==='TUDO'?'active':''}" style="flex:none; padding:8px 12px; font-size:10px;" onclick="window.planSeasonFilter='TUDO'; render()">Todas</div>${seasons.map(s=>`<div class="seg-btn ${activeFilter===s?'active':''}" style="flex:none; padding:8px 12px; font-size:10px;" onclick="window.planSeasonFilter='${s}'; render()">${s}</div>`).join('')}</div>` : '';
  const filtered = state.trainings.filter(t => activeFilter==='TUDO' || getEntitySeason(t) === activeFilter).sort((a, b) => new Date(b.date) - new Date(a.date));

  return `${topbarHtml(t('hub_plan_title'))}${renderPlanSubHeader()}<button class="btn btn-gold" style="width:100%; margin-bottom:14px;" onclick="trainingForm={absences:{}, customMinutes:{}, exercises:[], plan:'', obs:'', notes:'', duration:90, date: new Date().toISOString().slice(0,10)}; render()">${t('tr_new')}</button>${filterUI}
    ${filtered.length ? filtered.map(tr=>{ 
      const open = expandedTraining === tr.id; 
      const duration = tr.duration || 90;
      const isCompleted = tr.status === undefined || tr.status === 'completed';
      
      let absObj = {};
      if (Array.isArray(tr.absences)) {
        tr.absences.forEach(id => absObj[id] = 'injustificada');
      } else {
        absObj = tr.absences || {};
      }
      
      const absKeys = Object.keys(absObj);
      const presCount = eligiblePlayers().length - absKeys.length;
      const planTxt = tr.plan || tr.notes || '';
      
      return `<div class="card match-item" onclick="if(!event.target.closest('button')){ expandedTraining=expandedTraining==='${tr.id}'?null:'${tr.id}'; render(); }">
        <div class="match-head-row">
          <div class="match-head" style="flex:1;">
            <div>
              <div class="opp">${tr.date} <span class="badge-type" style="color:${isCompleted ? 'var(--green)' : 'var(--gold)'};">${isCompleted ? '🟢 Concluído' : '🟡 Agendado'} (${duration} Min)</span></div>
              <div class="date">${isCompleted ? `${presCount} presentes · ${absKeys.length} ausentes/parciais` : 'Clique em Concluir para marcar presenças'}</div>
            </div>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            ${!isCompleted ? `<button class="btn btn-green" style="font-size:10px; padding:4px 8px; flex:none;" onclick="event.stopPropagation(); quickCompleteTraining('${tr.id}')">🟢 Concluir</button>` : ''}
            <button class="btn btn-outline" style="font-size:10px; padding:4px 8px; flex:none;" onclick="event.stopPropagation(); modalConfig={type:'printTrainingChoice', trId:'${tr.id}'}; document.getElementById('modal-root').innerHTML = typeof renderModalHTML === 'function' ? renderModalHTML() : '';">📄 PDF</button>
            <button class="quick-del" style="color:var(--muted);" onclick="event.stopPropagation(); editTraining('${tr.id}')" title="Editar">✏️</button>
            <button class="quick-del" onclick="event.stopPropagation(); askConfirm('${t('msg_del_tr')}', ()=>deleteTraining('${tr.id}'))">🗑</button>
          </div>
        </div>
        ${open ? `<div class="goal-list">
          ${(tr.exercises && tr.exercises.length > 0) ? `
            <div style="background:var(--surface-2); border:1px solid var(--line); border-radius:8px; padding:10px; margin-bottom:8px;">
              <div style="font-size:11px; color:var(--gold); font-weight:bold; text-transform:uppercase; margin-bottom:6px;">🏋️ Exercícios da Sessão:</div>
              <div style="display:flex; flex-direction:column; gap:6px;">
                ${tr.exercises.map((ex, idx) => `
                  <div style="display:flex; justify-content:space-between; align-items:center; background:var(--surface); padding:6px 8px; border-radius:6px;">
                    <span style="font-size:11px; color:var(--chalk);"><b>${idx + 1}.</b> ${ex.name} <b>(${ex.duration}m)</b></span>
                    <button class="card-mini-btn" style="border:1px solid var(--gold); color:var(--gold); font-size:9px; padding:2px 6px;" onclick="event.stopPropagation(); viewExerciseScheme('${ex.notebookId}')">👁️ Ver Esquema</button>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
          ${planTxt ? `<div class="notes-readonly">🏋️‍♂️ <b>Plano:</b>\n${escapeHTML(planTxt)}</div>` : ''}
          ${tr.obs ? `<div class="notes-readonly" style="margin-top:4px;">📝 <b>Notas:</b> ${escapeHTML(tr.obs)}</div>` : ''}
          <div style="font-size:12px; margin-top:8px; color:var(--muted);"><b style="color:var(--chalk);">${t('tr_abs')}:</b><br>${absKeys.length ? absKeys.map(id => {
          const reason = absObj[id];
          const customMins = tr.customMinutes && tr.customMinutes[id] != null ? tr.customMinutes[id] : null;
          let label = '🔴 Injustificada';
          if(reason === 'justificada') label = '🟡 Justificada';
          if(reason === 'atrasado') label = '🕐 Atrasado';
          if(reason === 'lesao') label = '🩹 Lesão';
          if(reason === 'castigo') label = '🟥 Castigo';
          if(reason === 'dispensado') label = '⚪ Dispensado';
          
          let minText = customMins != null ? ` (${customMins}'/${duration}')` : '';
          return `<span style="font-size:11px; display:inline-block; margin-top:4px;">• ${playerName(id)} — ${label}${minText}</span>`;
        }).join('<br>') : t('match_nobody')}</div></div>` : ''}</div>`; 
    }).join('') : `<div class="empty">${t('tr_none')}</div>`}`;
}

window.uiSaveDiary = function(){ 
    if(!diaryForm.title || !diaryForm.title.trim()){ showToast('⚠️ Insere um título na nota!'); return; } 
    state.diary.unshift({ id: uid(), date: diaryForm.date || new Date().toISOString().slice(0,10), season: state.currentSeason, title: escapeHTML(diaryForm.title.trim()), content: diaryForm.content||'' }); 
    diaryForm = null; saveState(); render(); showToast('Nota guardada no Diário ✓'); 
};
window.deleteDiary = function(id){ state.diary = state.diary.filter(d=>d.id!==id); saveState(); render(); };

function renderDiario(){
  if(diaryForm){ 
      return `${topbarHtml(t('diary_new'))}${renderPlanSubHeader()}
      <div class="card">
        <div class="field"><label>${t('sch_date')}</label><input type="date" value="${diaryForm.date||new Date().toISOString().slice(0,10)}" oninput="diaryForm.date=this.value"></div>
        <div class="field"><label>${t('diary_heading')}</label><input type="text" placeholder="${t('diary_heading_ph')}" value="${escapeHTML(diaryForm.title||'')}" oninput="diaryForm.title=this.value"></div>
        <div class="field" style="margin-bottom:0;"><label>${t('diary_content')}</label><textarea placeholder="${t('diary_content_ph')}" oninput="diaryForm.content=this.value">${escapeHTML(diaryForm.content||'')}</textarea></div>
      </div>
      <button class="btn btn-gold" style="width:100%; margin-bottom:10px;" onclick="uiSaveDiary()">${t('diary_save')}</button>
      <button class="btn btn-outline" style="width:100%;" onclick="diaryForm=null; render()">${t('cancel')}</button>`; 
  }
  
  const seasons = getPlanSeasons();
  let activeFilter = window.planSeasonFilter === 'todas' ? state.currentSeason : (window.planSeasonFilter || state.currentSeason);
  let filterUI = seasons.length > 1 ? `<div style="margin-bottom:14px; overflow-x:auto; display:flex; gap:6px; padding-bottom:6px;"><div class="seg-btn ${activeFilter==='TUDO'?'active':''}" style="flex:none; padding:8px 12px; font-size:10px;" onclick="window.planSeasonFilter='TUDO'; render()">Todas</div>${seasons.map(s=>`<div class="seg-btn ${activeFilter===s?'active':''}" style="flex:none; padding:8px 12px; font-size:10px;" onclick="window.planSeasonFilter='${s}'; render()">${s}</div>`).join('')}</div>` : '';
  const filtered = state.diary.filter(d => activeFilter==='TUDO' || getEntitySeason(d) === activeFilter);

  return `${topbarHtml(t('hub_plan_title'))}${renderPlanSubHeader()}
    <button class="btn btn-gold" style="width:100%; margin-bottom:14px;" onclick="diaryForm={title:'', content:'', date: new Date().toISOString().slice(0,10)}; render()">${t('diary_new')}</button>${filterUI}
    ${filtered.length ? filtered.map(d => { 
        const open = expandedDiary === d.id; 
        return `<div class="card match-item" onclick="if(!event.target.closest('button')){ expandedDiary=expandedDiary==='${d.id}'?null:'${d.id}'; render(); }">
            <div class="match-head-row">
                <div class="match-head" style="flex:1;">
                    <div><div class="opp">${escapeHTML(d.title)}</div><div class="date">${d.date.split('-').reverse().join('/')}</div></div>
                </div>
                <button class="quick-del" onclick="event.stopPropagation(); askConfirm('Apagar esta nota do diário?', ()=>deleteDiary('${d.id}'))">🗑</button>
            </div>
            ${open ? `<div class="goal-list"><div class="notes-readonly">📝 ${escapeHTML(d.content)}</div></div>` : ''}
        </div>`; 
    }).join('') : `<div class="empty">${t('diary_none')}</div>`}`;
}

window.uiSaveVideo = function(){ if(!videoForm.title || !videoForm.title.trim()){ showToast(t('vid_name')); return; } if(!videoForm.url || !videoForm.url.trim()){ showToast(t('vid_url')); return; } state.videos.unshift({ id: uid(), title: escapeHTML(videoForm.title.trim()), type: videoForm.type || 'treino', url: escapeHTML(videoForm.url.trim()), notes: videoForm.notes || '' }); videoForm = null; saveState(); render(); showToast(t('msg_vid_saved')); };
window.deleteVideo = function(id){ state.videos = state.videos.filter(v=>v.id!==id); saveState(); render(); };
window.shareVideoWhatsapp = function(id){
  const v = state.videos.find(x=>x.id===id); if(!v) return;
  let text = `🎬 *${v.title}*\n\n🔗 ${v.url}\n`;
  if(v.notes) text += `\n📝 *Notas:* ${v.notes}\n`;
  window.shareContent(text);
};

function renderVideos(){
  if(videoForm){
    return `${topbarHtml(t('vid_new'))}${renderStratSubHeader()}
      <div class="card">
        <div class="field"><label>${t('vid_name')}</label><input type="text" placeholder="Ex: Exercício de Finalização" value="${escapeHTML(videoForm.title||'')}" oninput="videoForm.title=this.value"></div>
        <div class="field"><label>${t('vid_url')}</label><input type="url" placeholder="https://youtube.com/... ou link do vídeo" value="${escapeHTML(videoForm.url||'')}" oninput="videoForm.url=this.value"></div>
        <div class="field" style="margin-bottom:0;"><label>Descrição / Notas</label><textarea placeholder="Ex: Foco no tempo de passe..." oninput="videoForm.notes=this.value">${escapeHTML(videoForm.notes||'')}</textarea></div>
      </div>
      <button class="btn btn-gold" style="width:100%; margin-bottom:10px;" onclick="uiSaveVideo()">${t('vid_save')}</button>
      <button class="btn btn-outline" style="width:100%;" onclick="videoForm=null; render()">${t('cancel')}</button>`;
  }

  const list = state.videos || [];
  return `${topbarHtml(t('hub_strat_title'))}${renderStratSubHeader()}
    <button class="btn btn-gold" style="width:100%; margin-bottom:14px;" onclick="videoForm={title:'', url:'', notes:''}; render()">${t('vid_new')}</button>
    ${list.length ? list.map(v => {
      const open = expandedVideo === v.id; 
      const ytEmbed = typeof getYouTubeEmbedUrl === 'function' ? getYouTubeEmbedUrl(v.url) : null;
      return `<div class="card match-item" onclick="if(!event.target.closest('button') && !event.target.closest('a') && !event.target.closest('iframe')){ expandedVideo=expandedVideo==='${v.id}'?null:'${v.id}'; render(); }">
        <div class="match-head-row">
          <div class="match-head" style="flex:1;">
            <div>
              <div class="opp">${escapeHTML(v.title)}</div>
            </div>
          </div>
          <button class="quick-del" onclick="event.stopPropagation(); askConfirm('${t('vid_del_ask')}', ()=>deleteVideo('${v.id}'))">🗑</button>
        </div>
        ${open ? `<div class="goal-list">
          ${ytEmbed ? `<div class="video-embed-container"><iframe src="${ytEmbed}" allowfullscreen></iframe></div>` : ''}
          ${v.notes ? `<div class="notes-readonly" style="margin-top:8px;">📝 ${escapeHTML(v.notes)}</div>` : ''}
          <div class="btn-row" style="margin-top:12px;">
            <button class="btn btn-green" style="font-size:11px; padding:10px;" onclick="event.stopPropagation(); shareVideoWhatsapp('${v.id}')">${t('vid_share')}</button>
            <a class="btn btn-outline" style="font-size:11px; padding:10px; text-decoration:none;" href="${v.url}" target="_blank" onclick="event.stopPropagation();">${t('vid_open')}</a>
          </div>
        </div>` : ''}
      </div>`;
    }).join('') : `<div class="empty">Nenhum vídeo guardado.</div>`}`;
}

window.exerciseSearchQuery = '';

window.openExerciseSelectorModal = function() {
    window.exerciseSearchQuery = '';
    modalConfig = { type: 'exerciseSelector' };
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = typeof renderModalHTML === 'function' ? renderModalHTML() : '';
};

window.addExerciseToTraining = function(exerciseId, customDur = 15) {
    if (!trainingForm) return;
    const play = (state.tacticalNotebook || []).find(x => x.id === exerciseId);
    if (!play) return;

    if (!trainingForm.exercises) trainingForm.exercises = [];
    
    const exDuration = parseInt(customDur, 10) || play.duration || 15;
    trainingForm.exercises.push({
        id: uid(),
        notebookId: play.id,
        name: play.name,
        duration: exDuration
    });

    // LÓGICA INTELIGENTE: Mantém o tempo limite do treino e constrói o plano
    window.recalculateTrainingPlanAndDuration();
    if (typeof closeModal === 'function') closeModal();
    render();
    if (typeof showToast === 'function') showToast(`Importado: ${play.name} (${exDuration}m)`);
};

window.updateExerciseDurationInTraining = function(index, newMins) {
    if (!trainingForm || !trainingForm.exercises || !trainingForm.exercises[index]) return;
    const val = parseInt(newMins, 10);
    trainingForm.exercises[index].duration = isNaN(val) || val <= 0 ? 15 : val;
    window.recalculateTrainingPlanAndDuration();
    render();
};

window.removeExerciseFromTraining = function(index) {
    if (!trainingForm || !trainingForm.exercises) return;
    trainingForm.exercises.splice(index, 1);
    window.recalculateTrainingPlanAndDuration();
    render();
};

window.recalculateTrainingPlanAndDuration = function() {
    if (!trainingForm || !trainingForm.exercises) return;
    
    let planLines = [];

    trainingForm.exercises.forEach((ex, i) => {
        const dur = parseInt(ex.duration, 10) || 15;
        planLines.push(`${i + 1}. ${ex.name} (${dur} Min)`);
    });

    // ATUALIZA O PLANO DE TEXTO, MAS NÃO TOCA NO TEMPO TOTAL DA SESSÃO!
    if (planLines.length > 0) {
        trainingForm.plan = planLines.join('\n');
        trainingForm.notes = trainingForm.plan;
    }
};

window.viewExerciseScheme = function(notebookId) {
  const play = (state.tacticalNotebook || []).find(x => x.id === notebookId);
  if (!play) {
    if (typeof showToast === 'function') showToast('Esquema tático não encontrado.');
    return;
  }
  
  const svgHTML = window.buildExerciseTacticalPitchSVG ? window.buildExerciseTacticalPitchSVG(notebookId) : '';
  
  modalConfig = { 
    type: 'viewExerciseClean', 
    title: play.name,
    svg: svgHTML 
  };
  
  const root = document.getElementById('modal-root');
  if (root) root.innerHTML = typeof renderModalHTML === 'function' ? renderModalHTML() : '';
};

// ==========================================
// MÓDULO DO MICROCICLO SEMANAL
// ==========================================
window.microcycleDate = new Date();

window.getMonday = function(d) {
    let date = new Date(d);
    let day = date.getDay();
    let diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
};

window.changeMicrocycleWeek = function(offset) {
    window.microcycleDate.setDate(window.microcycleDate.getDate() + (offset * 7));
    render();
};

window.exportMicrocyclePDF = function() {
    if(!window.microcycleDate) window.microcycleDate = new Date();
    const mon = window.getMonday(window.microcycleDate);
    const days = [];
    for(let i=0; i<7; i++) {
        let d = new Date(mon);
        d.setDate(mon.getDate() + i);
        days.push(d);
    }

    const dayNames = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
    let monStr = days[0].toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
    let sunStr = days[6].toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });

    // OTIMIZAÇÃO: Filtra os dados de uma vez só para os 7 dias, em vez de filtrar a época inteira a cada volta do loop
    const weekDates = days.map(d => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    });

    const weekTrs = (state.trainings || []).filter(t => weekDates.includes(t.date));
    const weekSchs = (state.schedule || []).filter(s => weekDates.includes(s.date));
    const weekMats = (state.matches || []).filter(m => weekDates.includes(m.date));

    let daysHtml = '';
    days.forEach((d, idx) => {
        const dateIso = weekDates[idx];
        const dayStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

        const trs = weekTrs.filter(t => t.date === dateIso);
        const schs = weekSchs.filter(s => s.date === dateIso);
        const mats = weekMats.filter(m => m.date === dateIso && !schs.some(s => s.id === (m.originalSchedule && m.originalSchedule.id)));

        let eventsHtml = '';
        if(trs.length === 0 && schs.length === 0 && mats.length === 0) {
            eventsHtml = `<div style="color:#6B7280; font-size:12px; font-weight:bold; padding:8px 0;">🛋️ Folga / Recuperação</div>`;
        } else {
            trs.forEach(tr => {
                let dur = tr.duration || 90;
                eventsHtml += `
                <div style="border-left:4px solid #10B981; background:#F9FAFB; padding:10px; margin-bottom:8px; border-radius:4px; border-top:1px solid #E5E7EB; border-right:1px solid #E5E7EB; border-bottom:1px solid #E5E7EB;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                        <span style="color:#10B981; font-weight:bold; font-size:12px; text-transform:uppercase;">🏋️ Treino</span>
                        <span style="color:#6B7280; font-weight:bold; font-size:12px;">${dur} Min</span>
                    </div>
                    ${tr.plan ? `<div style="font-size:11px; color:#374151; white-space:pre-wrap; line-height:1.4;">${escapeHTML(tr.plan)}</div>` : ''}
                </div>`;
            });
            [...schs, ...mats].forEach(m => {
                let isHome = m.location === 'casa';
                eventsHtml += `
                <div style="border-left:4px solid #D9A441; background:#FFFBEB; padding:10px; margin-bottom:8px; border-radius:4px; border-top:1px solid #FEF3C7; border-right:1px solid #FEF3C7; border-bottom:1px solid #FEF3C7;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <span style="color:#D9A441; font-weight:bold; font-size:12px; text-transform:uppercase;">⚽ Jogo</span>
                        <span style="color:#6B7280; font-weight:bold; font-size:12px;">${isHome ? 'CASA' : 'FORA'}</span>
                    </div>
                    <div style="font-size:13px; color:#111827; font-weight:bold;">vs ${escapeHTML(m.opponent)}</div>
                    <div style="font-size:11px; color:#6B7280; margin-top:2px;">${m.type === 'amigavel' ? 'Amigável' : (m.type==='campeonato' ? 'Campeonato' : 'Torneio')}</div>
                </div>`;
            });
        }

        daysHtml += `
        <div style="page-break-inside:avoid; margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #0E211A; padding-bottom:4px; margin-bottom:8px;">
                <span style="font-size:14px; font-weight:800; color:#0E211A; text-transform:uppercase;">${dayNames[idx]}</span>
                <span style="font-size:12px; color:#4B5563; font-weight:bold;">${dayStr}</span>
            </div>
            ${eventsHtml}
        </div>`;
    });

    let html = `
    <div class="print-card" style="padding:24px; font-family:-apple-system, sans-serif;">
        <div class="print-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #0E211A; padding-bottom:12px; margin-bottom:24px;">
            <div>
                <h1 style="font-size:20px; margin:0; text-transform:uppercase; color:#0E211A; font-weight:800;">MICROCICLO SEMANAL</h1>
                <p style="font-size:16px; font-weight:800; margin:4px 0 0 0; color:#D9A441;">Semana: ${monStr} a ${sunStr}</p>
                <p style="font-size:11px; color:#4B5563; margin-top:2px;">Clube: <b>${getClubAndEscalao()}</b> &nbsp;|&nbsp; Época: <b>${state.currentSeason}</b></p>
            </div>
            ${typeof getClubLogoHtml === 'function' ? getClubLogoHtml() : ''}
        </div>
        ${daysHtml}
        <div style="margin-top:24px; display:flex; justify-content:space-between; align-items:flex-end;">
            <div style="font-size:10px; color:#6B7280;">• Planeamento Semanal — Coachfolio v3.5</div>
            <div style="text-align:center; width:200px; border-top:1.5px solid #111827; padding-top:4px; font-size:11px; font-weight:bold;">A Equipa Técnica</div>
        </div>
    </div>`;

    document.getElementById('print-area').innerHTML = html;
    if(typeof window.openSafePrintModal === 'function') window.openSafePrintModal();
};

window.renderMicrociclo = function() {
    if(!window.microcycleDate) window.microcycleDate = new Date();
    const mon = window.getMonday(window.microcycleDate);
    const days = [];
    for(let i=0; i<7; i++) {
        let d = new Date(mon);
        d.setDate(mon.getDate() + i);
        days.push(d);
    }

    const dayNames = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
    let html = `${topbarHtml('Microciclo Semanal')}${renderPlanSubHeader()}`;

    let monStr = days[0].toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
    let sunStr = days[6].toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
    
    html += `
    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--surface-2); padding:10px; border-radius:8px; margin-bottom:14px; border:1px solid var(--line);">
        <button class="btn btn-outline" style="padding:6px 12px;" onclick="changeMicrocycleWeek(-1)">⬅️</button>
        <div style="text-align:center;">
            <div style="font-size:10px; color:var(--muted); text-transform:uppercase; font-weight:bold; letter-spacing:0.05em;">Semana de Trabalho</div>
            <div style="font-size:13px; color:var(--gold); font-weight:bold; margin-top:2px;">${monStr} a ${sunStr}</div>
        </div>
        <button class="btn btn-outline" style="padding:6px 12px;" onclick="changeMicrocycleWeek(1)">➡️</button>
    </div>
    <div style="display:flex; flex-direction:column; gap:8px;">
    `;

    // OTIMIZAÇÃO: Filtra os dados da semana toda em vez de processar toda a base de dados repetidamente!
    const weekDates = days.map(d => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    });

    const weekTrs = (state.trainings || []).filter(t => weekDates.includes(t.date));
    const weekSchs = (state.schedule || []).filter(s => weekDates.includes(s.date));
    const weekMats = (state.matches || []).filter(m => weekDates.includes(m.date));

    days.forEach((d, idx) => {
        const dateIso = weekDates[idx];
        const dayStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

        const trs = weekTrs.filter(t => t.date === dateIso);
        const schs = weekSchs.filter(s => s.date === dateIso);
        const mats = weekMats.filter(m => m.date === dateIso && !schs.some(s => s.id === (m.originalSchedule && m.originalSchedule.id)));

        let eventsHtml = '';
        if(trs.length === 0 && schs.length === 0 && mats.length === 0) {
            eventsHtml = `<div style="color:var(--muted); font-size:11px; font-weight:bold; display:flex; align-items:center; gap:6px; padding:6px 0;">🛋️ Folga / Recuperação</div>`;
        } else {
            trs.forEach(tr => {
                let dur = tr.duration || 90;
                let isDone = (tr.status === undefined || tr.status === 'completed');
                eventsHtml += `<div style="background:var(--surface); border:1px solid var(--line); border-left:3px solid var(--green); padding:8px 10px; border-radius:6px; margin-bottom:6px;">
                    <div style="display:flex; justify-content:space-between;">
                      <div style="font-size:11px; color:var(--green); font-weight:bold; text-transform:uppercase;">🏋️ Treino ${isDone ? '🟢' : '🟡'}</div>
                      <div style="font-size:11px; color:var(--muted); font-weight:bold;">${dur}'</div>
                    </div>
                    ${tr.plan ? `<div style="font-size:10px; color:var(--chalk); margin-top:6px; white-space:pre-wrap; overflow-wrap:break-word;">${escapeHTML(tr.plan)}</div>` : ''}
                </div>`;
            });
            [...schs, ...mats].forEach(m => {
                let isHome = m.location === 'casa';
                let isDone = m.finished ? '🟢' : '🟡';
                eventsHtml += `<div style="background:var(--surface); border:1px solid var(--line); border-left:3px solid var(--gold); padding:8px 10px; border-radius:6px; margin-bottom:6px;">
                    <div style="display:flex; justify-content:space-between;">
                       <div style="font-size:11px; color:var(--gold); font-weight:bold; text-transform:uppercase;">⚽ Jogo ${isDone}</div>
                       <div style="font-size:11px; color:var(--muted); font-weight:bold;">${isHome ? 'CASA' : 'FORA'}</div>
                    </div>
                    <div style="font-size:12px; color:var(--chalk); margin-top:4px; font-weight:bold;">vs ${escapeHTML(m.opponent)}</div>
                    <div style="font-size:10px; color:var(--muted); margin-top:2px;">${m.type === 'amigavel' ? 'Amigável' : (m.type==='campeonato' ? 'Campeonato' : 'Torneio')}</div>
                </div>`;
            });
        }

        const todayIso = new Date().toISOString().slice(0,10);
        const isToday = dateIso === todayIso;
        const borderCol = isToday ? 'border:1px solid var(--gold);' : 'border:1px solid var(--line);';

        html += `
        <div class="card" style="padding:10px; margin-bottom:0; ${borderCol}">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; border-bottom:1px solid var(--line); padding-bottom:6px;">
                <span style="font-size:11px; font-weight:bold; color:${isToday ? 'var(--gold)' : 'var(--chalk)'}; text-transform:uppercase;">${dayNames[idx]} ${isToday ? '(Hoje)' : ''}</span>
                <span style="font-size:10px; color:var(--muted); font-weight:bold;">${dayStr}</span>
            </div>
            ${eventsHtml}
        </div>
        `;
    });

    html += `
        <div style="display:flex; gap:10px; margin-top:6px;">
            <button class="btn btn-outline" style="flex:1; padding:10px 4px; font-size:11px;" onclick="window.microcycleDate = new Date(); render();">📅 Semana Atual</button>
            <button class="btn btn-outline" style="flex:1; padding:10px 4px; font-size:11px; border-style:dashed;" onclick="exportMicrocyclePDF()">📄 Exportar PDF</button>
        </div>
    </div>`;
    
    return html;
};