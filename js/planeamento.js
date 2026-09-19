/* ==========================================================================
   MODULE: PLANEAMENTO & AGENDA (Treinos, Jogos, Convocatórias, Scouting)
   ========================================================================== */

let trainingForm = null;
let expandedTraining = null;
window.planSeasonFilter = null;
window.exerciseSearchQuery = '';

function getPlanSeasons() {
  const seasons = new Set();
  (state.trainings || []).forEach(t => { if(t.season) seasons.add(t.season); });
  (state.schedule || []).forEach(s => { if(s.season) seasons.add(s.season); });
  if(state.currentSeason) seasons.add(state.currentSeason);
  return Array.from(seasons).sort().reverse();
}

function renderPlanSubHeader() {
  const sub = window.planSubTab || 'treinos';
  return `
  <div class="seg" style="margin-bottom:14px;">
    <div class="seg-btn ${sub==='treinos'?'active':''}" onclick="window.planSubTab='treinos'; render();">🏋️ Treinos</div>
    <div class="seg-btn ${sub==='agenda'?'active':''}" onclick="window.planSubTab='agenda'; render();">📅 Agenda / Jogos</div>
  </div>`;
}

/* ==========================================================================
   TREINOS & SESSÕES DE PREPARAÇÃO
   ========================================================================== */

function renderTreinos() {
  if (trainingForm) { 
    const reasons = [
      { id: 'injustificada', label: '🔴 Injustificada' },
      { id: 'justificada', label: '🟡 Justificada' },
      { id: 'atrasado', label: '🕐 Atrasado' },
      { id: 'lesao', label: '🩹 Lesão / Médico' },
      { id: 'castigo', label: '🟥 Castigo' },
      { id: 'dispensado', label: '⚪ Dispensado' }
    ];

    const baseDuration = parseInt(trainingForm.duration, 10) || 90;

    return `${topbarHtml(trainingForm.id ? '✏️ Editar Treino' : t('tr_new'))}${renderPlanSubHeader()}
      <div class="card">
        <div class="grid-btns">
          <div class="field" style="margin-bottom:0;"><label>${t('sch_date')}</label><input id="tr-date-input" type="date" value="${trainingForm.date}" oninput="trainingForm.date=this.value"></div>
          <div class="field" style="margin-bottom:0;"><label>Duração Total (Min)</label><input id="tr-duration-input" type="number" inputmode="numeric" pattern="[0-9]*" min="15" max="300" step="5" placeholder="Ex: 90" value="${trainingForm.duration || 90}" onclick="this.select()" oninput="trainingForm.duration=parseInt(this.value,10)||'';"></div>
        </div>

        <!-- SELEÇÃO COMPACTA DE EXERCÍCIOS -->
        <div style="margin-top:14px; border-top:1px dashed var(--line); padding-top:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <label style="font-size:11px; color:var(--gold); font-weight:bold; text-transform:uppercase; margin:0;">🏋️ Exercícios do Caderno</label>
            <button class="btn btn-gold" style="font-size:10px; padding:4px 8px;" onclick="openExerciseSelectorModal()">➕ Importar</button>
          </div>

          ${(trainingForm.exercises && trainingForm.exercises.length > 0) ? `
            <div style="display:flex; flex-direction:column; gap:6px; margin-top:8px;">
              ${trainingForm.exercises.map((ex, idx) => `
                <div style="background:var(--surface-2); border:1px solid var(--line); border-radius:8px; padding:6px 10px; display:flex; justify-content:space-between; align-items:center;">
                  <div style="flex:1;">
                    <div style="font-size:12px; font-weight:bold; color:var(--chalk);">${idx + 1}. ${ex.name}</div>
                    <div style="font-size:10px; color:var(--muted); display:flex; align-items:center; gap:6px; margin-top:2px;">
                      <span>Duração:</span>
                      <input type="number" min="1" max="180" value="${ex.duration}" style="width:45px; padding:2px 4px; font-size:11px; text-align:center; background:var(--surface); border:1px solid var(--gold); color:var(--gold); font-weight:bold; border-radius:4px;" onchange="updateExerciseDurationInTraining(${idx}, this.value)">
                      <span>Min</span>
                    </div>
                  </div>
                  <div style="display:flex; gap:4px; align-items:center;">
                    <button class="card-mini-btn" style="border:1px solid var(--gold); color:var(--gold); font-size:9px; padding:3px 6px;" onclick="viewExerciseScheme('${ex.notebookId}')">👁️ Ver</button>
                    <button class="quick-del" style="color:var(--red); font-size:14px; padding:2px 6px;" onclick="removeExerciseFromTraining(${idx})">✕</button>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `<div style="font-size:10px; color:var(--muted); margin-top:4px;">Nenhum exercício importado para esta sessão.</div>`}
        </div>

        <div class="field" style="margin-top:12px; margin-bottom:10px;">
          <label>🏋️‍♂️ Plano de Treino (Gerado/Editável)</label>
          <textarea id="tr-plan-input" placeholder="Ex: 1. Meiinho; 2. Posse de bola..." oninput="trainingForm.plan=this.value; trainingForm.notes=this.value;">${trainingForm.plan || trainingForm.notes || ''}</textarea>
        </div>

        <div class="field" style="margin-bottom:0;">
          <label>📝 Observações</label>
          <textarea id="tr-obs-input" placeholder="Ex: Atitude excelente do grupo..." oninput="trainingForm.obs=this.value">${trainingForm.obs || ''}</textarea>
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
            <button class="btn btn-outline" style="font-size:10px; padding:4px 8px; flex:none;" onclick="event.stopPropagation(); exportTrainingPDF('${tr.id}')">📄 PDF</button>
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
          ${planTxt ? `<div class="notes-readonly">🏋️‍♂️ <b>Plano Geral:</b>\n${planTxt}</div>` : ''}
          ${tr.obs ? `<div class="notes-readonly" style="margin-top:4px;">📝 <b>Notas:</b> ${tr.obs}</div>` : ''}
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

/* ==========================================================================
   AGENDA, CONVOCATÓRIAS & SCOUTING
   ========================================================================== */

function renderAgenda() {
  const seasons = getPlanSeasons();
  let activeFilter = window.planSeasonFilter === 'todas' ? state.currentSeason : (window.planSeasonFilter || state.currentSeason);
  let filterUI = seasons.length > 1 ? `<div style="margin-bottom:14px; overflow-x:auto; display:flex; gap:6px; padding-bottom:6px;"><div class="seg-btn ${activeFilter==='TUDO'?'active':''}" style="flex:none; padding:8px 12px; font-size:10px;" onclick="window.planSeasonFilter='TUDO'; render()">Todas</div>${seasons.map(s=>`<div class="seg-btn ${activeFilter===s?'active':''}" style="flex:none; padding:8px 12px; font-size:10px;" onclick="window.planSeasonFilter='${s}'; render()">${s}</div>`).join('')}</div>` : '';
  
  const filtered = (state.schedule || []).filter(s => activeFilter==='TUDO' || getEntitySeason(s) === activeFilter).sort((a, b) => new Date(b.date) - new Date(a.date));

  return `${topbarHtml(t('hub_plan_title'))}${renderPlanSubHeader()}
    <button class="btn btn-gold" style="width:100%; margin-bottom:14px;" onclick="openScheduleModal()">${t('sch_new')}</button>
    ${filterUI}
    ${filtered.length ? filtered.map(s => {
      const callupCount = (s.callup || []).length;
      const hasScouting = s.scouting && (s.scouting.system || s.scouting.keyPlayers || s.scouting.gamePlan);
      
      return `
      <div class="card match-item">
        <div class="match-head-row">
          <div class="match-head" style="flex:1;">
            <div>
              <div class="opp">VS ${s.opponent} <span class="badge-type">${s.type === 'campeonato' ? '🏆 Campeonato' : (s.type === 'torneio' ? '🎪 Torneio' : '🤝 Amigável')}</span></div>
              <div class="date">📅 ${s.date} às ${s.time} hs · 📍 ${(s.location||'casa').toUpperCase()}</div>
            </div>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <button class="btn btn-outline" style="font-size:10px; padding:4px 8px;" onclick="openCallupModal('${s.id}')">📋 Convocatória (${callupCount})</button>
            <button class="btn btn-outline" style="font-size:10px; padding:4px 8px; color:${hasScouting?'var(--gold)':'var(--chalk)'};" onclick="openScoutingModal('${s.id}')">🕵️ Scouting</button>
            <button class="quick-del" onclick="askConfirm('${t('msg_del_sch')}', ()=>deleteSchedule('${s.id}'))">🗑</button>
          </div>
        </div>
      </div>`;
    }).join('') : `<div class="empty">Sem jogos agendados no calendário.</div>`}`;
}

/* ==========================================================================
   FUNÇÕES AUXILIARES & LÓGICA DOS EXERCÍCIOS
   ========================================================================== */

window.setAbsenceReason = function(pId, reason) {
  if (!trainingForm) return;
  if (!trainingForm.absences) trainingForm.absences = {};
  if (!trainingForm.customMinutes) trainingForm.customMinutes = {};

  if (reason === 'presente') {
    delete trainingForm.absences[pId];
    delete trainingForm.customMinutes[pId];
  } else {
    trainingForm.absences[pId] = reason;
    if (reason === 'atrasado') {
      trainingForm.customMinutes[pId] = Math.round((parseInt(trainingForm.duration, 10) || 90) * 0.5);
    } else if (reason === 'dispensado' || reason === 'lesao' || reason === 'castigo') {
      trainingForm.customMinutes[pId] = 0;
    } else {
      delete trainingForm.customMinutes[pId];
    }
  }
  render();
};

window.setPlayerCustomMinutes = function(pId, mins) {
  if (!trainingForm) return;
  if (!trainingForm.customMinutes) trainingForm.customMinutes = {};
  const val = parseInt(mins, 10);
  const baseDuration = parseInt(trainingForm.duration, 10) || 90;
  trainingForm.customMinutes[pId] = isNaN(val) ? 0 : Math.min(baseDuration, Math.max(0, val));
};

window.quickCompleteTraining = function(trId) {
  const tr = state.trainings.find(t => t.id === trId);
  if (!tr) return;
  tr.status = 'completed';
  saveState();
  render();
  if (typeof showToast === 'function') showToast('Treino marcado como Concluído! 🟢');
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

window.deleteTraining = function(trId) {
  state.trainings = state.trainings.filter(t => t.id !== trId);
  saveState();
  render();
};

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

window.openExerciseSelectorModal = function() {
  window.exerciseSearchQuery = '';
  modalConfig = { type: 'exerciseSelector' };
  const root = document.getElementById('modal-root');
  if (root) root.innerHTML = renderModalHTML();
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

  window.recalculateTrainingPlanAndDuration();
  closeModal();
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
  
  let sumExercisesMins = 0;
  let planLines = [];

  trainingForm.exercises.forEach((ex, i) => {
    const dur = parseInt(ex.duration, 10) || 15;
    sumExercisesMins += dur;
    planLines.push(`${i + 1}. ${ex.name} (${dur} Min)`);
  });

  if (sumExercisesMins > (trainingForm.duration || 90)) {
    trainingForm.duration = sumExercisesMins;
  }

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
  if (typeof loadTacticalPlay === 'function') {
    loadTacticalPlay(notebookId);
  }
};

/* ==========================================================================
   EXPORTAÇÃO DE CONVOCATÓRIAS E SCOUTING PARA PDF
   ========================================================================== */

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
    rowsHtml = '<tr><td colspan="3" style="text-align:center; padding:15px; color:#9CA3AF;">Nenhum jogador selecionado na convocatória.</td></tr>';
  } else {
    called.forEach((p, idx) => {
      const numVal = (p.number !== null && p.number !== undefined && p.number !== '') ? p.number : (idx + 1);
      let bg = idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
      rowsHtml += `
        <tr style="background:${bg}; border-bottom:1px solid #E5E7EB;">
          <td style="text-align:center; font-weight:bold; width:45px; padding:8px 0; color:#0E211A;">${numVal}</td>
          <td style="text-align:left; font-weight:bold; padding-left:12px; color:#111827;">${p.name || 'Sem Nome'}</td>
          <td style="width:180px;"></td>
        </tr>`;
    });
  }

  const selectedStaffIds = s.staffCallup || [];
  const staffList = (state.staff || []).filter(st => selectedStaffIds.includes(st.id));
  let staffRowsHtml = '';
  if (staffList.length === 0) {
    staffRowsHtml = `
      <tr style="border-bottom:1px solid #E5E7EB;">
        <td style="text-align:left; font-weight:bold; padding:8px 12px; color:#111827;">Equipa Técnica / Responsável</td>
        <td style="text-align:center; color:#6B7280;">Treinador / Delegado</td>
        <td style="width:180px;"></td>
      </tr>`;
  } else {
    staffList.forEach((st, idx) => {
      let bg = idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
      staffRowsHtml += `
        <tr style="background:${bg}; border-bottom:1px solid #E5E7EB;">
          <td style="text-align:left; font-weight:bold; padding:8px 12px; color:#111827;">${st.name}</td>
          <td style="text-align:center; font-weight:600; color:#4B5563;">${st.role || 'Equipa Técnica'}</td>
          <td style="width:180px;"></td>
        </tr>`;
    });
  }

  let html = `
    <div class="print-card" style="padding:24px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#111827;">
      <div class="print-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #0E211A; padding-bottom:12px; margin-bottom:18px;">
        <div>
          <h1 style="font-size:20px; margin:0; text-transform:uppercase; letter-spacing:0.05em; color:#0E211A; font-weight:800;">CONVOCATÓRIA OFICIAL</h1>
          <p style="font-size:20px; font-weight:800; margin:4px 0 0 0; color:#D9A441;">${matchTitle}</p>
          <p style="font-size:12px; color:#4B5563; margin-top:2px;">Competição: <b>${compLabel}</b> &nbsp;|&nbsp; Local: <b>${locLabel}</b></p>
        </div>
        ${getClubLogoHtml()}
      </div>

      <div style="display:flex; justify-content:space-around; align-items:center; background:#F3F4F6; padding:12px 16px; border-radius:8px; margin-bottom:20px; border:1px solid #E5E7EB; font-size:13px;">
        <div>📅 <b>Data do Jogo:</b> ${dateStr}</div>
        <div>📍 <b>Hora de Comparência:</b> <span style="font-size:16px; font-weight:bold; color:#0E211A;">${meetTime}</span></div>
      </div>

      <div style="background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px; padding:12px; margin-bottom:20px; page-break-inside:avoid;">
        <h3 style="font-size:11px; font-weight:800; margin:0 0 8px 0; border-bottom:2px solid #0E211A; padding-bottom:4px; text-transform:uppercase; color:#0E211A;">Atletas Convocados (${called.length})</h3>
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
          <thead>
            <tr style="background:#E5E7EB; color:#374151;">
              <th style="width:45px; text-align:center; padding:6px 0;">Núm</th>
              <th style="text-align:left; padding-left:12px;">Nome do Atleta</th>
              <th style="width:180px; text-align:center;">Assinatura / Presença</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>

      <div style="background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px; padding:12px; margin-bottom:20px; page-break-inside:avoid;">
        <h3 style="font-size:11px; font-weight:800; margin:0 0 8px 0; border-bottom:2px solid #0E211A; padding-bottom:4px; text-transform:uppercase; color:#0E211A;">Equipa Técnica Convocada (${staffList.length})</h3>
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
          <thead>
            <tr style="background:#E5E7EB; color:#374151;">
              <th style="text-align:left; padding:6px 12px;">Nome</th>
              <th style="text-align:center;">Cargo / Função</th>
              <th style="width:180px; text-align:center;">Assinatura</th>
            </tr>
          </thead>
          <tbody>
            ${staffRowsHtml}
          </tbody>
        </table>
      </div>

      <div style="margin-top:24px; display:flex; justify-content:space-between; align-items:flex-end;">
        <div style="font-size:10px; color:#6B7280;">
          <p style="margin:2px 0;">• Comparência obrigatória à hora marcada com o equipamento oficial do clube.</p>
          <p style="margin:2px 0;">• Em caso de impedimento de força maior, comunicar com a devida antecedência.</p>
        </div>
        <div style="text-align:center; width:200px; border-top:1.5px solid #111827; padding-top:4px; font-size:11px; font-weight:bold;">
          A Direção / Equipa Técnica
        </div>
      </div>
    </div>`;

  document.getElementById('print-area').innerHTML = html;
  window.openSafePrintModal();
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
    if (typeof showToast === 'function') showToast('Sem dados de scouting para exportar.');
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
      ${getClubLogoHtml()}
    </div>

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

    <div style="background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px; padding:12px; margin-bottom:16px; page-break-inside:avoid;">
      <h3 style="font-size:11px; font-weight:800; margin:0 0 6px 0; border-bottom:1px solid #D1D5DB; padding-bottom:3px; text-transform:uppercase; color:#0E211A;">⚠️ Jogadores-Chave & Alertas Individuais</h3>
      <div style="font-size:11px; line-height:1.5; color:#1F2937; white-space:pre-wrap;">${sc.keyPlayers || 'Sem alertas individuais registados.'}</div>
    </div>

    <div style="background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px; padding:12px; margin-bottom:16px; page-break-inside:avoid;">
      <h3 style="font-size:11px; font-weight:800; margin:0 0 6px 0; border-bottom:1px solid #D1D5DB; padding-bottom:3px; text-transform:uppercase; color:#0E211A;">🎯 Bolas Paradas (Ofensivas / Defensivas)</h3>
      <div style="font-size:11px; line-height:1.5; color:#1F2937; white-space:pre-wrap;">${sc.setPieces || 'Sem observações de bolas paradas registadas.'}</div>
    </div>

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
  window.openSafePrintModal();
};