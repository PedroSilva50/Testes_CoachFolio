// ==========================================
// MÓDULO TÁTICO & QUADRO DE TREINO
// ==========================================

window.removeTacticPieceByPlayerId = function(playerId) {
    if (!state.tactics) return;
    state.tactics = state.tactics.filter(i => i.playerId !== playerId);
    saveState();
    render();
};

window.undoLastTacticPiece = function() {
    if (!state.tactics || state.tactics.length === 0) return;
    state.tactics.pop();
    saveState();
    render();
};

window.spawnTacticItem = function(kind, playerId) {
    if(!state.tactics) state.tactics = [];
    
    let item = { id: uid(), kind: kind, x: 50, y: 50 };
    const formatLimit = state.tacticFormat || 11;
    
    if (kind === 'own') {
        const ownCount = state.tactics.filter(i => i.kind === 'own').length;
        if (ownCount >= formatLimit && !state.tactics.find(i => i.playerId === playerId)) {
            if(typeof showToast === 'function') showToast(`🔒 Limite de ${formatLimit} jogadores atingido!`);
            return;
        }
        const pObj = (state.roster || []).find(x => x.id === playerId);
        item.playerId = playerId || null;
        item.label = pObj ? (pObj.number || pObj.name.split(' ')[0]) : '1';
    } else if (kind === 'opp') {
        const oppCount = state.tactics.filter(i => i.kind === 'opp').length;
        if (oppCount >= formatLimit) {
            if(typeof showToast === 'function') showToast(`🔒 Limite de ${formatLimit} adversários atingido!`);
            return;
        }
        item.label = String(oppCount + 1);
    } else if (kind === 'cone') {
        item.color = '#FF9500';
    } else if (kind === 'minigoal') {
        item.color = '#FFFFFF';
    } else if (kind === 'pole') {
        item.color = '#FF2D55';
    } else if (kind === 'rope') {
        item.color = '#EAB308';
    }
    
    state.tactics.push(item);
    saveState();
    render();
};

window.getTacticItemSVG = function(item) {
    if (item.kind === 'cone') {
        const color = item.color || '#FF9500';
        return `<g>
            <polygon points="-3,4 3,4 1.5,-4 -1.5,-4" fill="${color}" stroke="#000" stroke-width="0.5"/>
            <ellipse cx="0" cy="4" rx="4" ry="1.5" fill="${color}" stroke="#000" stroke-width="0.5"/>
        </g>`;
    } 
    if (item.kind === 'minigoal') {
        return `<g>
            <rect x="-5" y="-3" width="10" height="6" rx="1" fill="none" stroke="#FFFFFF" stroke-width="1.5"/>
            <line x1="-5" y1="-3" x2="5" y2="-3" stroke="#FF3B30" stroke-width="1"/>
        </g>`;
    }
    if (item.kind === 'pole') {
        const color = item.color || '#FF2D55';
        return `<g>
            <circle cx="0" cy="0" r="2" fill="${color}" stroke="#000" stroke-width="0.5"/>
            <line x1="0" y1="0" x2="0" y2="-6" stroke="${color}" stroke-width="1.5"/>
        </g>`;
    }
    if (item.kind === 'rope') {
        const color = item.color || '#EAB308';
        return `<g>
            <line x1="-8" y1="-3" x2="8" y2="-3" stroke="${color}" stroke-width="0.8"/>
            <line x1="-8" y1="3" x2="8" y2="3" stroke="${color}" stroke-width="0.8"/>
            <line x1="-6" y1="-3" x2="-6" y2="3" stroke="${color}" stroke-width="0.8"/>
            <line x1="-2" y1="-3" x2="-2" y2="3" stroke="${color}" stroke-width="0.8"/>
            <line x1="2" y1="-3" x2="2" y2="3" stroke="${color}" stroke-width="0.8"/>
            <line x1="6" y1="-3" x2="6" y2="3" stroke="${color}" stroke-width="0.8"/>
        </g>`;
    }
    return '';
};

window.removeTacticPiece = function(id) { 
    if(!state.tactics) return; 
    state.tactics = state.tactics.filter(i => i.id !== id); 
    saveState(); 
    render(); 
};

let currentTacticMode = 'move'; 
let currentDrawColor = '#E1C324'; 
let isDrawing = false; 
let tacticCtx = null; 
let canvasRect = null;

window.setTacticMode = function(mode) { currentTacticMode = mode; render(); };
window.setDrawColor = function(color) { currentDrawColor = color; render(); };

window.clearCanvasLines = function() { 
    if (confirm('Tem a certeza que deseja apagar todos os riscos desenhados?')) {
        state.tacticPaths = []; 
        saveState(); 
        redrawCanvas();
        render();
        if(typeof showToast === 'function') showToast('Riscos apagados! 🧹');
    }
};

window.clearAllTacticPieces = function() {
    if (confirm('Tem a certeza que deseja remover todas as peças do relvado?')) {
        state.tactics = [];
        saveState();
        render();
        if(typeof showToast === 'function') showToast('Peças removidas! 🗑️');
    }
};

window.undoLastPath = function() { 
    if (!state.tacticPaths || state.tacticPaths.length === 0) return; 
    state.tacticPaths.pop(); 
    saveState(); 
    render(); 
};

function renderTatica() {
    if (window.editingMatchTacticsId) {
        const m = (state.matches || []).find(x => x.id === window.editingMatchTacticsId);
        if (m) {
            const pieceBg = state.teamColor || '#D9A441';
            const pieceColor = typeof getContrastColor === 'function' ? getContrastColor(pieceBg) : '#000000';
            const oppName = escapeHTML(m.opponent || '');

            const matchPiecesHtml = (state.tactics || []).filter(item => item.kind === 'own').map(item => {
                const itemX = Number(item.x) || 0;
                const itemY = Number(item.y) || 0;
                const itemLabel = escapeHTML(item.label || '?');
                return `<div class="tactic-piece own" data-id="${item.id}" style="left:${itemX}%; top:${itemY}%; background:${pieceBg}; color:${pieceColor}; width:26px; height:26px; font-size:11px; position:absolute; transform:translate(-50%,-50%); border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; border:2px solid #FFF; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.4); z-index:10;"><span>${itemLabel}</span></div>`;
            }).join('');

            return `
                <div class="topbar" style="margin-bottom:10px;">
                    <h1 style="font-size:15px; color:var(--gold);">📋 AJUSTAR ESQUEMA TÁTICO: ${oppName}</h1>
                </div>

                <div style="display:flex; gap:8px; margin-bottom:12px;">
                    <button class="btn btn-green" style="flex:1; font-size:12px; padding:12px;" onclick="saveMatchTacticalBoardAndReturn()">💾 GUARDAR NO JOGO & VOLTAR</button>
                    <button class="btn btn-outline" style="flex:none; padding:12px;" onclick="window.editingMatchTacticsId=null; navigateToHub('jogo'); navigateToTab('jogo');">✕ CANCELAR</button>
                </div>

                <div id="tactic-pitch" style="position:relative; width:100%; max-width:420px; margin:0 auto 10px; aspect-ratio:4/3; background:#113821; border:2px solid #FFF; border-radius:12px; overflow:hidden; touch-action:none;">
                    <svg viewBox="0 0 100 75" style="width:100%; height:100%; display:block; position:absolute; top:0; left:0;">
                        <rect x="0" y="0" width="100" height="75" fill="#113821" />
                        <rect x="3" y="3" width="94" height="69" fill="none" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
                        <line x1="50" y1="3" x2="50" y2="72" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
                        <circle cx="50" cy="37.5" r="10" fill="none" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
                        <rect x="3" y="20" width="14" height="35" fill="none" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
                        <rect x="83" y="20" width="14" height="35" fill="none" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
                    </svg>
                    ${matchPiecesHtml}
                </div>

                <div style="font-size:11px; color:var(--muted); text-align:center; margin-top:8px;">
                    Arrasta as camisolas para definir a formação em campo. Clica em <b>Guardar</b> no topo para confirmar.
                </div>
            `;
        }
    }
    
    if (!state.tactics) state.tactics = [];
    const format = state.tacticFormat || 11;
    const roster = typeof eligiblePlayers === 'function' ? eligiblePlayers() : (state.roster || []); 
    const addedPlayerIds = state.tactics.filter(i => i.kind === 'own').map(i => i.playerId).filter(Boolean);
    const oppCount = state.tactics.filter(i => i.kind === 'opp').length;
    const isHalf = !!state.tacticHalfPitch;
    const pieceBg = state.teamColor || '#D9A441';
    
    const pieceColor = typeof getContrastColor === 'function' ? getContrastColor(pieceBg) : '#000000';
    const oppBg = state.oppColor || '#C8493F';
    const oppColor = typeof getContrastColor === 'function' ? getContrastColor(oppBg) : '#FFFFFF';

    const bW = currentDrawColor === '#FFFFFF' ? 'var(--gold)' : 'transparent';
    const bY = currentDrawColor === '#E1C324' ? 'var(--chalk)' : 'transparent';
    const bR = currentDrawColor === '#E74C3C' ? 'var(--chalk)' : 'transparent';
    const bB = currentDrawColor === '#3498DB' ? 'var(--chalk)' : 'transparent';

    let html = `${typeof topbarHtml === 'function' ? topbarHtml(typeof t === 'function' ? t('hub_strat_title') : 'Tática') : ''}${typeof renderStratSubHeader === 'function' ? renderStratSubHeader() : ''}

    <div style="display:flex; gap:6px; margin-bottom:10px;">
        <button class="btn btn-gold" style="flex:1; font-size:10px; padding:10px 2px;" onclick="saveTacticalPlay('jogada')">📋 GUARDAR JOGADA</button>
        <button class="btn btn-green" style="flex:1; font-size:10px; padding:10px 2px;" onclick="saveTacticalPlay('treino')">🏋️ GUARDAR TREINO</button>
        <button class="btn btn-outline" style="flex:1; font-size:10px; padding:10px 2px; border-color:var(--gold); color:var(--gold);" onclick="exportTacticPDF()">📄 EXPORTAR PDF</button>
    </div>

    <button class="btn btn-outline" style="width:100%; margin-bottom:10px; font-size:11px; padding:8px 0;" onclick="state.tacticHalfPitch=!state.tacticHalfPitch; saveState(); render();">
        ${isHalf ? '⚽ ALTERNAR PARA CAMPO INTEIRO' : '🏟️ ALTERNAR PARA MEIO CAMPO'}
    </button>

    <div class="seg" style="margin-bottom:6px;">
        <div class="seg-btn ${currentTacticMode==='move'?'active':''}" onclick="setTacticMode('move')">🖐️ MOVER</div>
        <div class="seg-btn ${currentTacticMode==='draw'?'active':''}" onclick="setTacticMode('draw')">✏️ DESENHAR</div>
    </div>
    `;
    
    if(currentTacticMode === 'draw') {
        html += `<div style="display:flex; gap:12px; justify-content:center; align-items:center; margin-bottom:10px; padding:8px; background:var(--surface-2); border-radius:8px;">
            <div style="width:24px; height:24px; border-radius:50%; background:#FFFFFF; border:2px solid ${bW}; cursor:pointer;" onclick="setDrawColor('#FFFFFF')"></div>
            <div style="width:24px; height:24px; border-radius:50%; background:#E1C324; border:2px solid ${bY}; cursor:pointer;" onclick="setDrawColor('#E1C324')"></div>
            <div style="width:24px; height:24px; border-radius:50%; background:#E74C3C; border:2px solid ${bR}; cursor:pointer;" onclick="setDrawColor('#E74C3C')"></div>
            <div style="width:24px; height:24px; border-radius:50%; background:#3498DB; border:2px solid ${bB}; cursor:pointer;" onclick="setDrawColor('#3498DB')"></div>
        </div>`;
    }

    html += `<div style="font-size:9px; color:var(--gold); text-align:center; text-transform:uppercase; letter-spacing:0.05em; font-weight:bold; margin-bottom:10px;">
        ${currentTacticMode === 'move' ? 'MODO [MOVER]: ARRASTA JOGADORES E MATERIAL' : 'MODO [DESENHAR]: ESCOLHE UMA COR E RISCA'}
    </div>

    <div id="tactic-pitch" style="position:relative; width:100%; max-width:420px; margin:0 auto 14px; aspect-ratio:4/3; background:#113821; border:2px solid #FFF; border-radius:12px; overflow:hidden; touch-action:none;">
        ${isHalf ? 
            `<svg viewBox="0 0 100 75" style="width:100%; height:100%; display:block; position:absolute; top:0; left:0;">
                <rect x="0" y="0" width="100" height="75" fill="#113821" />
                <rect x="3" y="3" width="94" height="69" fill="none" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
                <line x1="3" y1="72" x2="97" y2="72" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
                <circle cx="50" cy="72" r="14" fill="none" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
                <rect x="22" y="3" width="56" height="18" fill="none" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
                <rect x="34" y="3" width="32" height="7" fill="none" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
            </svg>` 
        : 
            `<svg viewBox="0 0 100 75" style="width:100%; height:100%; display:block; position:absolute; top:0; left:0;">
                <rect x="0" y="0" width="100" height="75" fill="#113821" />
                <rect x="3" y="3" width="94" height="69" fill="none" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
                <line x1="50" y1="3" x2="50" y2="72" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
                <circle cx="50" cy="37.5" r="10" fill="none" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
                <rect x="3" y="20" width="14" height="35" fill="none" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
                <rect x="83" y="20" width="14" height="35" fill="none" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.6" />
            </svg>`
        }

        ${state.tactics.map(p => {
            let bg = p.kind === 'own' ? pieceBg : (p.kind === 'opp' ? oppBg : '#FFFFFF');
            let color = p.kind === 'ball' ? '#000' : (p.kind === 'own' ? pieceColor : oppColor);
            let label = p.kind === 'ball' ? '⚽' : escapeHTML(p.label || '?');
            
            if (['cone', 'minigoal', 'pole', 'rope'].includes(p.kind)) {
                let svgContent = window.getTacticItemSVG(p);
                return `<div class="tactic-piece" data-id="${p.id}" ondblclick="removeTacticPiece('${p.id}')" style="left:${p.x}\%; top:${p.y}%; width:24px; height:24px; position:absolute; transform:translate(-50%, -50%); display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:10;">
                    <svg viewBox="-10 -10 20 20" style="width:100%; height:100%; pointer-events:none; overflow:visible;">${svgContent}</svg>
                </div>`;
            }

            return `<div class="tactic-piece" data-id="${p.id}" ondblclick="removeTacticPiece('${p.id}')" style="left:${p.x}\%; top:${p.y}%; background:${bg}; color:${color}; width:26px; height:26px; font-size:11px; position:absolute; transform:translate(-50%, -50%); border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; border:2px solid #FFF; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.4); z-index:10;">
                ${label}
            </div>`;
        }).join('')}

        <canvas id="tactic-canvas" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:20; pointer-events:${currentTacticMode==='draw'?'auto':'none'};"></canvas>
    </div>

    <div class="card" style="padding:12px; text-align:left;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="font-size:10px; color:var(--muted); text-transform:uppercase; font-weight:bold; letter-spacing:0.05em;">CAIXA DE PEÇAS</span>
            
            <div style="display:flex; gap:12px; align-items:center;">
                <div style="display:flex; gap:4px;">
                    <button class="btn btn-outline" style="font-size:9px; padding:3px 6px;" onclick="undoLastPath()" title="Desfazer Risco">↩️ RISCO</button>
                    <button class="btn btn-outline" style="font-size:9px; padding:3px 6px; color:var(--red); border-color:var(--red);" onclick="clearCanvasLines()" title="Limpar Riscos">🧹 RISCOS</button>
                </div>
                <div style="width:1px; height:16px; background:var(--line);"></div>
                <div style="display:flex; gap:4px;">
                    <button class="btn btn-outline" style="font-size:9px; padding:3px 6px;" onclick="undoLastTacticPiece()" title="Desfazer Peça">↩️ PEÇA</button>
                    <button class="btn btn-outline" style="font-size:9px; padding:3px 6px; color:var(--red); border-color:var(--red);" onclick="clearAllTacticPieces()" title="Limpar Peças">🗑️ PEÇAS</button>
                </div>
            </div>
        </div>

        <div style="display:flex; gap:8px; margin-bottom:10px;">
            <button class="btn btn-outline" style="flex:1; font-size:11px;" onclick="spawnTacticItem('opp')">+ ADVERSÁRIO (${oppCount}/${format})</button>
            <button class="btn btn-outline" style="flex:1; font-size:11px;" onclick="spawnTacticItem('ball')">+ BOLA ⚽</button>
        </div>

        <div style="display:flex; gap:6px; margin-bottom:12px; flex-wrap:wrap; border-top:1px dashed var(--line); padding-top:8px;">
            <button class="btn btn-outline" style="font-size:10px; padding:4px 8px;" onclick="spawnTacticItem('cone')">🔶 Cone</button>
            <button class="btn btn-outline" style="font-size:10px; padding:4px 8px;" onclick="spawnTacticItem('minigoal')">🥅 Baliza</button>
            <button class="btn btn-outline" style="font-size:10px; padding:4px 8px;" onclick="spawnTacticItem('pole')">📍 Estaca</button>
            <button class="btn btn-outline" style="font-size:10px; padding:4px 8px;" onclick="spawnTacticItem('rope')">🪜 Escada</button>
        </div>

        <div style="font-size:10px; color:var(--muted); text-transform:uppercase; font-weight:bold; margin-bottom:6px;">
            TEUS JOGADORES (Adicionados: ${addedPlayerIds.length} | Limite: ${format})
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:6px;">
            ${roster.filter(p => !addedPlayerIds.includes(p.id)).map(p => {
                const safeName = escapeHTML(p.name || 'Sem Nome');
                const num = p.number ? escapeHTML(String(p.number)) + ' · ' : '';
                return `<button class="chip chip-sm" style="font-size:10px; padding:4px 8px;" onclick="spawnTacticItem('own', '${p.id}')">${num}${safeName}</button>`;
            }).join('')}
        </div>
    </div>`;

    return html;
}

window.saveTacticalPlay = function(category) {
    if (!state.isActivated && (state.tacticalNotebook || []).length >= 1) {
        modalConfig = { type: 'freemium', message: 'A versão de testes permite guardar apenas 1 esquema tático no teu Caderno.' };
        const root = document.getElementById('modal-root');
        if (root) root.innerHTML = typeof renderModalHTML === 'function' ? renderModalHTML() : '';
        return;
    }

    const name = prompt("Dá um nome a este " + (category === 'treino' ? "exercício:" : "esquema/jogada:"));
    if (!name || name.trim() === '') return;

    if (!state.tacticalNotebook) state.tacticalNotebook = [];

    const durationInput = category === 'treino' ? prompt("Duração aproximada do exercício (minutos)?", "15") : null;
    let dur = 15;
    if (durationInput !== null) {
        dur = parseInt(durationInput, 10);
        if (isNaN(dur) || dur <= 0) dur = 15;
    }

    const snap = {
        id: uid(),
        name: escapeHTML(name.trim()),
        category: category, 
        duration: dur,
        halfPitch: !!state.tacticHalfPitch,
        format: state.tacticFormat,
        tactics: JSON.parse(JSON.stringify(state.tactics || [])),
        tacticPaths: JSON.parse(JSON.stringify(state.tacticPaths || []))
    };

    state.tacticalNotebook.push(snap);
    saveState();
    
    if (typeof showToast === 'function') showToast(`Guardado como ${category === 'treino' ? 'Treino' : 'Jogada'}! 💾`);
};

window.loadTacticalPlay = function(id) {
    const play = (state.tacticalNotebook || []).find(x => x.id === id);
    if(!play) return;
    state.tacticFormat = play.format || 11;
    state.tacticHalfPitch = !!play.halfPitch;
    state.tactics = JSON.parse(JSON.stringify(play.tactics || []));
    state.tacticPaths = JSON.parse(JSON.stringify(play.tacticPaths || []));
    saveState();
    currentTab = 'tatica';
    render();
    if(typeof showToast === 'function') showToast(`Carregado: ${play.name}`);
};

// 🔒 BARREIRA DA DEMO: PROÍBE APAGAR DO CADERNO
window.deleteTacticalPlay = function(id) {
    if (!state.isActivated) {
        modalConfig = { type: 'freemium', message: 'A eliminação de dados está bloqueada na versão de demonstração. Desbloqueia a versão PRO para teres controlo total!' };
        const root = document.getElementById('modal-root');
        if (root) root.innerHTML = typeof renderModalHTML === 'function' ? renderModalHTML() : '';
        return;
    }

    state.tacticalNotebook = (state.tacticalNotebook || []).filter(x => x.id !== id);
    saveState();
    render();
    if(typeof showToast === 'function') showToast('Item eliminado.');
};

window.exportTacticPDF = function() {
    const pitchEl = document.getElementById('tactic-pitch');
    if (!pitchEl) return;
    if(typeof showToast === 'function') showToast('A preparar PDF... ⏳');
    
    html2canvas(pitchEl, { useCORS: true, scale: 2, backgroundColor: '#113821' }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const html = `
            <div class="print-card">
                <div class="print-header" style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h1>${typeof getMyClub === 'function' ? getMyClub() : 'Clube'} — ESQUEMA TÁTICO</h1>
                        <p>Gerado em: ${new Date().toLocaleDateString('pt-PT')} | Época: ${state.currentSeason}</p>
                    </div>
                    ${typeof getClubLogoHtml === 'function' ? getClubLogoHtml() : ''}
                </div>
                <div style="text-align:center; margin:20px 0;">
                    <img src="${imgData}" style="max-width:100%; max-height:650px; border:2px solid #000; border-radius:8px;">
                </div>
                <div style="margin-top:20px; font-size:11px; color:#666; text-align:center;">
                    Coachfolio v3.5.1 — Documento de Análise Tática
                </div>
            </div>`;
            
        document.getElementById('print-area').innerHTML = html;
        if(typeof window.openSafePrintModal === 'function') window.openSafePrintModal();
    }).catch(err => {
        console.error(err);
        if(typeof showToast === 'function') showToast('Erro ao gerar PDF tático.');
    });
};

function initTacticCanvas() {
    const cvs = document.getElementById('tactic-canvas'); 
    if(!cvs) return;
    const rect = cvs.getBoundingClientRect();
    
    if (cvs.width !== rect.width || cvs.height !== rect.height) {
        cvs.width = rect.width; 
        cvs.height = rect.height;
    }
    
    tacticCtx = cvs.getContext('2d'); 
    redrawCanvas();
}

window.addEventListener('resize', () => {
    if (typeof currentTab !== 'undefined' && currentTab === 'tatica') {
        setTimeout(initTacticCanvas, 100);
    }
});

function redrawCanvas() {
    if(!tacticCtx || !tacticCtx.canvas.width) return; 
    tacticCtx.clearRect(0, 0, tacticCtx.canvas.width, tacticCtx.canvas.height); 
    tacticCtx.lineCap = 'round'; 
    tacticCtx.lineJoin = 'round'; 
    tacticCtx.lineWidth = 3;
    (state.tacticPaths || []).forEach(path => { 
        if(path.points.length === 0) return; 
        tacticCtx.strokeStyle = path.color; 
        tacticCtx.beginPath(); 
        path.points.forEach((p, index) => { 
            const x = (p.x / 100) * tacticCtx.canvas.width; 
            const y = (p.y / 100) * tacticCtx.canvas.height; 
            if(index === 0) tacticCtx.moveTo(x, y); 
            else tacticCtx.lineTo(x, y); 
        }); 
        tacticCtx.stroke(); 
    });
}

document.addEventListener('touchstart', handleDrawStart, {passive: false}); 
document.addEventListener('mousedown', handleDrawStart);
document.addEventListener('touchmove', handleDrawMove, {passive: false}); 
document.addEventListener('mousemove', handleDrawMove);
document.addEventListener('touchend', handleDrawEnd); 
document.addEventListener('mouseup', handleDrawEnd);

function handleDrawStart(e) { 
    if(typeof currentTab === 'undefined' || currentTab !== 'tatica' || currentTacticMode !== 'draw') return; 
    const cvs = document.getElementById('tactic-canvas'); 
    if(!cvs || e.target !== cvs) return; 
    isDrawing = true; 
    if(!state.tacticPaths) state.tacticPaths = []; 
    state.tacticPaths.push({ color: currentDrawColor, points: [] }); 
    handleDrawMove(e); 
}

function handleDrawMove(e) { 
    if(!isDrawing || typeof currentTab === 'undefined' || currentTab !== 'tatica' || currentTacticMode !== 'draw') return; 
    e.preventDefault(); 
    const pos = getTouchPos(e); 
    const cvs = document.getElementById('tactic-canvas'); 
    const rect = cvs.getBoundingClientRect(); 
    let pctX = ((pos.x - rect.left) / rect.width) * 100; 
    let pctY = ((pos.y - rect.top) / rect.height) * 100; 
    
    pctX = Math.round(Math.max(0, Math.min(100, pctX)) * 10) / 10;
    pctY = Math.round(Math.max(0, Math.min(100, pctY)) * 10) / 10;
    
    const currentPath = state.tacticPaths[state.tacticPaths.length - 1]; 
    currentPath.points.push({x: pctX, y: pctY}); 
    redrawCanvas(); 
}

function handleDrawEnd(e) { 
    if(!isDrawing || typeof currentTab === 'undefined' || currentTab !== 'tatica') return; 
    isDrawing = false; 
    saveState(); 
}

window.notebookFilter = 'jogada'; // 'jogada' ou 'treino'

function renderCaderno() {
    const notebook = state.tacticalNotebook || [];
    let html = `${typeof topbarHtml === 'function' ? topbarHtml(typeof t === 'function' ? t('hub_strat_title') : 'Tática') : ''}${typeof renderStratSubHeader === 'function' ? renderStratSubHeader() : ''}`;
    
    if(notebook.length === 0) {
        html += `<div class="empty">Nenhum esquema guardado no Caderno.<br>Cria um esquema no Quadro Tático e guarda como Jogada ou Treino.</div>`;
    } else {
        let jogadasCount = 0;
        let treinosCount = 0;
        notebook.forEach(x => { if (x.category === 'treino') treinosCount++; else jogadasCount++; });

        html += `
        <div class="seg" style="margin-bottom:14px;">
            <div class="seg-btn ${window.notebookFilter==='jogada'?'active':''}" onclick="window.notebookFilter='jogada'; render();">📋 Jogadas (${jogadasCount})</div>
            <div class="seg-btn ${window.notebookFilter==='treino'?'active':''}" onclick="window.notebookFilter='treino'; render();">🏋️ Exercícios (${treinosCount})</div>
        </div>`;

        const filtered = notebook.filter(x => {
            if (window.notebookFilter === 'jogada') return x.category !== 'treino';
            if (window.notebookFilter === 'treino') return x.category === 'treino';
            return true;
        });

        if (filtered.length === 0) {
            html += `<div class="empty">Nenhum item guardado nesta categoria.</div>`;
        } else {
            html += `<div style="display:flex; flex-direction:column; gap:10px;">`;
            filtered.forEach(play => {
                const isTreino = play.category === 'treino';
                const badgeColor = isTreino ? 'var(--green)' : 'var(--gold)';
                const badgeText = isTreino ? '🏋️ Exercício' : '📋 Jogada';

                html += `
                    <div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0;">
                        <div>
                            <strong style="font-size:14px; color:var(--chalk); display:block;">${escapeHTML(play.name)}</strong>
                            <span style="font-size:10px; color:${badgeColor}; font-weight:bold; text-transform:uppercase;">${badgeText}</span>
                            <span style="font-size:10px; color:var(--muted); margin-left:6px;">· ${play.halfPitch ? 'Meio Campo' : 'Campo Inteiro'}</span>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button class="btn ${isTreino ? 'btn-green' : 'btn-gold'}" style="padding:6px 12px; font-size:11px;" onclick="loadTacticalPlay('${play.id}')">▶ Carregar</button>
                            <button class="quick-del" style="color:var(--red);" onclick="askConfirm('Apagar do caderno?', ()=>deleteTacticalPlay('${play.id}'))">🗑</button>
                        </div>
                    </div>`;
            });
            html += `</div>`;
        }
    }
    return html;
}

let dragObj = { dragging: false, id: null, el: null, pitchRect: null };

function getTouchPos(e) { 
    const touch = e.touches && e.touches.length > 0 ? e.touches[0] : (e.changedTouches ? e.changedTouches[0] : e); 
    return { x: touch.clientX, y: touch.clientY }; 
}

document.addEventListener('touchstart', startDrag, {passive: false}); 
document.addEventListener('mousedown', startDrag);
document.addEventListener('touchmove', moveDrag, {passive: false}); 
document.addEventListener('mousemove', moveDrag);
document.addEventListener('touchend', endDrag); 
document.addEventListener('mouseup', endDrag);

function startDrag(e) { 
    if (typeof currentTab === 'undefined' || currentTab !== 'tatica' || currentTacticMode !== 'move') return; 
    const piece = e.target.closest('.tactic-piece'); 
    if (!piece) return; 
    const pitchEl = document.getElementById('tactic-pitch'); 
    if (!pitchEl) return; 
    dragObj.dragging = true; 
    dragObj.el = piece; 
    dragObj.id = piece.dataset.id; 
    dragObj.pitchRect = pitchEl.getBoundingClientRect(); 
    piece.style.transition = 'none'; 
    piece.style.zIndex = 1000; 
}

function moveDrag(e) { 
    if (!dragObj.dragging || typeof currentTab === 'undefined' || currentTab !== 'tatica' || currentTacticMode !== 'move') return; 
    e.preventDefault(); 
    const pos = getTouchPos(e); 
    let relX = pos.x - dragObj.pitchRect.left; 
    let relY = pos.y - dragObj.pitchRect.top; 
    
    let pctX = Math.round(((relX / dragObj.pitchRect.width) * 100) * 10) / 10; 
    let pctY = Math.round(((relY / dragObj.pitchRect.height) * 100) * 10) / 10; 
    
    pctX = Math.max(0, Math.min(100, pctX)); 
    pctY = Math.max(0, Math.min(100, pctY)); 
    
    dragObj.el.style.left = pctX + '%'; 
    dragObj.el.style.top = pctY + '%'; 
}

function endDrag(e) { 
    if (!dragObj.dragging || typeof currentTab === 'undefined' || currentTab !== 'tatica') return; 
    dragObj.dragging = false; 
    const pos = getTouchPos(e); 
    let relX = pos.x - dragObj.pitchRect.left; 
    let relY = pos.y - dragObj.pitchRect.top; 
    
    let pctX = Math.round(((relX / dragObj.pitchRect.width) * 100) * 10) / 10; 
    let pctY = Math.round(((relY / dragObj.pitchRect.height) * 100) * 10) / 10; 

    if (pctX < -10 || pctX > 110 || pctY < -10 || pctY > 110) { 
        state.tactics = state.tactics.filter(i => i.id !== dragObj.id); 
    } else { 
        const item = state.tactics.find(i => i.id === dragObj.id); 
        if (item) { 
            item.x = Math.max(0, Math.min(100, pctX)); 
            item.y = Math.max(0, Math.min(100, pctY)); 
        } 
    } 
    dragObj.el.style.zIndex = ''; 
    saveState(); 
    render(); 
}