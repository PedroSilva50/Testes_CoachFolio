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
    let secs = typeof calcPlayerMinutes === 'function' ? calcPlayerMinutes(m, p.id) : 0;
    let minsStr = typeof formatSecsToMinSec === 'function' ? formatSecsToMinSec(secs) : Math.round(secs/60)+"'";
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

  const selectedStaffIds = (m.originalSchedule && m.originalSchedule.staffCallup) ? m.originalSchedule.staffCallup : [];
  const staffList = (state.staff || []).filter(st => selectedStaffIds.includes(st.id));
  let staffRowsHtml = '';
  if (staffList.length === 0) {
    staffRowsHtml = '<tr><td colspan="2" style="text-align:center; padding:6px; color:#666;">Equipa Técnica / Delegado não registados.</td></tr>';
  } else {
    staffList.forEach(st => {
      staffRowsHtml += `<tr><td style="text-align:left; font-weight:bold;">${escapeHTML(st.name)}</td><td style="text-align:left; color:#444;">${escapeHTML(st.role || 'Equipa Técnica')}</td></tr>`;
    });
  }

  const logoHtml = typeof getClubLogoHtml === 'function' ? getClubLogoHtml() : '';

  let html = `<div class="print-card">
    <div class="print-header" style="display:flex; justify-content:space-between; align-items:center; text-align:left;">
      <div>
        <h1 style="margin:0;">Relatório de Jogo</h1>
        <p style="font-size:18px; font-weight:bold; margin:5px 0 0;">${getMyClub()} ${sc} - ${co} ${escapeHTML(m.opponent)} (${locLabel})</p>
        <p style="margin:5px 0 0;"><b>${getClubAndEscalao()}</b> | ${dateStr} | Época: ${m.season||state.currentSeason} ${m.capitao ? ' | © Capitão: ' + playerName(m.capitao) : ''} | Duração Real: ${totalMatchMins}'</p>
      </div>
      ${logoHtml}
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
        <table><tr><th style="text-align:left;">Nome</th><th style="text-align:left;">Função</th></tr>${staffRowsHtml}</table>
        <h3 style="margin-top:15px;">Cartões</h3>
        <table><tr><th>Min</th><th style="text-align:left;">Jogador</th></tr>${cardsHtml||'<tr><td colspan="2">Sem registo</td></tr>'}</table>
      </div>
    </div>
    <h3>Golos e Ocorrências</h3>
    <table><tr><th style="width:50px;">Min</th><th style="text-align:left;">Evento</th></tr>${goalsHtml||'<tr><td colspan="2">Sem registo</td></tr>'}</table>
    <h3>Notas do Treinador</h3>
    <p style="white-space:pre-wrap; border:1px solid #CCC; padding:10px; border-radius:6px; background:#FFF; min-height:60px;">${escapeHTML(m.notes || 'Nenhuma nota registada neste jogo.')}</p>
  </div>`;

  return html;
}

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
      <circle cx="${cx}" cy="${svgY}" r="5" fill="${kitColor}" stroke="#FFFFFF" stroke-width="0.8" />
      <text x="${cx}" y="${svgY + 1.5}" fill="${numColor}" font-size="4" font-weight="bold" font-family="-apple-system, sans-serif" text-anchor="middle">${escapeHTML(numLabel)}</text>
      ${nameLabel ? `
        <rect x="${cx - 10}" y="${svgY + 5.5}" width="20" height="4.5" rx="1" fill="rgba(0,0,0,0.75)" />
        <text x="${cx}" y="${svgY + 8.8}" fill="#FFFFFF" font-size="3" font-weight="bold" font-family="-apple-system, sans-serif" text-anchor="middle">${escapeHTML(nameLabel)}</text>
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
  // 🔒 BARREIRA DA DEMO: PROÍBE EXPORTAÇÃO PDF
  if (!state.isActivated) {
      modalConfig = { type: 'freemium', message: 'A exportação de relatórios em PDF é exclusiva da versão PRO. Desbloqueia a app para poderes imprimir e partilhar os teus jogos!' };
      const root = document.getElementById('modal-root');
      if (root) root.innerHTML = typeof renderModalHTML === 'function' ? renderModalHTML() : '';
      return;
  }

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

  let startersHtml = '';
  sortPlayerObjs(starters).forEach(p => {
    startersHtml += `<tr style="border-bottom: 1px solid #E5E7EB;"><td style="text-align:center; font-weight:bold; width:35px; padding:6px 0; color:#111827;">${p.number || '-'}</td><td style="text-align:left; font-weight:600; padding-left:10px; color:#1F2937;">${escapeHTML(p.name) || t('pl_no_name')}</td></tr>`;
  });

  const sortedSquad = [
    ...sortPlayerObjs(starters),
    ...sortPlayerObjs(usedSubs),
    ...sortPlayerObjs(unused)
  ];

  let lineupHtml = '';
  sortedSquad.forEach((p, idx) => {
    const isStarter = (m.lineup || []).includes(p.id);
    const wasSubbedIn = (m.subs || []).some(s => s.inId === p.id);
    let secs = typeof calcPlayerMinutes === 'function' ? calcPlayerMinutes(m, p.id) : 0;
    let minsStr = typeof formatSecsToMinSec === 'function' ? formatSecsToMinSec(secs) : Math.round(secs/60)+"'";
    const r = (m.ratings && m.ratings[p.id]) ? `${m.ratings[p.id]}★` : '-';
    let statusLabel = isStarter ? '<span style="color:#059669; font-weight:bold;">(XI)</span>' : (wasSubbedIn ? '<span style="color:#D97706;">(Sup)</span>' : '<span style="color:#9CA3AF;">(SNU)</span>');
    let bg = idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
    
    lineupHtml += `<tr style="background:${bg}; border-bottom:1px solid #F3F4F6;"><td style="text-align:left; padding:6px 8px; color:#111827;">${playerLabel(p)} ${statusLabel}</td><td style="white-space:nowrap; text-align:center; padding:6px 4px; font-family:monospace; font-weight:bold; color:#374151;">${minsStr}</td><td style="text-align:center; color:#D9A441; font-weight:bold;">${r}</td></tr>`;
  });

  let subsHtml = '';
  if (m.subs && m.subs.length > 0) {
    m.subs.forEach(s => {
      let minDisplay = s.isHalftime ? 'INT' : (s.minute != null ? window.getGlobalMinuteDisplay(m, s.half, s.minute) + "'" : '-');
      subsHtml += `<tr style="border-bottom:1px solid #F3F4F6;"><td style="width:40px; font-weight:bold; color:#6B7280; text-align:center;">${minDisplay}</td><td style="color:#DC2626; text-align:left; padding-left:6px; font-weight:500;">↓ ${playerName(s.outId)}</td><td style="color:#16A34A; text-align:left; padding-left:6px; font-weight:500;">↑ ${playerName(s.inId)}</td></tr>`;
    });
  }

  let goalsHtml = '';
  if (m.goals && m.goals.length > 0) {
    m.goals.forEach(g => {
       let subTag = g.goalSubtype === 'penalti' ? ' (Penálti)' : (g.goalSubtype === 'autogolo' ? ' (Autogolo)' : '');
       let desc = '';
       if (g.type === 'scored') {
         desc = g.scorerId === 'autogolo' ? `⚽ Autogolo (Adversário)` : `⚽ ${playerName(g.scorerId)}${subTag} ${g.assistId && g.assistId !== 'none' ? '<span style="color:#6B7280; font-size:10px;">[Ast: ' + playerName(g.assistId) + ']</span>' : ''}`;
       } else {
         let ownGoalPlayer = g.scorerId ? ` [${playerName(g.scorerId)}]` : '';
         desc = `🥅 Golo Sofrido${subTag}${ownGoalPlayer}`;
       }
       let minDisplay = g.minute != null ? window.getGlobalMinuteDisplay(m, g.half, g.minute) + "'" : (g.half === 1 ? "1ªP" : "2ªP");
       goalsHtml += `<tr style="border-bottom:1px solid #F3F4F6;"><td style="width:50px; font-weight:bold; color:#D9A441; text-align:center;">${minDisplay}</td><td style="text-align:left; font-weight:600; padding:6px 10px; color:#111827;">${desc}</td></tr>`;
    });
  }

  let cardsHtml = '';
  if (m.cards && m.cards.length > 0) {
    m.cards.forEach(c => {
      let minDisplay = c.minute != null ? window.getGlobalMinuteDisplay(m, c.half, c.minute) + "'" : '-';
      cardsHtml += `<tr style="border-bottom:1px solid #F3F4F6;"><td style="width:50px; font-weight:bold; color:#6B7280; text-align:center;">${minDisplay}</td><td style="text-align:left; padding:6px 10px; color:#111827;">${c.color === 'Amarelo' ? '🟨' : '🟥'} ${playerName(c.playerId)}</td></tr>`;
    });
  }

  const selectedStaffIds = (m.originalSchedule && m.originalSchedule.staffCallup) ? m.originalSchedule.staffCallup : [];
  const staffList = (state.staff || []).filter(st => selectedStaffIds.includes(st.id));
  let staffStr = staffList.length > 0 
    ? staffList.map(st => `<b>${escapeHTML(st.name)}</b> (${escapeHTML(st.role || 'Equipa Técnica')})`).join(' &nbsp;•&nbsp; ')
    : 'Sem registo oficial de elementos presentes.';

  const tacticalPitchSVG = window.buildMatchTacticalPitchSVG ? window.buildMatchTacticalPitchSVG(m) : '';
  const logoHtml = typeof getClubLogoHtml === 'function' ? getClubLogoHtml() : '';

  let html = `<div class="print-card" style="padding:24px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#111827;">
    <div class="print-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #0E211A; padding-bottom:12px; margin-bottom:18px;">
      <div>
        <h1 style="font-size:20px; margin:0; text-transform:uppercase; letter-spacing:0.05em; color:#0E211A; font-weight:800;">BOLETIM OFICIAL DE JOGO</h1>
        <p style="font-size:18px; font-weight:800; margin:4px 0 0 0; color:#D9A441;">${getMyClub()} ${sc} - ${co} ${escapeHTML(m.opponent || 'Adversário')} <span style="font-size:12px; font-weight:normal; color:#4B5563;">(${locLabel})</span></p>
        <p style="font-size:11px; color:#4B5563; margin:4px 0 0 0;"><b>${getClubAndEscalao()}</b> &nbsp;|&nbsp; Data: <b>${dateStr}</b> &nbsp;|&nbsp; Época: <b>${m.season || state.currentSeason}</b> ${m.capitao ? ' &nbsp;|&nbsp; © Capitão: <b>' + playerName(m.capitao) + '</b>' : ''} &nbsp;|&nbsp; Duração: <b>${totalMatchMins}'</b></p>
      </div>
      ${logoHtml}
    </div>

    <div style="display:flex; gap:16px; margin-bottom:18px; align-items:flex-start; page-break-inside:avoid;">
      <div style="flex:0.8; background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px; padding:10px;">
        <h3 style="font-size:11px; font-weight:800; margin:0 0 8px 0; border-bottom:2px solid #0E211A; padding-bottom:4px; text-transform:uppercase; color:#0E211A;">Titulares (${starters.length})</h3>
        <table style="width:100%; border-collapse:collapse; font-size:11px;">
          <thead><tr style="background:#E5E7EB; color:#374151;"><th style="width:35px; padding:4px 0;">Nº</th><th style="text-align:left; padding-left:10px;">Atleta</th></tr></thead>
          <tbody>${startersHtml || '<tr><td colspan="2" style="text-align:center; padding:8px; color:#9CA3AF;">Sem titulares definidos</td></tr>'}</tbody>
        </table>
      </div>
      <div style="flex:1.2; text-align:center; background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px; padding:10px;">
        <h3 style="font-size:11px; font-weight:800; margin:0 0 8px 0; border-bottom:2px solid #0E211A; padding-bottom:4px; text-transform:uppercase; color:#0E211A;">Disposição Tática em Campo</h3>
        ${tacticalPitchSVG}
      </div>
    </div>

    <div style="display:flex; gap:16px; margin-bottom:18px; align-items:flex-start; page-break-inside:avoid;">
      <div style="flex:1.2; background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px; padding:10px;">
        <h3 style="font-size:11px; font-weight:800; margin:0 0 8px 0; border-bottom:2px solid #0E211A; padding-bottom:4px; text-transform:uppercase; color:#0E211A;">Golos e Ocorrências</h3>
        <table style="width:100%; border-collapse:collapse; font-size:11px;">
          <thead><tr style="background:#E5E7EB; color:#374151;"><th style="width:50px; padding:4px 0;">Min</th><th style="text-align:left; padding-left:10px;">Evento</th></tr></thead>
          <tbody>${goalsHtml || '<tr><td colspan="2" style="text-align:center; padding:8px; color:#9CA3AF;">Sem golos registados</td></tr>'}</tbody>
        </table>
      </div>

      <div style="flex:1; background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px; padding:10px;">
        <h3 style="font-size:11px; font-weight:800; margin:0 0 8px 0; border-bottom:2px solid #0E211A; padding-bottom:4px; text-transform:uppercase; color:#0E211A;">Substituições & Cartões</h3>
        <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:10px;">
          <thead><tr style="background:#E5E7EB; color:#374151;"><th style="width:40px; padding:4px 0;">Min</th><th style="text-align:left; padding-left:6px;">Saiu</th><th style="text-align:left; padding-left:6px;">Entrou</th></tr></thead>
          <tbody>${subsHtml || '<tr><td colspan="3" style="text-align:center; padding:6px; color:#9CA3AF;">Sem substituições</td></tr>'}</tbody>
        </table>
        <table style="width:100%; border-collapse:collapse; font-size:11px;">
          <thead><tr style="background:#E5E7EB; color:#374151;"><th style="width:50px; padding:4px 0;">Min</th><th style="text-align:left; padding-left:10px;">Atleta</th></tr></thead>
          <tbody>${cardsHtml || '<tr><td colspan="2" style="text-align:center; padding:6px; color:#9CA3AF;">Sem cartões registados</td></tr>'}</tbody>
        </table>
      </div>
    </div>

    <div style="background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px; padding:10px; margin-bottom:18px; page-break-inside:avoid;">
      <h3 style="font-size:11px; font-weight:800; margin:0 0 8px 0; border-bottom:2px solid #0E211A; padding-bottom:4px; text-transform:uppercase; color:#0E211A;">Convocatória e Minutos de Jogo (${sortedSquad.length} Atletas)</h3>
      <table style="width:100%; border-collapse:collapse; font-size:11px;">
        <thead><tr style="background:#E5E7EB; color:#374151;"><th style="text-align:left; padding:6px 8px;">Atleta</th><th style="width:75px; text-align:center; padding:6px 0;">Minutos</th><th style="width:45px; text-align:center; padding:6px 0;">Aval</th></tr></thead>
        <tbody>${lineupHtml || '<tr><td colspan="3" style="text-align:center; padding:8px; color:#9CA3AF;">Sem registo de convocatória</td></tr>'}</tbody>
      </table>
    </div>

    <div style="background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px; padding:10px; margin-bottom:18px;">
      <h3 style="font-size:11px; font-weight:800; margin:0 0 4px 0; border-bottom:1px solid #D1D5DB; padding-bottom:3px; text-transform:uppercase; color:#0E211A;">Equipa Técnica Presente</h3>
      <p style="font-size:11px; margin:4px 0 0 0; color:#374151;">${staffStr}</p>
    </div>

    ${m.notes ? `
    <div style="background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px; padding:10px; margin-bottom:18px; page-break-inside:avoid;">
      <h3 style="font-size:11px; font-weight:800; margin:0 0 6px 0; border-bottom:1px solid #D1D5DB; padding-bottom:3px; text-transform:uppercase; color:#0E211A;">Observações Técnicas</h3>
      <p style="white-space:pre-wrap; font-size:11px; line-height:1.5; color:#1F2937; margin:4px 0 0 0;">${escapeHTML(m.notes)}</p>
    </div>
    ` : ''}

    <div style="margin-top:24px; display:flex; justify-content:space-between; align-items:flex-end;">
      <div style="font-size:10px; color:#9CA3AF;">• Documento de registo oficial — Coachfolio v3.6</div>
      <div style="text-align:center; width:200px; border-top:1.5px solid #111827; padding-top:4px; font-size:11px; font-weight:bold; color:#111827;">A Equipa Técnica</div>
    </div>
  </div>`;

  printArea.innerHTML = html;
  if(typeof window.openSafePrintModal === 'function') window.openSafePrintModal();
};

window.exportSeasonPDF = function(season){
  // 🔒 BARREIRA DA DEMO: PROÍBE EXPORTAÇÃO PDF DA ÉPOCA
  if (!state.isActivated) {
      modalConfig = { type: 'freemium', message: 'A exportação do relatório da Época em PDF é exclusiva da versão PRO. Desbloqueia a tua licença!' };
      const root = document.getElementById('modal-root');
      if (root) root.innerHTML = typeof renderModalHTML === 'function' ? renderModalHTML() : '';
      return;
  }

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
    if(typeof showToast === 'function') showToast('Sem jogos registados nesta época para exportar.');
    return;
  }

  const combinedHtml = seasonMatches
    .map(m => `<div style="page-break-after: always;">${buildMatchReportHTML(m)}</div>`)
    .join('');

  const printArea = document.getElementById('print-area');
  if (printArea) {
    printArea.innerHTML = combinedHtml;
    if(typeof window.openSafePrintModal === 'function') window.openSafePrintModal();
  } else {
    if(typeof showToast === 'function') showToast('Erro ao aceder à área de impressão.');
  }
};

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

window.openMatchTacticalBoard = function(mId) {
  const m = state.matches.find(x => x.id === mId);
  if (!m) return;

  window.generateMatchTacticalSnapshot(m);

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
  if(typeof navigateToHub === 'function') navigateToHub('estrategia');
  if(typeof navigateToTab === 'function') navigateToTab('tatica');
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
    if(typeof showToast === 'function') showToast('Esquema tático guardado no jogo! 💾');
  }

  window.editingMatchTacticsId = null;
  if(typeof navigateToHub === 'function') navigateToHub('jogo');
  if(typeof navigateToTab === 'function') navigateToTab('jogo');
};