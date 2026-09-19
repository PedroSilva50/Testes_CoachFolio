// ==========================================
// MÓDULO TÁTICO & QUADRO DE TREINO
// ==========================================

// Remove peça associada a um jogador específico
window.removeTacticPieceByPlayerId = function(playerId) {
    if (!state.tactics) return;
    state.tactics = state.tactics.filter(i => i.playerId !== playerId);
    saveState();
    render();
};

// Desfazer a última peça colocada
window.undoLastTacticPiece = function() {
    if (!state.tactics || state.tactics.length === 0) return;
    state.tactics.pop();
    saveState();
    render();
};

// Adiciona peças, jogadores ou materiais ao relvado
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

// SVG dos Materiais (Centrados no ponto de arrasto)
window.getTacticItemSVG = function(item) {
    if (item.kind === 'cone') {
        return `<g>
            <polygon points="-3,4 3,4 1.5,-4 -1.5,-4" fill="${item.color || '#FF9500'}" stroke="#000" stroke-width="0.5"/>
            <ellipse cx="0" cy="4" rx="4" ry="1.5" fill="${item.color || '#FF9500'}" stroke="#000" stroke-width="0.5"/>
        </g>`;
    } 
    if (item.kind === 'minigoal') {
        return `<g>
            <rect x="-5" y="-3" width="10" height="6" rx="1" fill="none" stroke="#FFFFFF" stroke-width="1.5"/>
            <line x1="-5" y1="-3" x2="5" y2="-3" stroke="#FF3B30" stroke-width="1"/>
        </g>`;
    }
    if (item.kind === 'pole') {
        return `<g>
            <circle cx="0" cy="0" r="2" fill="${item.color || '#FF2D55'}" stroke="#000" stroke-width="0.5"/>
            <line x1="0" y1="0" x2="0" y2="-6" stroke="${item.color || '#FF2D55'}" stroke-width="1.5"/>
        </g>`;
    }
    if (item.kind === 'rope') {
        return `<g>
            <rect x="-8" y="-2" width="16" height="4" rx="1" fill="none" stroke="#EAB308" stroke-width="1" stroke-dasharray="2 1"/>
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
    state.tacticPaths = []; 
    saveState(); 
    redrawCanvas();
    render();
    if(typeof showToast === 'function') showToast('Riscos apagados! 🧹');
};

window.clearAllTacticPieces = function() {
    state.tactics = [];
    saveState();
    render();
    if(typeof showToast === 'function') showToast('Peças removidas! 🗑️');
};

window.undoLastPath = function() { 
    if (!state.tacticPaths || state.tacticPaths.length === 0) return; 
    state.tacticPaths.pop(); 
    saveState(); 
    render(); 
};

function renderTatica() {
    // DESVIO PARA MODO JOGO (Mostra apenas o campo limpo e os titulares)
    if (window.editingMatchTacticsId) {
        const m = (state.matches || []).find(x => x.id === window.editingMatchTacticsId);
        if (m) {
            const pieceBg = state.teamColor || '#D9A441';
            const pieceColor = typeof getContrastColor === 'function' ? getContrastColor(pieceBg) : '#000000';

            return `
                <div class="topbar" style="margin-bottom:10px;">
                    <h1 style="font-size:15px; color:var(--gold);">📋 AJUSTAR ESQUEMA TÁTICO: ${escapeHTML(m.opponent || '')}</h1>
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

                    ${(state.tactics || []).filter(item => item.kind === 'own').map(item => `
                        <div class="tactic-piece own" data-id="${item.id}" style="left:${Number(item.x)||0}%; top:${Number(item.y)||0}%; background:${pieceBg}; color:${pieceColor}; width:26px; height:26px; font-size:11px; position:absolute; transform:translate(-50%,-50%); border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; border:2px solid #FFF; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.4); z-index:10;">
                            <span>${escapeHTML(item.label || '?')}</span>
                        </div>`).join('')}
                </div>

                <div style="font-size:11px; color:var(--muted); text-align:center; margin-top:8px;">
                    Arrasta as camisolas para definir a formação em campo. Clica em <b>Guardar</b> no topo para confirmar.
                </div>
            `;
        }
    }
    if (!state.tactics) state.tactics = [];
    const format = state.tacticFormat || 11;
    const roster = eligiblePlayers(); 
    const addedPlayerIds = state.tactics.filter(i => i.kind === 'own').map(i => i.playerId).filter(Boolean);
    const oppCount = state.tactics.filter(i => i.kind === 'opp').length;
    const isHalf = !!state.tacticHalfPitch;
    const pieceBg = state.teamColor || '#D9A441';
    const pieceColor = getContrastColor(pieceBg);
    const oppBg = state.oppColor || '#C8493F';
    const oppColor = getContrastColor(oppBg);

    let html = `${topbarHtml(t('hub_strat_title'))}${renderStratSubHeader()}

    <!-- 1. BARRAS SUPERIORES DE AÇÕES (JOGADA, TREINO, PDF) -->
    <div style="display:flex; gap:6px; margin-bottom:10px;">
        <button class="btn btn-gold" style="flex:1; font-size:10px; padding:10px 2px;" onclick="saveTacticalPlay('jogada')">📋 GUARDAR JOGADA</button>
        <button class="btn btn-green" style="flex:1; font-size:10px; padding:10px 2px;" onclick="saveTacticalPlay('treino')">🏋️ GUARDAR TREINO</button>
        <button class="btn btn-outline" style="flex:1; font-size:10px; padding:10px 2px; border-color:var(--gold); color:var(--gold);" onclick="exportTacticPDF()">📄 EXPORTAR PDF</button>
    </div>

    <!-- 2. BOTÃO ALTERNAR CAMPO A OCUPAR A LARGURA TODA -->
    <button class="btn btn-outline" style="width:100%; margin-bottom:10px; font-size:11px; padding:8px 0;" onclick="state.tacticHalfPitch=!state.tacticHalfPitch; saveState(); render();">
        ${isHalf ? '⚽ ALTERNAR PARA CAMPO INTEIRO' : '🏟️ ALTERNAR PARA MEIO CAMPO'}
    </button>

    <!-- 3. SELETOR DE MODOS E PALETA DE CORES -->
    <div class="seg" style="margin-bottom:6px;">
        <div class="seg-btn ${currentTacticMode==='move'?'active':''}" onclick="setTacticMode('move')">🖐️ MOVER</div>
        <div class="seg-btn ${currentTacticMode==='draw'?'active':''}" onclick="setTacticMode('draw')">✏️ DESENHAR</div>
    </div>
    `;
    
    // PALETA DE CORES (Aparece apenas no modo Desenhar)
    if(currentTacticMode === 'draw') {
        html += `<div style="display:flex; gap:12px; justify-content:center; align-items:center; margin-bottom:10px; padding:8px; background:var(--surface-2); border-radius:8px;">
            <div style="width:24px; height:24px; border-radius:50%; background:#FFFFFF; border:2px solid ${currentDrawColor==='#FFFFFF'?'var(--gold)':'transparent'}; cursor:pointer;" onclick="setDrawColor('#FFFFFF')"></div>
            <div style="width:24px; height:24px; border-radius:50%; background:#E1C324; border:2px solid ${currentDrawColor==='#E1C324'?'var(--chalk)':'transparent'}; cursor:pointer;" onclick="setDrawColor('#E1C324')"></div>
            <div style="width:24px; height:24px; border-radius:50%; background:#E74C3C; border:2px solid ${currentDrawColor==='#E74C3C'?'var(--chalk)':'transparent'}; cursor:pointer;" onclick="setDrawColor('#E74C3C')"></div>
            <div style="width:24px; height:24px; border-radius:50%; background:#3498DB; border:2px solid ${currentDrawColor==='#3498DB'?'var(--chalk)':'transparent'}; cursor:pointer;" onclick="setDrawColor('#3498DB')"></div>
        </div>`;
    }

    html += `<div style="font-size:9px; color:var(--gold); text-align:center; text-transform:uppercase; letter-spacing:0.05em; font-weight:bold; margin-bottom:10px;">
        ${currentTacticMode === 'move' ? 'MODO [MOVER]: ARRASTA JOGADORES E MATERIAL' : 'MODO [DESENHAR]: ESCOLHE UMA COR E RISCA'}
    </div>

    <!-- 4. RELVADO TÁTICO -->
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

        <!-- PEÇAS E MATERIAIS NO CAMPO -->
        ${state.tactics.map(p => {
            let bg = p.kind === 'own' ? pieceBg : (p.kind === 'opp' ? oppBg : '#FFFFFF');
            let color = p.kind === 'ball' ? '#000' : (p.kind === 'own' ? pieceColor : oppColor);
            let label = p.kind === 'ball' ? '⚽' : (p.label || '?');
            
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

    <!-- 5. CAIXA DE PEÇAS & MATERIAL DE TREINO -->
    <div class="card" style="padding:12px; text-align:left;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="font-size:10px; color:var(--muted); text-transform:uppercase; font-weight:bold; letter-spacing:0.05em;">CAIXA DE PEÇAS</span>
            
            <!-- LIMPEZA SEPARADA COM AÇÕES DIRETA -->
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

        <!-- BOTÕES ADVERSÁRIO E BOLA -->
        <div style="display:flex; gap:8px; margin-bottom:10px;">
            <button class="btn btn-outline" style="flex:1; font-size:11px;" onclick="spawnTacticItem('opp')">+ ADVERSÁRIO (${oppCount}/${format})</button>
            <button class="btn btn-outline" style="flex:1; font-size:11px;" onclick="spawnTacticItem('ball')">+ BOLA ⚽</button>
        </div>

        <!-- MATERIAL DE TREINO -->
        <div style="display:flex; gap:6px; margin-bottom:12px; flex-wrap:wrap; border-top:1px dashed var(--line); padding-top:8px;">
            <button class="btn btn-outline" style="font-size:10px; padding:4px 8px;" onclick="spawnTacticItem('cone')">🔶 Cone</button>
            <button class="btn btn-outline" style="font-size:10px; padding:4px 8px;" onclick="spawnTacticItem('minigoal')">🥅 Baliza</button>
            <button class="btn btn-outline" style="font-size:10px; padding:4px 8px;" onclick="spawnTacticItem('pole')">📍 Estaca</button>
            <button class="btn btn-outline" style="font-size:10px; padding:4px 8px;" onclick="spawnTacticItem('rope')">➰ Corda</button>
        </div>

        <!-- LISTA DOS TEUS JOGADORES -->
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
// GUARDA JOGADA OU TREINO COM CATEGORIZAÇÃO
window.saveTacticalPlay = function(category = 'jogada') {
    if((!state.tactics || state.tactics.length === 0) && (!state.tacticPaths || state.tacticPaths.length === 0)) {
        showToast('O quadro está vazio!'); return;
    }
    const labelText = category === 'treino' ? 'Nome do Exercício de Treino:' : 'Nome da Jogada Tática:';
    const playName = prompt(labelText);
    if(!playName || !playName.trim()) return;
    if(!state.tacticalNotebook) state.tacticalNotebook = [];

    state.tacticalNotebook.unshift({
        id: uid(),
        name: escapeHTML(playName.trim()),
        category: category, // 'jogada' ou 'treino'
        format: state.tacticFormat || 11,
        halfPitch: !!state.tacticHalfPitch,
        tactics: JSON.parse(JSON.stringify(state.tactics || [])),
        tacticPaths: JSON.parse(JSON.stringify(state.tacticPaths || []))
    });

    saveState();
    render();
    showToast(category === 'treino' ? 'Exercício guardado no Caderno! 🏋️' : 'Jogada guardada no Caderno! 📋');
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
    showToast(`Carregado: ${play.name}`);
};

window.deleteTacticalPlay = function(id) {
    state.tacticalNotebook = (state.tacticalNotebook || []).filter(x => x.id !== id);
    saveState();
    render();
    showToast('Item eliminado.');
};

window.exportTacticPDF = function() {
    const pitchEl = document.getElementById('tactic-pitch');
    if (!pitchEl) return;
    showToast('A preparar PDF... ⏳');
    
    html2canvas(pitchEl, { useCORS: true, scale: 2, backgroundColor: '#113821' }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const html = `
            <div class="print-card">
                <div class="print-header" style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h1>${getMyClub()} — ESQUEMA TÁTICO</h1>
                        <p>Gerado em: ${new Date().toLocaleDateString('pt-PT')} | Época: ${state.currentSeason}</p>
                    </div>
                    ${getClubLogoHtml()}
                </div>
                <div style="text-align:center; margin:20px 0;">
                    <img src="${imgData}" style="max-width:100%; max-height:650px; border:2px solid #000; border-radius:8px;">
                </div>
                <div style="margin-top:20px; font-size:11px; color:#666; text-align:center;">
                    Coachfolio v3.5.1 — Documento de Análise Tática
                </div>
            </div>`;
            
        document.getElementById('print-area').innerHTML = html;
        window.openSafePrintModal();
    }).catch(err => {
        console.error(err);
        showToast('Erro ao gerar PDF tático.');
    });
};

function initTacticCanvas() {
    const cvs = document.getElementById('tactic-canvas'); 
    if(!cvs) return;
    canvasRect = cvs.getBoundingClientRect(); 
    cvs.width = canvasRect.width; 
    cvs.height = canvasRect.height;
    tacticCtx = cvs.getContext('2d'); 
    redrawCanvas();
}

function redrawCanvas() {
    if(!tacticCtx || !canvasRect) return; 
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
    if(currentTab !== 'tatica' || currentTacticMode !== 'draw') return; 
    const cvs = document.getElementById('tactic-canvas'); 
    if(!cvs || e.target !== cvs) return; 
    isDrawing = true; 
    if(!state.tacticPaths) state.tacticPaths = []; 
    state.tacticPaths.push({ color: currentDrawColor, points: [] }); 
    handleDrawMove(e); 
}

function handleDrawMove(e) { 
    if(!isDrawing || currentTab !== 'tatica' || currentTacticMode !== 'draw') return; 
    e.preventDefault(); 
    const pos = getTouchPos(e); 
    const cvs = document.getElementById('tactic-canvas'); 
    const rect = cvs.getBoundingClientRect(); 
    let pctX = ((pos.x - rect.left) / rect.width) * 100; 
    let pctY = ((pos.y - rect.top) / rect.height) * 100; 
    pctX = Math.max(0, Math.min(100, pctX)); 
    pctY = Math.max(0, Math.min(100, pctY)); 
    const currentPath = state.tacticPaths[state.tacticPaths.length - 1]; 
    currentPath.points.push({x: pctX, y: pctY}); 
    redrawCanvas(); 
}

function handleDrawEnd(e) { 
    if(!isDrawing || currentTab !== 'tatica') return; 
    isDrawing = false; 
    saveState(); 
}

// CADERNO COM DIVISÃO DE JOGADAS E TREINOS
function renderCaderno() {
    const notebook = state.tacticalNotebook || [];
    let html = `${topbarHtml(t('hub_strat_title'))}${renderStratSubHeader()}`;
    
    if(notebook.length === 0) {
        html += `<div class="empty">Nenhum esquema guardado no Caderno.<br>Cria um esquema no Quadro Tático e guarda como Jogada ou Treino.</div>`;
    } else {
        const jogadas = notebook.filter(x => x.category !== 'treino');
        const treinos = notebook.filter(x => x.category === 'treino');

        html += `<div style="display:flex; flex-direction:column; gap:16px;">`;

        if (jogadas.length > 0) {
            html += `<div>
                <div style="font-size:11px; color:var(--gold); font-weight:bold; text-transform:uppercase; margin-bottom:8px;">📋 Jogadas Táticas (${jogadas.length})</div>
                <div style="display:flex; flex-direction:column; gap:8px;">
                ${jogadas.map(play => `
                    <div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0;">
                        <div>
                            <strong style="font-size:14px; color:var(--chalk); display:block;">${play.name}</strong>
                            <span style="font-size:10px; color:var(--muted);">${play.halfPitch ? 'Meio Campo' : 'Campo Inteiro'}</span>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button class="btn btn-gold" style="padding:6px 12px; font-size:11px;" onclick="loadTacticalPlay('${play.id}')">▶ Carregar</button>
                            <button class="quick-del" style="color:var(--red);" onclick="askConfirm('Apagar jogada?', ()=>deleteTacticalPlay('${play.id}'))">🗑</button>
                        </div>
                    </div>
                `).join('')}
                </div>
            </div>`;
        }

        if (treinos.length > 0) {
            html += `<div>
                <div style="font-size:11px; color:var(--green); font-weight:bold; text-transform:uppercase; margin-bottom:8px;">🏋️ Exercícios de Treino (${treinos.length})</div>
                <div style="display:flex; flex-direction:column; gap:8px;">
                ${treinos.map(play => `
                    <div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0;">
                        <div>
                            <strong style="font-size:14px; color:var(--chalk); display:block;">${play.name}</strong>
                            <span style="font-size:10px; color:var(--muted);">${play.halfPitch ? 'Meio Campo' : 'Campo Inteiro'}</span>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button class="btn btn-green" style="padding:6px 12px; font-size:11px;" onclick="loadTacticalPlay('${play.id}')">▶ Carregar</button>
                            <button class="quick-del" style="color:var(--red);" onclick="askConfirm('Apagar exercício?', ()=>deleteTacticalPlay('${play.id}'))">🗑</button>
                        </div>
                    </div>
                `).join('')}
                </div>
            </div>`;
        }

        html += `</div>`;
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
    if (currentTab !== 'tatica' || currentTacticMode !== 'move') return; 
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
    if (!dragObj.dragging || currentTab !== 'tatica' || currentTacticMode !== 'move') return; 
    e.preventDefault(); 
    const pos = getTouchPos(e); 
    let relX = pos.x - dragObj.pitchRect.left; 
    let relY = pos.y - dragObj.pitchRect.top; 
    let pctX = (relX / dragObj.pitchRect.width) * 100; 
    let pctY = (relY / dragObj.pitchRect.height) * 100; 
    pctX = Math.max(0, Math.min(100, pctX)); 
    pctY = Math.max(0, Math.min(100, pctY)); 
    dragObj.el.style.left = pctX + '%'; 
    dragObj.el.style.top = pctY + '%'; 
}

function endDrag(e) { 
    if (!dragObj.dragging || currentTab !== 'tatica') return; 
    dragObj.dragging = false; 
    const pos = getTouchPos(e); 
    let relX = pos.x - dragObj.pitchRect.left; 
    let relY = pos.y - dragObj.pitchRect.top; 
    let pctX = (relX / dragObj.pitchRect.width) * 100; 
    let pctY = (relY / dragObj.pitchRect.height) * 100; 
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