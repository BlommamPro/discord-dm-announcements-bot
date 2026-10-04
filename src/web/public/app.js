// ============================================================
// CONFIGURACIÓN
// ============================================================
const MAX_BLOCKS = 20;
const MAX_IMAGES_PER_GALLERY = 5;
const MAX_TOTAL_IMAGES = 10;       // Límite global (Discord: máx 10 attachments)
const MAX_IMAGE_SIZE_MB = 8;
const LOCALSTORAGE_KEY = 'anuncio_blocks_v2';

// ============================================================
// ESTADO
// ============================================================
let blocks = [];
let uploadTargetBlockId = null;

// ============================================================
// LOGIN
// ============================================================
async function login() {
    const user = document.getElementById('user').value;
    const password = document.getElementById('password').value;
    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, password })
    });
    if (res.ok) {
        document.getElementById('login-view').style.display = 'none';
        document.getElementById('dashboard-view').style.display = 'block';
        loadDashboard();
    } else {
        document.getElementById('login-error').textContent = 'Credenciales incorrectas';
    }
}

async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    localStorage.removeItem(LOCALSTORAGE_KEY);
    location.reload();
}

// ============================================================
// CARGA INICIAL
// ============================================================
async function loadDashboard() {
    const res = await fetch('/api/consents');
    if (res.ok) {
        const data = await res.json();
        document.getElementById('consent-count').textContent = data.total;
    }
    loadUploadsInfo();
    loadHistory();
    loadFromLocalStorage();
}

async function loadUploadsInfo() {
    const res = await fetch('/api/uploads/info');
    if (!res.ok) return;
    const data = await res.json();
    document.getElementById('uploads-count').textContent = data.count;
    document.getElementById('uploads-size').textContent = data.totalSizeMB + ' MB';
}

// ============================================================
// HELPERS
// ============================================================
function countTotalImages(excludeBlockId = null) {
    let total = 0;
    for (const block of blocks) {
        if (block.id === excludeBlockId) continue;
        if (block.type === 'image' && block.url) total++;
        if (block.type === 'gallery' && block.images) total += block.images.length;
    }
    return total;
}

// ============================================================
// LOCALSTORAGE
// ============================================================
function saveToLocalStorage() {
    try {
        const color = document.getElementById('accent-color').value;
        const data = { blocks, color };
        localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error('Error guardando en localStorage:', e);
    }
}

function loadFromLocalStorage() {
    try {
        const raw = localStorage.getItem(LOCALSTORAGE_KEY);
        if (!raw) {
            renderBlocks();
            return;
        }
        const data = JSON.parse(raw);
        if (data.blocks && Array.isArray(data.blocks)) {
            blocks = data.blocks;
        }
        if (data.color) {
            document.getElementById('accent-color').value = data.color;
        }
        renderBlocks();
    } catch (e) {
        console.error('Error cargando localStorage:', e);
        renderBlocks();
    }
}

// ============================================================
// BLOQUES
// ============================================================
function addBlock() {
    if (blocks.length >= MAX_BLOCKS) {
        alert(`Máximo ${MAX_BLOCKS} bloques`);
        return;
    }

    const type = document.getElementById('block-type').value;
    const block = createBlockByType(type);
    if (!block) return;

    blocks.push(block);
    renderBlocks();
    saveToLocalStorage();
}

function createBlockByType(type) {
    const id = `b_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    switch (type) {
        case 'text':
            return { id, type: 'text', content: '' };
        case 'title':
            return { id, type: 'title', content: '', url: '' };
        case 'image':
            return { id, type: 'image', url: '' };
        case 'gallery':
            return { id, type: 'gallery', images: [] };
        case 'separator':
            return { id, type: 'separator', divider: true, spacing: 'small' };
        case 'field':
            return { id, type: 'field', name: '', value: '', inline: false };
        case 'button':
            return { id, type: 'button', label: '', url: '' };
        default:
            return null;
    }
}

function removeBlock(blockId) {
    blocks = blocks.filter(b => b.id !== blockId);
    renderBlocks();
    saveToLocalStorage();
}

function moveBlock(blockId, direction) {
    const idx = blocks.findIndex(b => b.id === blockId);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    [blocks[idx], blocks[newIdx]] = [blocks[newIdx], blocks[idx]];
    renderBlocks();
    saveToLocalStorage();
}

function updateBlock(blockId, field, value) {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    block[field] = value;
    saveToLocalStorage();
}

function renderBlocks() {
    const container = document.getElementById('blocks-container');
    if (!container) return;

    if (blocks.length === 0) {
        container.innerHTML = '<p class="hint">No hay bloques. Añade uno abajo.</p>';
    } else {
        container.innerHTML = blocks.map((block, idx) => `
            <div class="block">
                ${renderBlockHeader(block, idx)}
                ${renderBlockBody(block)}
            </div>
        `).join('');
    }

    const totalImages = countTotalImages();
    const imageWarning = totalImages > MAX_TOTAL_IMAGES ? ' ⚠️' : '';
    document.getElementById('block-count').textContent =
        `Bloques: ${blocks.length} / ${MAX_BLOCKS}  •  Imágenes: ${totalImages} / ${MAX_TOTAL_IMAGES}${imageWarning}`;
}

function renderBlockHeader(block, idx) {
    const icons = {
        text: '📝', title: '🎨', image: '🖼️',
        gallery: '🖼️🖼️', separator: '─', field: '📋',
        button: '🔘'
    };
    return `
        <div class="block-header">
            <span class="block-title">${icons[block.type] || '?'} ${block.type}</span>
            <div class="block-actions">
                <button onclick="moveBlock('${block.id}', 'up')" ${idx === 0 ? 'disabled' : ''}>↑</button>
                <button onclick="moveBlock('${block.id}', 'down')" ${idx === blocks.length - 1 ? 'disabled' : ''}>↓</button>
                <button onclick="removeBlock('${block.id}')" class="danger">✕</button>
            </div>
        </div>
    `;
}

function renderBlockBody(block) {
    switch (block.type) {
        case 'text':
            return `<textarea placeholder="Escribe el texto (soporta Markdown)..." 
                oninput="updateBlock('${block.id}', 'content', this.value)">${block.content || ''}</textarea>`;

        case 'title':
            return `
                <input placeholder="Título grande" value="${block.content || ''}" 
                    oninput="updateBlock('${block.id}', 'content', this.value)">
                <input placeholder="URL del título (opcional)" value="${block.url || ''}" 
                    oninput="updateBlock('${block.id}', 'url', this.value)">
            `;

        case 'image':
            return `
                <input placeholder="URL de imagen o pega /uploads/..." value="${block.url || ''}" 
                    oninput="updateBlock('${block.id}', 'url', this.value)">
                <button type="button" class="secondary" onclick="triggerUpload('${block.id}')">📁 Subir imagen local</button>
                ${block.url ? `<img class="block-preview-thumb" src="${block.url}" alt="preview">` : ''}
            `;

        case 'gallery':
            return `
                <textarea placeholder="Una URL por línea (máximo 5)..." rows="3"
                    oninput="updateBlock('${block.id}', 'images', this.value.split('\\n').filter(Boolean))"
                >${(block.images || []).join('\n')}</textarea>
                <button type="button" class="secondary" onclick="triggerUpload('${block.id}')">📁 Subir imágenes locales</button>
                <div class="block-preview-thumbs">
                    ${(block.images || []).slice(0, 5).map(u => `<img class="block-preview-thumb" src="${u}" alt="preview">`).join('')}
                </div>
                <p class="hint">${(block.images || []).length} / 5 imágenes en esta galería</p>
            `;

        case 'separator':
            return `
                <label><input type="checkbox" ${block.divider ? 'checked' : ''} 
                    onchange="updateBlock('${block.id}', 'divider', this.checked)"> Con línea divisoria</label>
            `;

        case 'field':
            return `
                <input placeholder="Nombre del campo" value="${block.name || ''}" 
                    oninput="updateBlock('${block.id}', 'name', this.value)">
                <input placeholder="Valor del campo" value="${block.value || ''}" 
                    oninput="updateBlock('${block.id}', 'value', this.value)">
                <label><input type="checkbox" ${block.inline ? 'checked' : ''} 
                    onchange="updateBlock('${block.id}', 'inline', this.checked)"> Inline</label>
            `;

        case 'button':
            return `
                <input placeholder="Texto del botón (máx 80 caracteres)" value="${block.label || ''}" 
                    maxlength="80"
                    oninput="updateBlock('${block.id}', 'label', this.value)">
                <input placeholder="URL (https://...)" value="${block.url || ''}" 
                    oninput="updateBlock('${block.id}', 'url', this.value)">
                <p class="hint">💡 El botón abrirá la URL. Debe empezar por https://</p>
            `;

        default:
            return '';
    }
}

function clearBlocks() {
    if (!confirm('¿Borrar todos los bloques?')) return;
    blocks = [];
    renderBlocks();
    saveToLocalStorage();
}

// ============================================================
// SUBIDA DE IMÁGENES
// ============================================================
function triggerUpload(blockId) {
    // Verificar límite global ANTES de abrir el selector
    const currentTotal = countTotalImages(blockId);
    if (currentTotal >= MAX_TOTAL_IMAGES) {
        alert(`Ya tienes ${MAX_TOTAL_IMAGES} imágenes en total. Quita algunas antes de subir más.`);
        return;
    }
    uploadTargetBlockId = blockId;
    const input = document.getElementById('global-file-input');
    input.value = '';
    input.click();
}

document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();

    const input = document.getElementById('global-file-input');
    if (input) {
        input.addEventListener('change', async (e) => {
            const files = e.target.files;
            if (!files.length || !uploadTargetBlockId) return;

            // Validar tamaño
            for (const f of files) {
                if (f.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
                    alert(`La imagen "${f.name}" pesa más de ${MAX_IMAGE_SIZE_MB} MB`);
                    return;
                }
            }

            const formData = new FormData();
            for (const f of files) formData.append('images', f);

            try {
                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                const data = await res.json();

                if (!res.ok) {
                    alert('Error subiendo: ' + (data.error || 'desconocido'));
                    return;
                }

                const block = blocks.find(b => b.id === uploadTargetBlockId);
                if (!block) return;

                // Calcular cuántas podemos añadir respetando el límite global
                const currentTotal = countTotalImages(block.id);
                const remainingGlobal = MAX_TOTAL_IMAGES - currentTotal;

                if (remainingGlobal <= 0) {
                    alert(`Ya tienes ${MAX_TOTAL_IMAGES} imágenes en total.`);
                    return;
                }

                if (block.type === 'image') {
                    if (remainingGlobal < 1) {
                        alert('No puedes añadir más imágenes.');
                        return;
                    }
                    block.url = data.files[0];
                } else if (block.type === 'gallery') {
                    if (!block.images) block.images = [];
                    const remainingGallery = MAX_IMAGES_PER_GALLERY - block.images.length;
                    const allowed = Math.min(remainingGlobal, remainingGallery, data.files.length);
                    
                    if (allowed <= 0) {
                        alert('Esta galería ya está llena o has alcanzado el límite total.');
                        return;
                    }
                    
                    const toAdd = data.files.slice(0, allowed);
                    block.images.push(...toAdd);
                }

                renderBlocks();
                saveToLocalStorage();
                loadUploadsInfo();
            } catch (err) {
                alert('Error de red: ' + err.message);
            } finally {
                uploadTargetBlockId = null;
                e.target.value = '';
            }
        });
    }
});

// ============================================================
// VISTA PREVIA
// ============================================================
function previewEmbed() {
    const container = document.getElementById('embed-preview');
    const color = document.getElementById('accent-color').value;

    if (blocks.length === 0) {
        container.innerHTML = '<p class="error">⚠️ Añade al menos un bloque.</p>';
        return;
    }

    let html = '<h3 style="color:#5865F2;margin-bottom:10px;font-size:14px;">👁️ Vista previa</h3>';
    html += `<div class="discord-embed" style="border-left-color: ${color};">`;

    for (const block of blocks) {
        html += renderBlockPreview(block);
    }

    html += '</div>';
    container.innerHTML = html;
}

function renderBlockPreview(block) {
    switch (block.type) {
        case 'text':
            return block.content ? `<div class="preview-text">${block.content.replace(/\n/g, '<br>')}</div>` : '';
        case 'title':
            return block.content ? `<div class="embed-title">${block.url ? `<a href="${block.url}">${block.content}</a>` : block.content}</div>` : '';
        case 'image':
            return block.url ? `<img class="embed-image" src="${block.url}">` : '';
        case 'gallery':
            if (!block.images || block.images.length === 0) return '';
            return `<div class="preview-gallery-grid">${block.images.map(u => `<img src="${u}">`).join('')}</div>`;
        case 'separator':
            return '<hr style="border:none;border-top:1px solid #3a3c40;margin:10px 0;">';
        case 'field':
            return block.name && block.value ? `<div class="embed-field"><strong>${block.name}</strong><br>${block.value}</div>` : '';
        case 'button':
            return (block.label && block.url) 
                ? `<span class="preview-button">🔗 ${block.label}</span>` 
                : '';
        default:
            return '';
    }
}

// ============================================================
// ENVIAR ANUNCIO
// ============================================================
async function sendAnnouncement() {
    if (blocks.length === 0) {
        document.getElementById('result').textContent = '⚠️ Añade al menos un bloque';
        document.getElementById('result').className = 'error';
        return;
    }

    // Validar total de imágenes
    const totalImages = countTotalImages();
    if (totalImages > MAX_TOTAL_IMAGES) {
        document.getElementById('result').textContent =
            `❌ Tienes ${totalImages} imágenes. El máximo es ${MAX_TOTAL_IMAGES} por anuncio.`;
        document.getElementById('result').className = 'error';
        return;
    }

    const color = document.getElementById('accent-color').value;

    if (!confirm('¿Enviar este anuncio a TODOS los usuarios consentidos?')) return;

    document.getElementById('send-btn').disabled = true;
    document.getElementById('progress-container').style.display = 'block';
    document.getElementById('result').textContent = '';

    const res = await fetch('/api/announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'custom-blocks', blocks, color })
    });

    const data = await res.json();
    if (!res.ok) {
        document.getElementById('result').textContent = '❌ ' + data.error;
        document.getElementById('result').className = 'error';
        document.getElementById('send-btn').disabled = false;
        return;
    }

    const evtSource = new EventSource(`/api/announcement/${data.sendId}/progress`);
    evtSource.onmessage = (ev) => {
        const p = JSON.parse(ev.data);
        if (p.error) {
            document.getElementById('result').textContent = '❌ ' + p.error;
            document.getElementById('result').className = 'error';
            evtSource.close();
            document.getElementById('send-btn').disabled = false;
            return;
        }
        const pct = p.total ? Math.round((p.procesados / p.total) * 100) : 0;
        document.getElementById('progress-fill').style.width = pct + '%';
        document.getElementById('progress-text').textContent =
            `Procesando ${p.procesados || 0}/${p.total} — ✅ ${p.enviados} | ❌ ${p.fallidos}`;

        if (p.done) {
            document.getElementById('result').textContent = `✅ Completado: ${p.enviados} enviados, ${p.fallidos} fallidos`;
            document.getElementById('result').className = 'success';
            document.getElementById('send-btn').disabled = false;
            evtSource.close();

            // Limpiar bloques que usaban imágenes locales (ya se borraron del servidor)
            blocks = blocks.map(block => {
                if (block.type === 'image' && block.url && block.url.startsWith('/uploads/')) {
                    return { ...block, url: '' };
                }
                if (block.type === 'gallery' && block.images) {
                    return { ...block, images: block.images.filter(u => !u.startsWith('/uploads/')) };
                }
                return block;
            });
            renderBlocks();
            saveToLocalStorage();

            loadHistory();
            loadUploadsInfo();
        }
    };
}

// ============================================================
// HISTORIAL
// ============================================================
async function loadHistory() {
    const res = await fetch('/api/history');
    if (!res.ok) return;
    const history = await res.json();
    const container = document.getElementById('history');
    if (!history.length) {
        container.innerHTML = '<p>Sin historial</p>';
        return;
    }
    container.innerHTML = history.map(h => `
        <div class="history-item">
            <strong>${new Date(h.date).toLocaleString()}</strong>
            <span class="badge">${h.tipo}</span>
            <span>✅ ${h.result.enviados} | ❌ ${h.result.fallidos}</span>
        </div>
    `).join('');
}