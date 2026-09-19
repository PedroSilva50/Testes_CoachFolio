function renderModalHTML(){
  if(!modalConfig) return '';

  if(modalConfig.type === 'scouting') {
    let s = state.schedule.find(x => x.id === modalConfig.schId);
    if (!s) {
      const m = state.matches.find(x => x.id === modalConfig.schId || (x.originalSchedule && x.originalSchedule.id === modalConfig.schId));
      if (m && m.originalSchedule) s = m.originalSchedule;
    }
    const sc = (s && s.scouting) ? s.scouting : {};
    const hasData = sc.system || sc.keyPlayers || sc.setPieces || sc.gamePlan;
    
    return `
      <div class="modal-overlay" onclick="if(event.target===this) closeModal()">
        <div class="modal-card" style="max-width:440px; text-align:left;">
          <h3 style="margin-top:0; color:var(--gold); text-align:center;">👁️ Scouting: ${s ? s.opponent : 'Adversário'}</h3>
          
          <div style="max-height:65vh; overflow-y:auto; padding-right:4px;">
            <div class="grid-btns" style="margin-bottom:12px;">
              <div class="field" style="margin-bottom:0;">
                <label>Sistema Tático Base</label>
                <input type="text" id="scout-system" placeholder="Ex: 1-4-3-3 ou 1-2-3-1" value="${sc.system || ''}">
              </div>
              <div class="field" style="margin-bottom:0;">
                <label>Bloco Defensivo</label>
                <select id="scout-block">
                  <option value="Alto" ${sc.block==='Alto'?'selected':''}>🔴 Bloco Alto</option>
                  <option value="Médio" ${sc.block==='Médio'?'selected':''}>🟡 Bloco Médio</option>
                  <option value="Baixo" ${sc.block==='Baixo'?'selected':''}>🟢 Bloco Baixo</option>
                </select>
              </div>
            </div>

            <div class="field">
              <label>Construção / Saída de Bola</label>
              <select id="scout-buildup">
                <option value="Apoiada desde trás" ${sc.buildUp==='Apoiada desde trás'?'selected':''}>⚽ Apoiada (Curto)</option>
                <option value="Jogo Direto / Bola Longa" ${sc.buildUp==='Jogo Direto / Bola Longa'?'selected':''}>🚀 Jogo Direto (Longo)</option>
                <option value="Mista" ${sc.buildUp==='Mista'?'selected':''}>🔄 Mista</option>
              </select>
            </div>

            <div class="field">
              <label>⚠️ Jogadores-Chave & Alertas Individuais</label>
              <textarea id="scout-keyplayers" placeholder="Ex: Nº 10 muito forte no 1v1. Pressionar logo no 1º toque!">${sc.keyPlayers || ''}</textarea>
            </div>

            <div class="field">
              <label>🎯 Bolas Paradas</label>
              <textarea id="scout-setpieces" placeholder="Ex: Cantos marcados ao 1º pau. Marcação mista.">${sc.setPieces || ''}</textarea>
            </div>

            <div class="field">
              <label>💡 O Nosso Plano de Jogo</label>
              <textarea id="scout-gameplan" placeholder="Ex: Atrair por dentro e explorar a largura no lado fraco.">${sc.gamePlan || ''}</textarea>
            </div>
          </div>

          <div style="display:flex; gap:10px; margin-top:14px;">
            <button class="btn btn-outline" style="flex:1;" onclick="closeModal()">${t('cancel')}</button>
            ${hasData ? `<button class="btn btn-red" style="flex:none; padding:0 14px;" onclick="deleteScoutingData('${modalConfig.schId}')" title="Apagar Análise">🗑️</button>` : ''}
            <button class="btn btn-gold" style="flex:1;" onclick="saveScoutingData('${modalConfig.schId}')">💾 ${t('save')}</button>
          </div>
        </div>
      </div>`;
  }

  if(modalConfig.type === 'settings') {
     const sizeKB = (JSON.stringify(state).length / 1024); const maxKB = 5120; const pct = Math.min(100, (sizeKB/maxKB)*100);
     let strColor = pct > 90 ? 'var(--red)' : (pct > 70 ? 'var(--yellow)' : 'var(--green)');
     
     state.enableDiary = true;
     state.enableVideos = true;
     state.enableBirthdays = true;

     // Define qual aba está aberta por defeito
     window.settingsTab = window.settingsTab !== undefined ? window.settingsTab : 'identidade';

     // Função auxiliar corrigida: flex-shrink:0 e sem herdar padding da classe .card
     const makeAccordion = (id, icon, title, content) => {
         const isOpen = window.settingsTab === id;
         return `
         <div style="margin:0; padding:0; flex-shrink:0; border-radius:12px; border:1px solid var(--line); background:var(--surface-2); text-align:left; overflow:hidden;">
             <div style="padding:16px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; background:${isOpen ? 'var(--surface)' : 'transparent'}; border-bottom:${isOpen ? '1px solid var(--line)' : 'none'};" 
                  onclick="window.settingsTab = window.settingsTab === '${id}' ? null : '${id}'; document.getElementById('modal-root').innerHTML = renderModalHTML();">
                 <div style="font-size:12px; color:var(--gold); font-weight:bold; text-transform:uppercase; margin:0; line-height:1; display:flex; align-items:center; gap:6px;">
                    <span>${icon}</span> <span>${title}</span>
                 </div>
                 <div style="color:var(--gold); font-size:14px; transition: transform 0.2s; line-height:1;">${isOpen ? '▼' : '▶'}</div>
             </div>
             ${isOpen ? `<div style="padding:16px; animation: fadeIn 0.2s ease-in-out;">${content}</div>` : ''}
         </div>
         `;
     };

     // CONTEÚDO DAS ABAS (Intacto com todas as funcionalidades e IDs)
     const contentIdentidade = `
        <div class="field" style="margin-bottom:12px;">
            <label>${t('set_club')}</label>
            <div style="display:flex; gap:8px;">
               <input id="club-name-input" type="text" placeholder="${t('set_club_ph')}" value="${state.myClubName||''}" ${state.myClubName ? 'disabled style="opacity:0.6;"' : ''} onchange="state.myClubName=escapeHTML(this.value); saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML();">
               <button class="btn btn-outline" style="flex:none; padding:0 14px;" onclick="event.stopPropagation(); const inp = document.getElementById('club-name-input'); inp.disabled = !inp.disabled; inp.style.opacity = inp.disabled ? '0.6' : '1'; if(!inp.disabled) inp.focus();">${state.myClubName ? '🔒' : '✏️'}</button>
            </div>
        </div>
        <div class="field" style="margin-bottom:12px;">
            <label>Escalão / Categoria</label>
            <div style="display:flex; gap:8px;">
               <input id="escalao-input" type="text" placeholder="Ex: Sub-13" value="${state.escalao||''}" ${state.escalao ? 'disabled style="opacity:0.6;"' : ''} onchange="state.escalao=escapeHTML(this.value); saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML(); render();">
               <button class="btn btn-outline" style="flex:none; padding:0 14px;" onclick="event.stopPropagation(); const inp = document.getElementById('escalao-input'); inp.disabled = !inp.disabled; inp.style.opacity = inp.disabled ? '0.6' : '1'; if(!inp.disabled) inp.focus();">${state.escalao ? '🔒' : '✏️'}</button>
            </div>
        </div>
        <div class="field" style="margin-bottom:0;">
            <label>Emblema / Logótipo</label>
            <div style="display:flex; align-items:center; gap:8px; margin-top:4px;">
              ${state.clubLogo ? `<img src="${state.clubLogo}" style="height:45px; width:45px; object-fit:contain; border-radius:6px; border:1px solid var(--line); background:#FFF; padding:2px;">` : ''}
              <input type="file" id="club-logo-input" accept="image/*" style="font-size:11px; flex:1;" ${state.clubLogoLocked ? 'disabled style="opacity:0.5;"' : ''} onchange="uploadClubLogo(event)">
              ${state.clubLogo ? `
                <button class="btn btn-outline" style="flex:none; padding:6px 10px; font-size:12px;" onclick="event.stopPropagation(); state.clubLogoLocked = !state.clubLogoLocked; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML();">${state.clubLogoLocked ? '🔒' : '🔓'}</button>
                ${!state.clubLogoLocked ? `<button class="btn btn-red" style="flex:none; padding:6px 10px; font-size:12px;" onclick="event.stopPropagation(); state.clubLogo=null; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML();">🗑️</button>` : ''}
              ` : ''}
            </div>
        </div>
     `;

     const contentTatica = `
        <div class="field" style="margin-bottom:12px;">
            <label>Formato de Jogo (Quadro Tático & Plantel)</label>
            <div style="display:flex; gap:8px;">
               <select id="tactic-format-select" ${state.tacticFormatLocked ? 'disabled style="opacity:0.6;"' : ''} onchange="state.tacticFormat=parseInt(this.value, 10)||11; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML(); render();" style="flex:1; padding:8px; border-radius:6px; border:1px solid var(--line); background:var(--surface); color:var(--chalk); font-size:12px;">
                  <option value="5" ${state.tacticFormat===5?'selected':''}>Futebol 5 (5v5)</option>
                  <option value="7" ${state.tacticFormat===7?'selected':''}>Futebol 7 (7v7)</option>
                  <option value="9" ${state.tacticFormat===9?'selected':''}>Futebol 9 (9v9)</option>
                  <option value="11" ${(state.tacticFormat===11||!state.tacticFormat)?'selected':''}>Futebol 11 (11v11)</option>
               </select>
               <button class="btn btn-outline" style="flex:none; padding:0 14px;" onclick="event.stopPropagation(); state.tacticFormatLocked = !state.tacticFormatLocked; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML();">${state.tacticFormatLocked ? '🔒' : '🔓'}</button>
            </div>
        </div>
        <div class="field" style="margin-bottom:12px;">
            <label>Tempo por Parte (Min)</label>
            <div style="display:flex; gap:8px;">
               <input id="tempo-input" type="number" placeholder="Ex: 30" value="${state.defaultHalfDuration||30}" disabled style="opacity:0.6;" onchange="state.defaultHalfDuration=parseInt(this.value, 10)||30; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML(); render();">
               <button class="btn btn-outline" style="flex:none; padding:0 14px;" onclick="event.stopPropagation(); const inp = document.getElementById('tempo-input'); inp.disabled = !inp.disabled; inp.style.opacity = inp.disabled ? '0.6' : '1'; if(!inp.disabled) inp.focus();">🔒</button>
            </div>
        </div>
        <div class="field" style="margin-bottom:12px;"><label>${t('set_kit')}</label><div class="grid-btns cols-6" style="margin-top:4px;">
               <div style="background:#D9A441; height:30px; border-radius:50%; border:2px solid ${state.teamColor==='#D9A441'?'var(--chalk)':'transparent'}; cursor:pointer;" onclick="event.stopPropagation(); state.teamColor='#D9A441'; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML();"></div>
               <div style="background:#C8493F; height:30px; border-radius:50%; border:2px solid ${state.teamColor==='#C8493F'?'var(--chalk)':'transparent'}; cursor:pointer;" onclick="event.stopPropagation(); state.teamColor='#C8493F'; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML();"></div>
               <div style="background:#4ade80; height:30px; border-radius:50%; border:2px solid ${state.teamColor==='#4ade80'?'var(--chalk)':'transparent'}; cursor:pointer;" onclick="event.stopPropagation(); state.teamColor='#4ade80'; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML();"></div>
               <div style="background:#3b82f6; height:30px; border-radius:50%; border:2px solid ${state.teamColor==='#3b82f6'?'var(--chalk)':'transparent'}; cursor:pointer;" onclick="event.stopPropagation(); state.teamColor='#3b82f6'; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML();"></div>
               <div style="background:#FFFFFF; height:30px; border-radius:50%; border:2px solid ${state.teamColor==='#FFFFFF'?'var(--muted)':'transparent'}; cursor:pointer;" onclick="event.stopPropagation(); state.teamColor='#FFFFFF'; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML();"></div>
               <div style="background:#111111; height:30px; border-radius:50%; border:2px solid ${state.teamColor==='#111111'?'var(--chalk)':'transparent'}; cursor:pointer;" onclick="event.stopPropagation(); state.teamColor='#111111'; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML();"></div>
        </div></div>
        <div class="field" style="margin-bottom:0;"><label>${t('set_opp_kit')}</label><div class="grid-btns cols-6" style="margin-top:4px;">
               <div style="background:#D9A441; height:30px; border-radius:50%; border:2px solid ${state.oppColor==='#D9A441'?'var(--chalk)':'transparent'}; cursor:pointer;" onclick="event.stopPropagation(); state.oppColor='#D9A441'; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML();"></div>
               <div style="background:#C8493F; height:30px; border-radius:50%; border:2px solid ${state.oppColor==='#C8493F'?'var(--chalk)':'transparent'}; cursor:pointer;" onclick="event.stopPropagation(); state.oppColor='#C8493F'; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML();"></div>
               <div style="background:#4ade80; height:30px; border-radius:50%; border:2px solid ${state.oppColor==='#4ade80'?'var(--chalk)':'transparent'}; cursor:pointer;" onclick="event.stopPropagation(); state.oppColor='#4ade80'; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML();"></div>
               <div style="background:#3b82f6; height:30px; border-radius:50%; border:2px solid ${state.oppColor==='#3b82f6'?'var(--chalk)':'transparent'}; cursor:pointer;" onclick="event.stopPropagation(); state.oppColor='#3b82f6'; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML();"></div>
               <div style="background:#FFFFFF; height:30px; border-radius:50%; border:2px solid ${state.oppColor==='#FFFFFF'?'var(--muted)':'transparent'}; cursor:pointer;" onclick="event.stopPropagation(); state.oppColor='#FFFFFF'; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML();"></div>
               <div style="background:#111111; height:30px; border-radius:50%; border:2px solid ${state.oppColor==='#111111'?'var(--chalk)':'transparent'}; cursor:pointer;" onclick="event.stopPropagation(); state.oppColor='#111111'; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML();"></div>
        </div></div>
     `;

     const contentModulos = `
        <div class="field" style="margin-bottom:12px;"><label>${t('set_lang')}</label><div class="seg"><div class="seg-btn ${state.lang==='pt'?'active':''}" onclick="event.stopPropagation(); setLanguage('pt')">Português</div><div class="seg-btn ${state.lang==='en'?'active':''}" onclick="event.stopPropagation(); setLanguage('en')">English</div></div></div>
        <div class="field" style="margin-bottom:12px;"><label>${t('set_theme')}</label><div class="seg"><div class="seg-btn ${state.theme==='original'?'active':''}" onclick="event.stopPropagation(); setTheme('original')">${t('set_theme_orig')}</div><div class="seg-btn ${state.theme==='luzsolar'?'active':''}" onclick="event.stopPropagation(); setTheme('luzsolar')">${t('set_theme_sun')}</div><div class="seg-btn ${state.theme==='oceanonoturno'?'active':''}" onclick="event.stopPropagation(); setTheme('oceanonoturno')">${t('set_theme_ocean')}</div></div></div>
        <div class="field" style="margin-bottom:12px;"><label>${t('set_subs')}</label><div class="seg"><div class="seg-btn ${state.trackSubs?'active':''}" onclick="event.stopPropagation(); state.trackSubs=true; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML(); render();">${t('set_yes')}</div><div class="seg-btn ${!state.trackSubs?'active':''}" onclick="event.stopPropagation(); state.trackSubs=false; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML(); render();">${t('set_no')}</div></div></div>
        <div class="field" style="margin-bottom:12px;"><label>${t('set_fairplay')}</label><div class="seg"><div class="seg-btn ${state.showFairPlay?'active':''}" onclick="event.stopPropagation(); state.showFairPlay=true; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML(); render();">${t('set_yes')}</div><div class="seg-btn ${!state.showFairPlay?'active':''}" onclick="event.stopPropagation(); state.showFairPlay=false; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML(); render();">${t('set_no')}</div></div></div>
        <div class="field" style="margin-bottom:12px;"><label>${t('set_fines')}</label><div class="seg"><div class="seg-btn ${state.enableFines?'active':''}" onclick="event.stopPropagation(); state.enableFines=true; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML(); render();">${t('set_yes')}</div><div class="seg-btn ${!state.enableFines?'active':''}" onclick="event.stopPropagation(); state.enableFines=false; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML(); render();">${t('set_no')}</div></div></div>
        <div class="field" style="margin-bottom:12px;"><label>${t('set_leagues')}</label><div class="seg"><div class="seg-btn ${state.enableLeagues?'active':''}" onclick="event.stopPropagation(); state.enableLeagues=true; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML(); render();">${t('set_yes')}</div><div class="seg-btn ${!state.enableLeagues?'active':''}" onclick="event.stopPropagation(); state.enableLeagues=false; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML(); render();">${t('set_no')}</div></div></div>
        <div class="field" style="margin-bottom:0;"><label>${t('set_screen')}</label><div class="seg"><div class="seg-btn ${state.keepScreenAwake?'active':''}" onclick="event.stopPropagation(); state.keepScreenAwake=true; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML(); manageWakeLock();">${t('set_yes')}</div><div class="seg-btn ${!state.keepScreenAwake?'active':''}" onclick="event.stopPropagation(); state.keepScreenAwake=false; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML(); manageWakeLock();">${t('set_no')}</div></div></div>
     `;

     const contentEpoca = `
        <div style="display:flex; justify-content:center; align-items:center; gap:14px; margin-top:6px;">
           <button class="btn btn-outline" style="padding:4px 10px; border-radius:6px; font-size:16px;" onclick="event.stopPropagation(); shiftSeason(-1)">-</button>
           <div style="font-size:18px; font-weight:bold; color:var(--chalk);">${state.currentSeason}</div>
           <button class="btn btn-outline" style="padding:4px 10px; border-radius:6px; font-size:16px;" onclick="event.stopPropagation(); shiftSeason(1)">+</button>
        </div>
        <div class="seg" style="margin-top:16px; margin-bottom:16px;">
           <div class="seg-btn ${state.seasonFormat==='europeu'?'active':''}" onclick="event.stopPropagation(); if(state.seasonFormat!=='europeu' && confirm('Alterar o formato para Época Europeia (ex: 26/27)?')) { state.seasonFormat='europeu'; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML(); render(); }">${t('set_season_eu')}</div>
           <div class="seg-btn ${state.seasonFormat==='civil'?'active':''}" onclick="event.stopPropagation(); if(state.seasonFormat!=='civil' && confirm('Alterar o formato para Ano Civil (ex: 2026)?')) { state.seasonFormat='civil'; saveState(); document.getElementById('modal-root').innerHTML = renderModalHTML(); }">${t('set_season_civ')}</div>
        </div>
        <button class="btn btn-outline" style="width:100%; font-size:12px;" onclick="event.stopPropagation(); archiveSeason();">${t('set_archive')}</button>
     `;

     return `
     <style>
       @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
     </style>
     <div class="modal-overlay" onclick="if(event.target===this) closeModal()">
       <div class="modal-card" style="padding-bottom:10px; max-width: 480px;">
         <h3 style="margin-top:0; margin-bottom:20px; color:var(--gold);">${t('set_title')}</h3>
         
         <!-- Lista de opções com Flex Shrink protegido -->
         <div style="max-height:65vh; overflow-y:auto; padding-right:5px; margin-bottom:15px; display:flex; flex-direction:column; gap:12px; scroll-behavior: smooth;">
             
             <!-- ABAS EXPANSÍVEIS -->
             ${makeAccordion('identidade', '🛡️', 'Identidade do Clube', contentIdentidade)}
             ${makeAccordion('tatica', '📋', 'Tática e Jogo', contentTatica)}
             ${makeAccordion('modulos', '📱', 'Módulos & Interface', contentModulos)}
             ${makeAccordion('epoca', '📅', 'Gestão de Época', contentEpoca)}
             
             <!-- CARTÃO INDEPENDENTE (SEMPRE ABERTO: DADOS E BACKUPS) -->
             <div style="flex-shrink:0; margin:12px 0 0 0; padding:16px; border-radius:12px; border:1px dashed var(--line); background:var(--surface-2); text-align:left;">
               <div style="font-size:11px; color:var(--chalk); font-weight:bold; text-transform:uppercase; margin-bottom:8px;">💾 Dados & Backups</div>
               <div style="font-size:10px; color:var(--muted); margin-bottom:12px; line-height:1.4;">Para evitar a perda de dados, exporta um backup regularmente.</div>
               
               ${typeof getAutoSaveStatusHTML === 'function' ? getAutoSaveStatusHTML() : ''}
               
               <div style="display:flex; gap:8px; margin-top:12px; margin-bottom:12px;">
                 <button class="btn btn-gold" style="font-size:11px; font-weight:bold; flex:1;" onclick="event.stopPropagation(); window.exportDataJSON();">📥 ${t('exp_json')}</button>
                 <label class="btn btn-outline" style="font-size:11px; font-weight:bold; flex:1; margin:0; cursor:pointer; text-align:center;">
                   📤 ${t('imp_json')}
                   <input type="file" accept=".json" style="display:none;" onchange="importData(this)">
                 </label>
               </div>
               
               <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--muted); text-transform:uppercase; font-weight:bold; margin-bottom:4px;"><span>Armazenamento</span><span>${sizeKB.toFixed(1)} KB / ~5 MB</span></div>
               <div style="height:6px; background:var(--surface); border-radius:3px; overflow:hidden; margin-bottom:12px;"><div style="height:100%; width:${pct}%; background:${strColor};"></div></div>
               
               <button class="btn btn-red" style="width:100%; font-size:12px;" onclick="event.stopPropagation(); wipeAllData();">🗑️ Limpar Dados (Reset)</button>
             </div>

         </div>
         
         <button class="btn" style="width:100%; margin-top:4px; background:#0E211A; color:#fff; border:1px solid var(--line);" onclick="abrirCreditos()">🤝 Créditos & Parceiros</button>
         <button class="btn btn-outline" style="width:100%; margin-top:10px;" onclick="closeModal()">${t('close')}</button>
         <div style="font-size:9px; color:var(--muted); margin-top:10px;">v3.5.1 | COACHFOLIO</div>
       </div>
     </div>`;
  }

  if(modalConfig.type === 'archiveSeason') {
     return `<div class="modal-overlay"><div class="modal-card"><h3 style="margin-top:0; color:var(--red);">${t('archive_title')}</h3><p style="font-size:13px; text-align:left; color:var(--chalk);">${t('archive_desc')}</p><div style="background:var(--surface); border:1px solid var(--line); border-radius:8px; padding:12px; margin-bottom:20px;"><p style="font-size:12px; font-weight:bold; color:var(--gold); margin-top:0; margin-bottom:10px;">${t('archive_warn')}</p><div style="display:flex; flex-direction:column; gap:8px;"><button class="btn btn-ghost" style="font-size:12px;" onclick="exportSeasonPDF()">📄 ${t('exp_pdf')}</button><button class="btn btn-ghost" style="font-size:12px;" onclick="exportData()">💾 ${t('exp_json')}</button></div></div><div style="display:flex; gap:10px;"><button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button><button class="btn btn-red" onclick="doArchiveSeason()">${t('archive_btn')}</button></div></div></div>`;
  }

  if(modalConfig.type === 'finishMatch') { 
     return `<div class="modal-overlay"><div class="modal-card">
       <p style="font-weight:600; font-size:16px;">${t('msg_not_started')}</p>
       <p style="font-size:13px; margin-bottom:14px;">${t('msg_not_started_desc')}</p>
       
       <div style="background:var(--surface); padding:12px; border-radius:8px; border:1px solid var(--gold); margin-bottom:12px; text-align:left;">
         <div style="font-size:11px; color:var(--gold); text-transform:uppercase; margin-bottom:8px; font-weight:bold;">Duração do Jogo (Minutos)</div>
         <div style="display:flex; gap:10px;">
           <div class="field" style="flex:1; margin-bottom:0;">
             <label>1ª Parte</label>
             <input type="number" id="manual-half1-duration" value="45" min="1" max="120" style="text-align:center; font-weight:bold;">
           </div>
           <div class="field" style="flex:1; margin-bottom:0;">
             <label>2ª Parte</label>
             <input type="number" id="manual-half2-duration" value="45" min="0" max="120" placeholder="Ex: 0" style="text-align:center; font-weight:bold;">
           </div>
         </div>
         <div style="font-size:9px; color:var(--muted); margin-top:8px; line-height:1.3;">Deixa a 2ª Parte a 0 para torneios de Parte Única.</div>
       </div>

       <div style="margin-bottom:16px; text-align:left; background:var(--surface-2); padding:10px; border-radius:8px; border:1px solid var(--line);">
         <label style="display:flex; align-items:center; gap:8px; font-size:11px; color:var(--chalk); cursor:pointer;">
           <input type="checkbox" id="ignore-match-mins" style="width:16px; height:16px; accent-color:var(--gold);">
           Ignorar minutos deste jogo nas estatísticas (Não apontei substituições)
         </label>
       </div>
       <div style="display:flex; flex-direction:column; gap:10px;">
         <button class="btn btn-gold" onclick="confirmFinishMatch('save')">${t('msg_save_game')}</button>
         <button class="btn btn-red" style="flex-direction:column; gap:2px; padding:10px;" onclick="confirmFinishMatch('discard')"><span>${t('msg_exit_nosave')}</span><span style="font-size:10px; font-weight:normal; text-transform:none; letter-spacing:0; opacity:0.8;">${t('msg_exit_desc')}</span></button>
         <button class="btn btn-outline" onclick="confirmFinishMatch('cancel')">${t('cancel')}</button>
       </div>
     </div></div>`; 
  }
  
  if(modalConfig.type === 'safePrint') {
      return `<div class="modal-overlay">
        <div class="modal-card" style="padding: 30px 20px;">
          <div style="font-size:40px; margin-bottom:10px;">✅</div>
          <h3 style="margin-top:0; color:var(--gold);">Documento Preparado</h3>
          <p style="font-size:13px; color:var(--chalk); margin-bottom:20px;">O relatório foi gerado com sucesso em plano de fundo. Clica no botão abaixo para abrir o menu do telemóvel.</p>
          <button class="btn btn-gold" style="width:100%; font-size:15px; padding:12px;" onclick="closeModal(); triggerSafePrint();">🖨️ Abrir Menu / Imprimir</button>
          <button class="btn btn-outline" style="width:100%; margin-top:10px;" onclick="document.getElementById('print-area').innerHTML=''; closeModal();">Cancelar</button>
        </div>
      </div>`;
  }

  if(modalConfig.type === 'safeShare') {
      return `<div class="modal-overlay">
        <div class="modal-card" style="padding: 30px 20px;">
          <div style="font-size:40px; margin-bottom:10px;">✅</div>
          <h3 style="margin-top:0; color:var(--gold);">Tática Preparada</h3>
          <p style="font-size:13px; color:var(--chalk); margin-bottom:20px;">O esquema tático foi desenhado. Clica abaixo para partilhar ou guardar na galeria.</p>
          <button class="btn btn-green" style="width:100%; font-size:15px; padding:12px;" onclick="triggerSafeShare()">📲 Partilhar / Guardar</button>
          <button class="btn btn-outline" style="width:100%; margin-top:10px;" onclick="window.pendingShareFile=null; closeModal();">Cancelar</button>
        </div>
      </div>`;
  } 
  if(modalConfig.type === 'askRatings') {
     return `<div class="modal-overlay"><div class="modal-card">
       <p style="font-size:15px; font-weight:bold; color:var(--chalk); margin-bottom:20px;">${t('msg_ask_rate')}</p>
       <div style="display:flex; flex-direction:column; gap:10px;">
         <button class="btn btn-gold" onclick="closeModal(); pendingRatings=true; render();">${t('msg_yes_rate')}</button>
         <button class="btn btn-outline" onclick="closeModal(); doFinishMatch();">${t('msg_no_rate')}</button>
       </div>
     </div></div>`;
  }
  
return `<div class="modal-overlay"><div class="modal-card"><p>${modalConfig.message}</p><div style="display:flex; gap:10px;"><button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button><button class="btn ${modalConfig.btnClass || 'btn-red'}" onclick="closeModal(); confirmModal();">${t('confirm')}</button></div></div></div>`;}

function topbarHtml(title){ 
  return `<div class="topbar"><div style="display:flex; align-items:center;"><span class="topbar-home" onclick="goHome()" title="${t('nav_home_lbl')}"><span class="topbar-home-icon">${ballIconSvg()}</span><span class="topbar-home-label">${t('nav_home_lbl')}</span></span><h1 style="margin-left:10px;">${title}</h1></div><span class="topbar-settings" onclick="openSettings()">⚙️</span></div>`; 
}
function ballIconSvg(){ return `<svg style="width:100%; height:100%;" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="none" stroke="var(--gold)" stroke-width="4"/><polygon points="50,29 63,39 58,55 42,55 37,39" fill="none" stroke="var(--gold)" stroke-width="3" stroke-linejoin="round"/><path d="M50 29 L50 9 M63 39 L81 30 M58 55 L71 71 M42 55 L29 71 M37 39 L19 30" stroke="var(--gold)" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`; }

function matchNarrativeHtml(m, isLocked = false){
  const tm = m.timeline || {}; const cards = m.cards || []; const subs = m.subs || [];  
  const eventsForHalf = (half) => {
    const goals = m.goals.filter(g=>g.half===half).map(g=>({ type:'goal', minute:g.minute, timestamp:g.timestamp||0, data:g })); 
    const cds = cards.filter(c=>c.half===half).map(c=>({ type:'card', minute:c.minute, timestamp:c.timestamp||0, data:c })); 
    const sbs = subs.filter(s=>s.half===half || (half===1 && s.isHalftime)).map(s=>({ type:'sub', minute:s.isHalftime?'INT':s.minute, timestamp:s.timestamp||0, data:s, isHalftime: s.isHalftime }));
    return [...goals, ...cds, ...sbs].sort((a,b)=>{ 
      if(a.isHalftime && !b.isHalftime) return 1; 
      if(!a.isHalftime && b.isHalftime) return -1; 
      const minA = a.minute==null?999:a.minute;
      const minB = b.minute==null?999:b.minute;
      if(minA !== minB) return minA - minB;
      return a.timestamp - b.timestamp; // Desempate por milissegundo exato
    });
  };
  const formatExactHalf = (ms) => {
    if(ms == null) return '';
    const totalSecs = Math.floor(ms / 1000); const mm = Math.floor(totalSecs / 60); const ss = totalSecs % 60;
    return `(⏱️ ${mm}' ${String(ss).padStart(2,'0')}'' )`;
  };

  // 3. Atualização da representação visual na Linha do Tempo / Narrativa do Jogo
  // Função interna goalRow dentro de matchNarrativeHtml:
  const goalRow = (g) => {
    let subTag = g.goalSubtype === 'penalti' ? ' (Penálti)' : (g.goalSubtype === 'autogolo' ? ' (Autogolo)' : '');
    let desc = '';
  
    if (g.type === 'scored') {
      if (g.scorerId === 'autogolo') {
        desc = `⚽ Autogolo (Adversário)`;
      } else {
        desc = `⚽ ${playerName(g.scorerId)}${subTag}${g.assistId && g.assistId !== 'none' ? ' (ast. ' + playerName(g.assistId) + ')' : ''}`;
      }
    } else {
      let ownGoalPlayer = g.scorerId ? ` [${playerName(g.scorerId)}]` : '';
      desc = `🥅 ${t('rep_conc')}${subTag}${ownGoalPlayer}`;
    }

    return `<div class="goal-row">
      <span>
        ${g.minute != null ? `<span class="mono" style="color:var(--gold);">${window.getGlobalMinuteDisplay(m, g.half, g.minute)}'</span> ` : ''}
        ${desc}
      </span>
      ${!isLocked ? `<span><button class="del" style="color:var(--muted); margin-right:2px;" onclick="event.stopPropagation(); editEventMinute('${m.id}','goal','${g.id}')">✎</button><button class="del" onclick="event.stopPropagation(); askConfirm('${t('msg_del_goal')}', ()=>deleteGoal('${m.id}', '${g.id}'))">✕</button></span>` : ''}
    </div>`;
};
  const cardRow = (c) => `<div class="goal-row"><span>${c.minute!=null?`<span class="mono" style="color:var(--gold);">${window.getGlobalMinuteDisplay(m, c.half, c.minute)}'</span> `:''}${c.color==='Amarelo'?'🟨':'🟥'} ${playerName(c.playerId)}</span>${!isLocked ? `<span><button class="del" style="color:var(--muted); margin-right:2px;" onclick="event.stopPropagation(); editEventMinute('${m.id}','card','${c.id}')">✎</button><button class="del" onclick="event.stopPropagation(); askConfirm('${t('msg_del_card')}', ()=>deleteCard('${m.id}', '${c.id}'))">✕</button></span>` : ''}</div>`;
  const subRow = (s) => `<div class="goal-row"><span><span class="mono" style="color:var(--gold);">${s.isHalftime ? 'INT' : (s.minute!=null?window.getGlobalMinuteDisplay(m, s.data.half, s.minute)+"'":"")}</span> 🔄 <span style="color:var(--red)">↓ ${playerName(s.data.outId)}</span> <span style="color:var(--green)">↑ ${playerName(s.data.inId)}</span></span>${!isLocked ? `<span>${!s.isHalftime ? `<button class="del" style="color:var(--muted); margin-right:2px;" onclick="event.stopPropagation(); editEventMinute('${m.id}','sub','${s.data.id}')">✎</button>` : ''}<button class="del" onclick="event.stopPropagation(); askConfirm('${t('msg_del_sub')}', ()=>deleteSub('${m.id}', '${s.data.id}'))">✕</button></span>` : ''}</div>`;


  let rows = ''; const h1 = eventsForHalf(1); const h2 = eventsForHalf(2); const h1_regular = h1.filter(e => !e.isHalftime); const h1_int = h1.filter(e => e.isHalftime);
  
  let h1TimeLabel = (m.timer && m.timer.half1DurationMs != null) ? formatExactHalf(m.timer.half1DurationMs) : '';
  let h2TimeLabel = (m.timer && m.timer.half2DurationMs != null) ? formatExactHalf(m.timer.half2DurationMs) : '';

  if(h1.length || tm.kickoff) { rows += `<div style="font-size:11px; color:var(--gold); font-family:-apple-system, sans-serif; text-transform:uppercase; margin:8px 0 4px; font-weight:600; display:flex; justify-content:space-between;"><span>⏱️ ${t('match_half1')}</span><span style="color:var(--muted);">${h1TimeLabel}</span></div>`; rows += h1_regular.map(e => e.type==='goal'?goalRow(e.data):(e.type==='card'?cardRow(e.data):subRow(e))).join(''); }
  if(tm.halftime || h1_int.length > 0) { rows += `<div style="font-size:11px; color:var(--muted); font-family:-apple-system, sans-serif; text-transform:uppercase; margin:12px 0 8px; font-weight:600; text-align:center; border-top:1px dashed var(--line); border-bottom:1px dashed var(--line); padding:6px 0;">⏸️ ${t('match_ht_lbl')}</div>`; rows += h1_int.map(e => e.type==='goal'?goalRow(e.data):(e.type==='card'?cardRow(e.data):subRow(e))).join(''); }
  if(h2.length || tm.secondHalfStart) { rows += `<div style="font-size:11px; color:var(--gold); font-family:-apple-system, sans-serif; text-transform:uppercase; margin:14px 0 4px; font-weight:600; display:flex; justify-content:space-between;"><span>⏱️ ${t('match_half2')}</span><span style="color:var(--muted);">${h2TimeLabel}</span></div>`; rows += h2.map(e => e.type==='goal'?goalRow(e.data):(e.type==='card'?cardRow(e.data):subRow(e))).join(''); }
  return rows || `<div class="empty">${t('res_none')}</div>`;
}

function renderHome(){
  const active = getActiveMatch(); 
  let backupWarning = '';

  if(state.lastBackupDate && state.matches.length > 0) { 
    const daysSince = (Date.now() - state.lastBackupDate) / (1000 * 60 * 60 * 24); 
    if(daysSince > 7) {
      backupWarning = `<div class="warning-banner" style="background:var(--red); color:var(--btn-red-txt); padding:10px 14px; border-radius:10px; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between; font-size:11px;">
        <span>⚠️ <b>Backup Atrasado (+7 dias)</b></span>
        <button class="btn btn-gold" style="padding: 4px 8px; font-size: 10px; flex:none;" onclick="window.exportDataJSON()">Exportar Já</button>
      </div>`; 
    }
  }

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  let installWarning = '';
  if (!isStandalone) {
    installWarning = `<div class="warning-banner" style="background:var(--surface-2); border:1px solid var(--gold); color:var(--chalk); padding:10px 14px; border-radius:10px; margin-bottom:12px; text-align:left; font-size:11px; line-height:1.4;">
      <b style="color:var(--gold); display:block; margin-bottom:4px;">📲 Instalar Aplicação</b>
      Para evitares a perda de dados, toca em Partilhar e <b>"Adicionar ao Ecrã Principal"</b>.
    </div>`;
  }

  let bdayHtml = ''; 
  const nextBday = getNextBirthday();
  if(nextBday) {
    let msg = '';
    if(nextBday.days === 0) {
      msg = `🎂 Hoje é o aniversário de <b>${nextBday.player.name}</b>! 🎉`;
    } else {
      msg = `🎂 Próximo aniversário: <b>${nextBday.player.name}</b> (${nextBday.days} dia${nextBday.days > 1 ? 's' : ''})`; 
    }
    bdayHtml = `<div style="background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:10px 12px; margin-bottom:12px; font-size:12px; text-align:center;">${msg}</div>`;
  }

  let nextMatchHtml = '';
  const upcomingGames = (state.schedule || [])
    .filter(s => (s.season || state.currentSeason) === state.currentSeason)
    .sort((a,b) => new Date(a.date+'T'+a.time) - new Date(b.date+'T'+b.time));

  if (upcomingGames.length > 0) {
    const nm = upcomingGames[0];
    const dateParts = nm.date.split('-');
    const dateStr = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : nm.date;
    
    const timeParts = nm.time.split(':');
    let d = new Date();
    d.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]));
    d.setHours(d.getHours() - 1);
    const meetTime = String(d.getHours()).padStart(2, '0') + 'h' + String(d.getMinutes()).padStart(2, '0');

    nextMatchHtml = `
      <div style="background:var(--surface); border:1px solid var(--gold); border-radius:12px; padding:12px; margin-bottom:12px; text-align:left;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <span style="font-size:10px; color:var(--gold); font-weight:bold; text-transform:uppercase;">📅 Próximo Jogo</span>
          <span style="font-size:10px; color:var(--muted);">${dateStr} às ${nm.time}</span>
        </div>
        <div style="font-size:14px; font-weight:bold; color:var(--chalk); margin-bottom:4px;">
          ${nm.location === 'casa' ? `${getMyClub()} vs ${nm.opponent}` : `${nm.opponent} vs ${getMyClub()}`}
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
          <span style="font-size:11px; color:var(--muted);">📍 Comparência: <b>${meetTime}</b></span>
          <button class="btn btn-gold" style="font-size:10px; padding:4px 8px; flex:none;" onclick="expandedSchedule='${nm.id}'; navigateToHub('planeamento');">Convocatória 📋</button>
        </div>
      </div>`;
  }

  let pendingTrainingsHtml = '';
  const todayStr = new Date().toISOString().slice(0,10);
  const pendingTrs = (state.trainings || [])
    .filter(t => t.status === 'pending')
    .sort((a,b) => new Date(a.date) - new Date(b.date));

  if (pendingTrs.length > 0) {
    const nt = pendingTrs[0];
    const dateParts = nt.date.split('-');
    const dateStr = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : nt.date;
    const isPast = nt.date < todayStr;

    const labelTitle = isPast ? `🔴 Treino Pendente (${dateStr})` : `🟡 Próximo Treino (${dateStr})`;
    const labelColor = isPast ? `var(--red)` : `var(--yellow)`;
    const labelSub = isPast ? `Sessão em atraso (por concluir)` : `${pendingTrs.length} sessão(ões) agendada(s)`;

    pendingTrainingsHtml = `
      <div style="background:var(--surface-2); border:1px solid ${labelColor}; border-radius:12px; padding:10px 12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
        <div style="text-align:left;">
          <div style="font-size:11px; font-weight:bold; color:${labelColor};">${labelTitle}</div>
          <div style="font-size:10px; color:var(--muted);">${labelSub}</div>
        </div>
        <button class="btn btn-green" style="font-size:10px; padding:6px 10px; flex:none;" onclick="navigateToHub('planeamento'); navigateToTab('treinos');">Ver Treinos 🟢</button>
      </div>`;
  }
  let formHtml = '';
  const seasonFinishedMatches = (state.matches || [])
    .filter(m => m.finished && (m.season || state.currentSeason) === state.currentSeason)
    .sort((a,b) => new Date(a.date) - new Date(b.date))
    .slice(-5);

  if(seasonFinishedMatches.length > 0) {
    const formDots = seasonFinishedMatches.map(m => {
      const sc = (m.goals||[]).filter(g=>g.type==='scored').length; 
      const co = (m.goals||[]).filter(g=>g.type==='conceded').length;
      const res = sc > co ? 'V' : (sc === co ? 'E' : 'D');
      const color = res === 'V' ? 'var(--green)' : (res === 'E' ? 'var(--yellow)' : 'var(--red)');
      return `<div style="background:${color}; color:#000; width:22px; height:22px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-weight:bold; font-size:11px;">${res}</div>`;
    }).join('<span style="color:var(--muted); margin:0 3px;">-</span>');
    
    formHtml = `
    <div style="background:var(--surface); border:1px solid var(--line); border-radius:12px; padding:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
      <span style="font-size:10px; color:var(--muted); font-weight:bold; text-transform:uppercase; letter-spacing:0.05em;">Forma (Últ. ${seasonFinishedMatches.length})</span>
      <div style="display:flex; align-items:center;">${formDots}</div>
    </div>`;
  }
  return `<div class="home-screen">
    <div class="home-pitch-bg">
      <svg preserveAspectRatio="xMidYMid meet" style="width:100%; height:100%; max-width: 400px;" viewBox="0 0 400 600">
        <rect x="20" y="20" width="360" height="560" fill="none" stroke="var(--chalk)" stroke-opacity="0.18" stroke-width="2"/>
        <line x1="20" y1="300" x2="380" y2="300" stroke="var(--chalk)" stroke-opacity="0.18" stroke-width="2"/>
        <circle cx="200" cy="300" r="62" fill="none" stroke="var(--chalk)" stroke-opacity="0.18" stroke-width="2"/>
        <rect x="85" y="20" width="230" height="95" fill="none" stroke="var(--chalk)" stroke-opacity="0.18" stroke-width="2"/>
        <rect x="140" y="20" width="120" height="38" fill="none" stroke="var(--chalk)" stroke-opacity="0.18" stroke-width="2"/>
        <rect x="85" y="485" width="230" height="95" fill="none" stroke="var(--chalk)" stroke-opacity="0.18" stroke-width="2"/>
        <rect x="140" y="542" width="120" height="38" fill="none" stroke="var(--chalk)" stroke-opacity="0.18" stroke-width="2"/>
      </svg>
    </div>
    <div class="home-content">
      ${backupWarning}
      ${installWarning}
      <div class="topbar-settings" style="position:absolute; top:0; right:0;" onclick="openSettings()">⚙️</div>
      <div class="home-ball">${ballIconSvg()}</div>
      <h1>${t('home_title')}</h1>
      <div class="home-sub" style="margin-bottom:2px; font-size:13px; color:var(--gold);">${getClubAndEscalao()}</div>
      <div style="font-size:11px; color:var(--gold); margin-bottom:14px; font-weight:bold; letter-spacing:0.5px;">by Pedro Silva</div>
      
      ${bdayHtml}
      ${pendingTrainingsHtml}
      ${nextMatchHtml}
      ${formHtml}

      ${active ? `<button class="home-btn" style="margin-bottom:12px; border-color:var(--gold);" onclick="navigateToHub('jogo')"><span class="home-btn-icon"><svg style="width:24px; height:24px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></span>${t('home_cont')}</button>` : ''}
      
      <div class="home-menu">
        <div class="home-hub-card" onclick="navigateToHub('planeamento')"><div class="home-hub-icon"><svg style="width:22px; height:22px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div class="home-hub-text"><h2>${t('hub_plan_title')}</h2><p>${t('hub_plan_desc')}</p></div></div>
        <div class="home-hub-card" onclick="navigateToHub('jogo')"><div class="home-hub-icon"><svg style="width:22px; height:22px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></div><div class="home-hub-text"><h2>${t('hub_match_title')}</h2><p>${t('hub_match_desc')}</p></div></div>
        <div class="home-hub-card" onclick="navigateToHub('estrategia')"><div class="home-hub-icon"><svg style="width:22px; height:22px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="12" x2="21" y2="12"/><circle cx="12" cy="12" r="3"/></svg></div><div class="home-hub-text"><h2>${t('hub_strat_title')}</h2><p>${t('hub_strat_desc')}</p></div></div>
        <div class="home-hub-card" onclick="navigateToHub('equipa')"><div class="home-hub-icon"><svg style="width:22px; height:22px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10M12 20V4M20 20v-7"/></svg></div><div class="home-hub-text"><h2>${t('hub_team_title')}</h2><p>${t('hub_team_desc')}</p></div></div>
      </div>
    </div>
  </div>`;
}

function renderJogoSubHeader() { return `<div class="seg" style="margin-bottom:14px;"><div class="seg-btn ${currentTab==='jogo'?'active':''}" onclick="navigateToTab('jogo')">${t('match_curr')}</div><div class="seg-btn ${currentTab==='jogos'?'active':''}" onclick="navigateToTab('jogos')">${t('res_title')}</div></div>`; }
function renderPlanSubHeader() { return `<div class="seg" style="margin-bottom:14px;"><div class="seg-btn ${currentTab==='calendario'?'active':''}" onclick="navigateToTab('calendario')">${t('sch_title')}</div><div class="seg-btn ${currentTab==='treinos'?'active':''}" onclick="navigateToTab('treinos')">${t('tr_title')}</div>${state.enableDiary ? `<div class="seg-btn ${currentTab==='diario'?'active':''}" onclick="navigateToTab('diario')">${t('diary_title')}</div>` : ''}</div>`; }
function renderStratSubHeader() { 
  return `<div class="seg" style="margin-bottom:14px;">
    <div class="seg-btn ${currentTab==='tatica'?'active':''}" onclick="navigateToTab('tatica')">${t('tac_title')}</div>
    <div class="seg-btn ${currentTab==='caderno'?'active':''}" onclick="navigateToTab('caderno')">📋 Minhas Jogadas</div>
    ${state.enableVideos ? `<div class="seg-btn ${currentTab==='videos'?'active':''}" onclick="navigateToTab('videos')">${t('vid_title')}</div>` : ''}
  </div>`; 
}
function renderTeamSubHeader() { return `<div class="seg" style="margin-bottom:14px;"><div class="seg-btn ${currentTab==='plantel'?'active':''}" onclick="navigateToTab('plantel')" style="font-size:9px; padding:8px 4px;">${t('pl_title')}</div><div class="seg-btn ${currentTab==='stats'?'active':''}" onclick="navigateToTab('stats')" style="font-size:9px; padding:8px 4px;">${t('st_title')}</div>${state.enableFines ? `<div class="seg-btn ${currentTab==='caixinha'?'active':''}" onclick="navigateToTab('caixinha')" style="font-size:9px; padding:8px 4px;">${t('fine_title')}</div>` : ''}${state.enableLeagues ? `<div class="seg-btn ${currentTab==='classificacoes'?'active':''}" onclick="navigateToTab('classificacoes')" style="font-size:9px; padding:8px 4px;">${t('lg_title')}</div>` : ''}</div>`; }
function renderJogo(){
  const m = getActiveMatch();
  if(!m) return `${topbarHtml(t('hub_match_title'))}${renderJogoSubHeader()}<div style="text-align:center; margin-top:40px;"><div class="empty">${t('match_none')}</div><button class="btn btn-gold" style="width:100%; max-width:300px; margin:20px auto 0;" onclick="navigateToTab('calendario')">${t('match_goto_sch')}</button></div>`;

  const scored = m.goals.filter(g=>g.type==='scored').length; 
  const conceded = m.goals.filter(g=>g.type==='conceded').length;
  const matchStarted = m.timeline && m.timeline.kickoff; 
  const isMatchEnded = m.timeline && m.timeline.fullTime;
  const locLabel = (m.location||'casa') === 'casa' ? t('match_home') : t('match_away');
  const isManualMode = !!m.manualMode;
  const isGameActive = matchStarted || isManualMode; 
  const isSingleHalf = m.singleHalf || m.numberOfHalves === 1;
  const needsLineup = state.trackSubs && (!m.lineup || m.lineup.length === 0);

  // A MAGIA DO ALOQUETE
  const isUnlocked = !!m.actionsUnlocked;
  const showMinInput = isManualMode || isUnlocked;

  let dynamicPanel = '';
  
  if(pendingCaptain){
    let captainChips = eligiblePlayers().length ? eligiblePlayers().map(p=>`<div class="chip chip-sm ${m.capitao===p.id?'active-green':''}" onclick="setCaptain('${m.id}','${p.id}')">${playerLabel(p)}</div>`).join('') : `<div class="empty" style="grid-column:1/-1;">${t('pl_none')}</div>`;
    dynamicPanel = `<div class="panel" style="border-color:var(--gold);"><div class="panel-title" style="color:var(--gold);">${t('match_cap')}</div><div class="grid-btns cols-4">${captainChips}</div><button class="btn btn-outline" style="width:100%; margin-top:10px;" onclick="pendingCaptain=false; render()">${t('cancel')}</button></div>`;
  } 
  // 👇 A MAGIA ACONTECE AQUI! O MEIO-CAMPO PASSA A BOLA AO ESPECIALISTA 👇
  else if(pending && (pending.kind === 'scored' || pending.kind === 'conceded')){
    if (typeof window.getGoalInputPanelHTML === 'function') {
        dynamicPanel = window.getGoalInputPanelHTML(m, isManualMode);
    } else {
        dynamicPanel = '<div class="panel"><div class="empty">Erro: Função de golos não encontrada.</div><button class="btn btn-outline" style="width:100%; margin-top:10px;" onclick="pending=null; render()">Cancelar</button></div>';
    }
  }
  // 👆 FIM DA CHAMADA AO ESPECIALISTA 👆
  else if(pendingCard && !pendingCard.half){
    dynamicPanel = `<div class="panel"><div class="panel-title">${t('match_conc_half')}</div><div class="grid-btns"><div class="chip" onclick="pendingCard.half=1; render()">${t('match_half1')}</div><div class="chip" onclick="pendingCard.half=2; render()">${t('match_half2')}</div></div><button class="btn btn-outline" style="width:100%; margin-top:10px;" onclick="pendingCard=null; render()">${t('cancel')}</button></div>`;
  } else if(pendingCard){
    let cardChips = `<div class="chip chip-sm" style="border-color:var(--red); color:var(--red);" onclick="addCard('${m.id}', 'opp', pendingCard.color, pendingCard.half)">Adversário</div>`;
    cardChips += eligiblePlayers().length ? eligiblePlayers().map(p=>`<div class="chip chip-sm" onclick="addCard('${m.id}', '${p.id}', pendingCard.color, pendingCard.half)">${playerLabel(p)}</div>`).join('') : '';
    dynamicPanel = `<div class="panel"><div class="panel-title">${t('match_card_who', {color: t(pendingCard.color==='Amarelo'?'match_yellow':'match_red')})}</div><div class="grid-btns cols-4">${cardChips}</div><button class="btn btn-outline" style="width:100%; margin-top:10px;" onclick="pendingCard=null; render()">${t('cancel')}</button></div>`;
  } else if(pendingSub && !pendingSub.half) {
     dynamicPanel = `<div class="panel"><div class="panel-title">${t('match_conc_half')}</div><div class="grid-btns"><div class="chip" onclick="pendingSub.half=1; render()">${t('match_half1')}</div><div class="chip" onclick="pendingSub.half=2; render()">${t('match_half2')}</div></div><button class="btn btn-outline" style="width:100%; margin-top:10px;" onclick="pendingSub=null; render()">${t('cancel')}</button></div>`;
  } else if(pendingSub) {
     const currHalfVal = pendingSub.half; 
     const isHT = currHalfVal === 'halftime';
     const onPitchIds = getPlayersOnPitchAtEndOfHalf(m, isHT ? 1 : (currHalfVal||1)); 
     const onPitchPlayers = sortPlayerObjs(onPitchIds.map(id => state.roster.find(p=>p.id===id)).filter(Boolean));
     const onBench = eligiblePlayers().filter(p => !onPitchIds.includes(p.id));

     dynamicPanel = `
        <div class="panel" style="border-color:var(--gold);">
           <div class="panel-title" style="color:var(--gold);">${t('match_sub_title')} ${isHT ? `(${t('match_ht')})` : ''}</div>
           ${(!isHT && showMinInput) ? `<div class="field" style="margin-bottom:10px;"><label>Minuto</label><input type="number" id="manual-sub-min" placeholder="Ex: 22" value="${document.getElementById('manual-sub-min')?.value || ''}" style="text-align:center; font-weight:bold;"></div>` : ''}
           <div style="display:flex; gap:10px;">
             <div style="flex:1;">
               <div style="font-size:10px; color:var(--red); text-transform:uppercase; font-weight:600;">${t('match_sub_out')}</div>
               <div style="display:flex; flex-direction:column; gap:4px; margin-top:6px; max-height:180px; overflow-y:auto;">
                 ${onPitchPlayers.map(p => `<button class="card-mini-btn ${pendingSub.outId===p.id?'red':''}" style="border:1px solid ${pendingSub.outId===p.id?'var(--red)':'var(--line)'}; color:${pendingSub.outId===p.id?'var(--red)':'var(--chalk)'};" onclick="pendingSub.outId='${p.id}'; render()">${playerLabel(p)}</button>`).join('')}
               </div>
             </div>
             <div style="flex:1;">
               <div style="font-size:10px; color:var(--green); text-transform:uppercase; font-weight:600;">${t('match_sub_in')}</div>
               <div style="display:flex; flex-direction:column; gap:4px; margin-top:6px; max-height:180px; overflow-y:auto;">
                 ${onBench.map(p => `<button class="card-mini-btn ${pendingSub.inId===p.id?'active-green':''}" style="border:1px solid ${pendingSub.inId===p.id?'var(--green)':'var(--line)'}; color:${pendingSub.inId===p.id?'var(--green)':'var(--chalk)'};" onclick="pendingSub.inId='${p.id}'; render()">${playerLabel(p)}</button>`).join('')}
               </div>
             </div>
           </div>
           <div style="display:flex; gap:10px; margin-top:12px;">
             <button class="btn btn-outline" style="padding:8px;" onclick="pendingSub=null; render()">${t('cancel')}</button>
             <button class="btn btn-gold" style="padding:8px;" ${(!pendingSub.outId || !pendingSub.inId) ? 'disabled' : ''} onclick="confirmSub('${m.id}', document.getElementById('manual-sub-min')?.value)">${t('confirm')}</button>
           </div>
        </div>
     `;
  }

  let lineupPanel = '';
  if(needsLineup && !isGameActive) {
     lineupPanel = `<div class="panel" style="border-color:var(--gold);"><div class="panel-title" style="color:var(--gold);">${t('match_start_xi')} (${pendingLineupSet.length}/${state.tacticFormat})</div><div class="grid-btns cols-4">${eligiblePlayers().map(p => `<div class="chip chip-sm ${(pendingLineupSet).includes(p.id) ? 'active-green' : ''}" onclick="togglePendingLineup('${p.id}')">${playerLabel(p)}</div>`).join('')}</div><button class="btn btn-gold" style="width:100%; margin-top:10px;" ${pendingLineupSet.length !== state.tacticFormat ? 'disabled':''} onclick="confirmLineup('${m.id}')">${t('match_conf_xi')}</button></div>`;
  } else if (state.trackSubs && m.lineup && m.lineup.length > 0) {
     lineupPanel = `<div style="display:flex; gap:8px; justify-content:center; margin-top:12px; margin-bottom:8px;">
       ${!isGameActive && (!isMatchEnded || isUnlocked) ? `<button class="card-mini-btn" style="border:1px solid var(--muted); color:var(--muted); background:transparent;" onclick="window.editLineup('${m.id}')">✏️ Alterar Equipa Inicial</button>` : ''}
       <button class="card-mini-btn" style="border:1px solid var(--gold); color:var(--gold); background:transparent;" onclick="window.openMatchTacticalBoard('${m.id}')">📋 Esquema Tático do Jogo</button>
     </div>`;
  }
  let ratingsPanel = '';
  if(pendingRatings){
      ratingsPanel = `<div style="margin-bottom:12px; padding:10px; background:var(--surface-2); border-radius:8px; border:1px solid var(--gold);"><div class="panel-title" style="color:var(--gold); margin-bottom:8px;">${t('match_rate_pls')}</div><div style="display:flex; flex-direction:column; gap:8px; max-height:260px; overflow-y:auto; padding-right:4px;">${eligiblePlayers().map(p => { const r = (m.ratings && m.ratings[p.id]) || 0; let starsHtml = ''; for(let i=1; i<=5; i++){ starsHtml += `<span style="font-size:24px; line-height:1; cursor:pointer; margin:0 2px; color:${i<=r ? 'var(--gold)' : 'var(--line)'};" onclick="setRating('${m.id}', '${p.id}', ${i})">★</span>`; } return `<div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:6px; border-bottom:1px solid var(--line);"><span style="font-size:13px;">${playerLabel(p)}</span><div style="display:flex; align-items:center;">${starsHtml}</div></div>`; }).join('')}</div></div>`;
  } else if (isMatchEnded) { ratingsPanel = `<button class="btn btn-outline" style="width:100%; padding: 10px; font-size:12px; margin-bottom:12px;" onclick="pendingRatings=true; render()">${t('match_rate_edit')}</button>`; }

  let finalBtnLabel = pendingRatings ? t('match_save_rate') : (isMatchEnded ? t('match_save_rep') : t('match_save_btn'));
  let finalBtnStyle = pendingRatings ? 'btn-gold' : 'btn-ghost';
  
  return `
    ${topbarHtml(t('hub_match_title'))}
    ${renderJogoSubHeader()}
    <div class="card chrono-card">
      <div class="chrono-time" id="live-timer">${isManualMode ? 'HISTÓRICO' : formatMatchTime(window.getMatchDisplayTimeMs(m))}</div>
      ${(!m.timeline || !m.timeline.kickoff) ? (!needsLineup ? (!isManualMode ? `<button class="btn btn-green" style="padding:8px 20px; font-size:12px; margin: 10px auto 0; display: block;" onclick="askConfirm('${t('msg_ko')}', ()=>setMatchTimeMark('${m.id}','kickoff'), 'btn-green')">${t('match_kickoff')}</button><button class="btn btn-outline" style="padding:6px 16px; font-size:11px; margin: 10px auto 0; display: block; border-style:dashed;" onclick="askConfirm('Tens a certeza que queres registar este jogo em Modo Histórico? O cronómetro não será utilizado.', ()=>enableManualMode('${m.id}'), 'btn-gold')">📝 Registar Jogo Histórico (Sem Relógio)</button>` : `<div style="font-size:11px; color:var(--gold); text-transform:uppercase; margin-top:10px; font-weight:700;">📝 Modo Histórico Ativo</div>`) : '') : ''}
       ${(m.timeline && m.timeline.kickoff && !m.timeline.halftime && !m.timeline.fullTime) ? `<div style="display:flex; justify-content:center; gap:8px; margin-top:10px;">${m.timer.isRunning ? `<button class="btn btn-outline" style="padding:8px 20px; font-size:12px; flex:none; border-color:var(--muted); color:var(--muted);" onclick="pauseMatchTimer('${m.id}')">${t('match_pause')}</button>` : `<button class="btn btn-gold" style="padding:8px 20px; font-size:12px; flex:none;" onclick="resumeMatchTimer('${m.id}')">${t('match_resume')}</button>`}${isSingleHalf ? `<button class="btn btn-red" style="padding:8px 20px; font-size:12px; flex:none;" onclick="askConfirm('${t('msg_ft')}', ()=>setMatchTimeMark('${m.id}','fullTime'), 'btn-red')">${t('match_ft')}</button>` : `<button class="btn btn-ghost" style="padding:8px 20px; font-size:12px; flex:none;" onclick="askConfirm('${t('msg_ht')}', ()=>setMatchTimeMark('${m.id}','halftime'), 'btn-gold')">${t('match_ht')}</button>`}</div>` : ''}
       ${(m.timeline && m.timeline.halftime && !m.timeline.secondHalfStart) ? `<button class="btn btn-green" style="padding:8px 20px; font-size:12px; margin: 10px auto 0; display: block;" onclick="askConfirm('${t('msg_2nd')}', ()=>setMatchTimeMark('${m.id}','secondHalfStart'), 'btn-green')">${t('match_2nd')}</button>` : ''}
       ${(m.timeline && m.timeline.secondHalfStart && !m.timeline.fullTime) ? `<div style="display:flex; justify-content:center; gap:8px; margin-top:10px;">${m.timer.isRunning ? `<button class="btn btn-outline" style="padding:8px 12px; font-size:12px; flex:none; border-color:var(--muted); color:var(--muted);" onclick="pauseMatchTimer('${m.id}')">${t('match_pause')}</button>` : `<button class="btn btn-gold" style="padding:8px 12px; font-size:12px; flex:none;" onclick="resumeMatchTimer('${m.id}')">${t('match_resume')}</button>`}<button class="btn btn-red" style="padding:8px 12px; font-size:12px; flex:none;" onclick="askConfirm('${t('msg_ft')}', ()=>setMatchTimeMark('${m.id}','fullTime'), 'btn-red')">${t('match_ft')}</button></div>` : ''}
       ${(isMatchEnded && !m.finished) ? `<div style="font-size:11px; color:var(--red); text-transform:uppercase; margin-top:10px; font-weight:700; letter-spacing: 0.05em;">${t('match_ended')}</div>` : ''}
    </div>
    
    <div class="scoreboard">
      <div class="opponent" style="margin-bottom:4px;"><div style="font-size:15px;">${locLabel.toLowerCase()==='casa'||locLabel.toLowerCase()==='home' ? `${getMyClub()} <span style="font-weight:700; color:var(--chalk); margin:0 4px;">${t('match_vs')}</span> ${m.opponent}` : `${m.opponent} <span style="font-weight:700; color:var(--chalk); margin:0 4px;">${t('match_vs')}</span> ${getMyClub()}`} <span class="badge-loc ${locLabel.toLowerCase()==='casa'||locLabel.toLowerCase()==='home'?'casa':'fora'}">${locLabel}</span></div><span>${m.date}</span></div>
      ${m.capitao ? `<div style="font-size:11px; color:var(--muted); margin-bottom:12px; text-transform:uppercase; font-weight:600; display:flex; align-items:center; gap:8px;"><span>© Capitão: <span style="color:var(--green);">${playerName(m.capitao)}</span></span>${(!isMatchEnded || isUnlocked) ? `<button style="background:none; border:1px solid var(--line); color:var(--chalk); border-radius:4px; padding:2px 6px; font-size:9px; cursor:pointer;" onclick="pendingCaptain=true; render()">${t('match_cap_change')}</button>`:''}</div>` : ((!isMatchEnded || isUnlocked) ? `<div style="margin-bottom:12px;"><button class="card-mini-btn yellow" style="border-color:var(--gold); color:var(--gold);" onclick="pendingCaptain=true; render()">${t('match_cap_btn')}</button></div>` : '')}
      <div class="score-row"><div class="score-block scored"><div class="score-num mono">${scored}</div><div class="score-label">${t('match_scored')}</div></div><div class="score-sep">–</div><div class="score-block conceded"><div class="score-num mono">${conceded}</div><div class="score-label">${t('match_conc')}</div></div></div>
      
      ${(!isMatchEnded || isUnlocked) ? `
         <div class="btn-row">
           <button class="btn btn-gold" onclick="pending={kind:'scored', half: window.resolveEventHalf(getActiveMatch())}; render();" ${(!isGameActive||pending||pendingCard||pendingCaptain||pendingRatings||pendingSub)?'disabled':''}>${t('match_add_goal')}</button>
           <button class="btn btn-red" onclick="const h=window.resolveEventHalf(getActiveMatch()); if(h){ pending={kind:'conceded', half:h}; render(); } else { pending={kind:'conceded', half:null}; render(); }" ${(!isGameActive||pending||pendingCard||pendingCaptain||pendingRatings||pendingSub)?'disabled':''}>${t('match_add_conc')}</button>
         </div>
         ${isGameActive ? `
           <div style="display:flex; gap:8px; justify-content:center; margin-top:10px;">
             <button class="card-mini-btn yellow" onclick="pendingCard={color:'Amarelo', half: window.resolveEventHalf(getActiveMatch())}; render()" ${(pending||pendingCard||pendingCaptain||pendingRatings||pendingSub)?'disabled':''}>${t('match_yellow')}</button>
             <button class="card-mini-btn red" onclick="pendingCard={color:'Vermelho', half: window.resolveEventHalf(getActiveMatch())}; render()" ${(pending||pendingCard||pendingCaptain||pendingRatings||pendingSub)?'disabled':''}>${t('match_red')}</button>
             ${state.trackSubs ? `<button class="card-mini-btn" style="border:1px solid var(--chalk); color:var(--chalk);" onclick="pendingSub={outId:null, inId:null, half: window.resolveEventHalf(getActiveMatch())}; render()" ${(pending||pendingCard||pendingCaptain||pendingRatings||pendingSub)?'disabled':''}>${t('match_sub_title')}</button>` : ''}
           </div>
         ` : ''}
      ` : `
         <div style="margin-top:16px; padding:10px; border-radius:8px; background:var(--surface-2); font-size:11px; text-align:center; color:var(--gold); text-transform:uppercase; font-weight:700; letter-spacing:0.05em; cursor:pointer; border:1px solid var(--gold); box-shadow: 0 4px 6px rgba(0,0,0,0.3);" onclick="const am = getActiveMatch(); if(am){am.actionsUnlocked=true; render();}">
            🔓 Desbloquear Ações de Jogo
         </div>
      `}
      
      ${dynamicPanel}
      ${lineupPanel}
    </div>
    <div class="goal-list" style="border-top:none;">${matchNarrativeHtml(m, !isUnlocked && m.finished)}</div>
    <div class="card" style="margin-top:16px;">${ratingsPanel}<div class="field" style="margin-bottom:0;"><label>${t('match_notes')}</label><textarea id="notes-input" placeholder="${t('match_notes_ph')}" onchange="updateMatchNotes('${m.id}', this.value)">${m.notes || ''}</textarea></div></div>
    <button class="btn ${finalBtnStyle}" style="width:100%; margin-top:6px;" onclick="uiFinishMatch()">${finalBtnLabel}</button>
  `;
}
function renderJogos(){
  if(!state.matches.length) return `${topbarHtml(t('hub_match_title'))}${renderJogoSubHeader()}<div class="empty">${t('res_none')}</div>`;
  const seasons = getSeasonsList(); const query = matchSearchQuery.trim().toLowerCase();
  
  let activeSeason = window.matchSeasonFilter === 'todas' ? state.currentSeason : (window.matchSeasonFilter || state.currentSeason);
  const filtered = state.matches.filter(m=> (activeSeason==='TUDO' || getEntitySeason(m)===activeSeason) && (!query || m.opponent.toLowerCase().includes(query)));
  
  return `${topbarHtml(t('hub_match_title'))}${renderJogoSubHeader()}
    <div class="field"><input id="match-search-input" type="text" placeholder="${t('res_search')}" value="${matchSearchQuery}" oninput="uiUpdateSearch(this.value)"></div>
    ${seasons.length > 1 ? `<div style="margin-bottom:14px; overflow-x:auto; display:flex; gap:6px; padding-bottom:6px;"><div class="seg-btn ${activeSeason==='TUDO'?'active':''}" style="flex:none; padding:8px 12px; font-size:10px;" onclick="window.matchSeasonFilter='TUDO'; render()">${t('res_all')}</div>${seasons.map(s=>`<div class="seg-btn ${activeSeason===s?'active':''}" style="flex:none; padding:8px 12px; font-size:10px;" onclick="window.matchSeasonFilter='${s}'; render()">${s}</div>`).join('')}</div>` : ''}
    ${filtered.length ? filtered.map(m=>{ 
      const sc = m.goals.filter(g=>g.type==='scored').length; 
      const co = m.goals.filter(g=>g.type==='conceded').length; 
      const open = expandedMatch === m.id; 
      let typeLabel = ''; 
      if(m.type === 'campeonato') typeLabel = `${t('sch_champ')}${m.phase ? ' · '+m.phase : ''}${m.matchday ? ' (J:'+m.matchday+')' : ''}`; 
      else if(m.type === 'torneio') typeLabel = `🏆 ${m.tournamentName||t('sch_tour')}${m.phase ? ' · '+m.phase : ''}${m.matchday ? ' (J:'+m.matchday+')' : ''}`; 
      else typeLabel = t('sch_friendly'); 
      
      const locLabel = (m.location||'casa') === 'casa' ? t('match_home') : t('match_away'); 
      const schedId = m.originalSchedule ? m.originalSchedule.id : m.id;
      const hasScouting = m.originalSchedule && m.originalSchedule.scouting;

      let ratingsHtml = ''; 
      if(m.ratings && Object.keys(m.ratings).length > 0){ 
        const ratedPlayers = Object.entries(m.ratings).map(([id, r])=>({name: playerName(id), r})).sort((a,b)=>b.r - a.r); 
        ratingsHtml = `<div class="notes-readonly" style="margin-top:10px;"><b>⭐ ${t('match_rate_pls')}:</b><br>${ratedPlayers.map(p => `<span style="color:var(--gold);">${p.r}★</span> - ${p.name}`).join('<br>')}</div>`; 
      } 
      
      return `<div class="card match-item" onclick="if(!event.target.closest('button') && !event.target.closest('textarea')){ expandedMatch=expandedMatch==='${m.id}'?null:'${m.id}'; render(); }">
        <div class="match-head-row">
          <div class="match-head" style="flex:1;">
            <div>
              <div class="opp">${m.opponent} ${hasScouting ? '👁️' : ''} ${!m.finished ? `<span class="badge-open">${t('res_ongoing')}</span>` : ''}<span class="badge-loc ${locLabel.toLowerCase()==='casa'||locLabel.toLowerCase()==='home'?'casa':'fora'}">${locLabel}</span></div>
              <div class="date">${m.date.split('-').reverse().join('/')} <span class="badge-type">${typeLabel}</span></div>
            </div>
            <div class="match-score"><span class="s">${sc}</span> – <span class="c">${co}</span></div>
          </div>
          <button class="quick-del" onclick="event.stopPropagation(); askConfirm('${t('msg_del_match')}', ()=>deleteMatch('${m.id}'))">🗑</button>
        </div>
        ${open ? `<div class="goal-list">
          ${m.capitao ? `<div style="font-size:11px; color:var(--green); margin-bottom:8px; text-transform:uppercase; font-weight:700;">© Capitão: ${playerName(m.capitao)}</div>` : ''}
          ${matchNarrativeHtml(m, m.finished)}
          ${ratingsHtml}
          ${m.notes?`<div class="notes-readonly" style="margin-top:10px;">📝 ${m.notes}</div>`:''}
          <div class="btn-row" style="margin-top:12px; flex-wrap:wrap; gap:6px;">
            <button class="btn btn-green" style="font-size:10px; padding:8px;" onclick="event.stopPropagation(); shareMatchdayCard('${m.id}')">${t('res_share_matchday')}</button>
            <button class="btn btn-outline" style="font-size:10px; padding:8px;" onclick="event.stopPropagation(); exportMatchPDF('${m.id}')">📄 Relatório PDF</button>
            ${m.originalSchedule ? `<button class="btn btn-ghost" style="font-size:10px; padding:8px; color:var(--gold); border:1px solid var(--gold-dim);" onclick="event.stopPropagation(); window.openScouting('${schedId}')">👁️ Scouting</button>` : ''}
            ${hasScouting ? `<button class="btn btn-outline" style="font-size:10px; padding:8px;" onclick="event.stopPropagation(); window.exportScoutingPDF('${schedId}')">📄 PDF Scouting</button>` : ''}
            ${m.finished ? `<button class="btn btn-outline" style="font-size:10px; padding:8px;" onclick="event.stopPropagation(); reopenMatch('${m.id}')">${t('res_edit')}</button>` : ''}
            ${(m.finished && m.manualMode) ? `<button class="btn btn-outline" style="font-size:10px; padding:8px;" onclick="event.stopPropagation(); editManualDuration('${m.id}')">🕐 Duração</button>` : ''}
            ${m.finished ? `<button class="btn btn-outline" style="font-size:10px; padding:8px; ${m.ignoreMinutes ? 'color:var(--gold); border-color:var(--gold);' : ''}" onclick="event.stopPropagation(); window.toggleIgnoreMinutes('${m.id}')">${m.ignoreMinutes ? '✅ Minutos Ignorados' : '⏱️ Ignorar Minutos'}</button>` : ''}
          </div>
        </div>` : ''}
      </div>`; 
    }).join('') : `<div class="empty">${t('res_none_search')}</div>`}`;
}
window.exportData = function(){ 
  if (!IS_LICENSED) {
    showToast('Ação não permitida nesta licença.', 'btn-red');
    return;
  }

  state.lastBackupDate = Date.now(); 
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'}); 
  const url = URL.createObjectURL(blob); 
  const a = document.createElement('a'); 
  a.href = url; 
  a.download = `coachfolio-backup-${new Date().toISOString().slice(0,10)}.json`; 
  document.body.appendChild(a); 
  a.click(); 
  a.remove(); 
  URL.revokeObjectURL(url); 
  saveState(); 
  render(); 
  showToast(t('msg_bkp_exp')); 
};

function sanitizeData(obj) {
  if (typeof obj === 'string') return escapeHTML(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeData);
  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (let k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        sanitized[k] = sanitizeData(obj[k]);
      }
    }
    return sanitized;
  }
  return obj;
}
window.exportDataJSON = window.exportData;
// 🛡️ O PORTEIRO DO BACKUP: Validação estrita do ficheiro antes de o aceitar
function validateBackupFile(data) {
    if (!data || typeof data !== 'object') throw new Error("Ficheiro não é um objeto válido.");
    
    // Garante que a estrutura principal existe e tem o formato correto (Array)
    const arraysObrigatorios = ['roster', 'matches', 'trainings', 'schedule', 'tactics', 'videos', 'diary', 'leagues'];
    arraysObrigatorios.forEach(key => {
        if (data[key] !== undefined && !Array.isArray(data[key])) {
            throw new Error(`Estrutura corrompida na secção: ${key}`);
        }
    });

    return true; // Se passar nos testes, é seguro entrar!
}

window.importData = function(input) { 
  const file = input.files[0]; 
  if(!file) return; 
  
  const reader = new FileReader(); 
  reader.onload = (e) => { 
    try { 
      const p = JSON.parse(e.target.result); 
      
      // 1. Passa pelo Porteiro
      validateBackupFile(p);
      
      // 2. Só pede confirmação se o ficheiro for válido
      askConfirm(t('msg_overwrite'), () => { 
        state = sanitizeData(p); 
        
        // 3. Garante que os arrays base não vêm a 'null'
        if(!state.roster) state.roster = []; 
        if(!state.matches) state.matches = []; 
        if(!state.trainings) state.trainings = []; 
        if(!state.schedule) state.schedule = []; 
        if(!state.phaseReports) state.phaseReports = {}; 
        if(!state.scoutingBook) state.scoutingBook = {};
        if(!state.tactics) state.tactics = []; 
        if(!state.tacticPaths) state.tacticPaths = []; 
        if(!state.tacticalNotebook) state.tacticalNotebook = []; 
        if(!state.videos) state.videos = []; 
        if(!state.diary) state.diary = []; 
        if(!state.leagues) state.leagues = []; 
        if(!state.fines) state.fines = []; 
        if(!state.staff) state.staff = [];
        
        // 4. Restaurar definições por defeito caso o backup seja muito antigo
        if(!state.teamColor) state.teamColor = '#D9A441'; 
        if(!state.oppColor) state.oppColor = '#C8493F'; 
        if(!state.seasonFormat) state.seasonFormat = 'europeu'; 
        if(!state.currentSeason) state.currentSeason = defaultSeason(); 
        if(state.enableLeagues===undefined) state.enableLeagues=true; 
        if(state.enableFines===undefined) state.enableFines=false; 
        if(state.enableBirthdays===undefined) state.enableBirthdays=false; 
        if(state.trackSubs===undefined) state.trackSubs=true; 
        if(state.keepScreenAwake===undefined) state.keepScreenAwake=false;
        if(state.isActivated===undefined) state.isActivated=true; // Garante que não bloqueia clientes antigos
        
        state.lastBackupDate = Date.now(); 
        saveState(); 
        render(); 
        showToast(t('msg_bkp_imp')); 
      }); 
    } catch(err) { 
      console.error("Erro na importação:", err);
      showToast(t('msg_inv_file')); 
    } 
  }; 
  reader.readAsText(file); 
  input.value = ''; // Limpa o input para poder importar o mesmo ficheiro a seguir se necessário
};
function render(){
  try {
      document.getElementById('nav-lbl-match').textContent = t('nav_hub_match'); document.getElementById('nav-lbl-plan').textContent = t('nav_hub_plan'); document.getElementById('nav-lbl-strat').textContent = t('nav_hub_strat'); document.getElementById('nav-lbl-team').textContent = t('nav_hub_team');
      document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active', b.dataset.hub===currentHub));
      const app = document.getElementById('app'); const nav = document.getElementById('navbar');
      nav.style.display = 'flex'; /* Barra sempre visível */
      if(currentHub === 'home'){ app.innerHTML = renderHome(); } 
      else { 
          if(currentTab==='jogo') app.innerHTML = renderJogo(); else if(currentTab==='jogos') app.innerHTML = renderJogos(); else if(currentTab==='calendario') app.innerHTML = renderCalendario(); else if(currentTab==='treinos') app.innerHTML = renderTreinos(); else if(currentTab==='diario') app.innerHTML = renderDiario(); else if(currentTab==='tatica') { app.innerHTML = renderTatica(); setTimeout(initTacticCanvas, 0); } else if(currentTab==='caderno') app.innerHTML = renderCaderno(); else if(currentTab==='videos') app.innerHTML = renderVideos(); else if(currentTab==='plantel') app.innerHTML = renderPlantel(); else if(currentTab==='stats') app.innerHTML = renderStats(); else if(currentTab==='classificacoes') app.innerHTML = renderClassificacoes(); else if(currentTab==='caixinha') app.innerHTML = renderCaixinha(); 
      }
      
      if (typeof manageWakeLock === 'function') manageWakeLock();
      
  } catch (error) {
      console.error(error);
      const app = document.getElementById('app');
      if (app) {
          app.innerHTML = `<div style="text-align:center; padding:40px 20px; color:var(--chalk);">
            <div style="font-size:50px; margin-bottom:20px;">⚠️</div>
            <h2 style="color:var(--red); text-transform:uppercase;">Erro de Sistema</h2>
            <p style="font-size:14px; margin-bottom:30px; color:var(--muted);">A tática falhou, mas os teus dados estão a salvo. Por favor, exporta a tua base de dados para garantir a segurança da informação.</p>
            <button class="btn btn-gold" style="width:100%; margin-bottom:10px;" onclick="exportData()">💾 Exportar Backup (JSON)</button>
            <button class="btn btn-outline" style="width:100%;" onclick="window.location.reload()">🔄 Recarregar App</button>
          </div>`;
      }
  }
}