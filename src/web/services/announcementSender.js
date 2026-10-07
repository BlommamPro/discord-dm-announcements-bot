const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { buildFromBlocks, getV2Flags } = require('./v2Builder');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
const CONSENTS_PATH = path.join(__dirname, '..', '..', '..', 'consentidos.json');
const FAILED_TRACKER_PATH = path.join(__dirname, '..', '..', '..', 'failed_users.json');

// ============================================================
// CONFIGURACIÓN ANTI-BANEO
// ============================================================
const RATE_LIMIT_MS = 2000;
const BATCH_SIZE = 30;
const BATCH_PAUSE_MS = 10000;
const MAX_CONSECUTIVE_FAILURES = 5;

const MAX_TOTAL_TEXT = 4000;
const SAFETY_MARGIN = 100;

const COOLDOWN_BETWEEN_ANNOUNCEMENTS_MS = 5 * 60 * 1000; // 5 minutos

// ============================================================
// ESTADO GLOBAL
// ============================================================
let sendingInProgress = false;
let lastAnnouncementTime = 0;

let adaptiveDelay = RATE_LIMIT_MS;
const MAX_ADAPTIVE_DELAY = 30000;
const MIN_ADAPTIVE_DELAY = 1500;

function uploadExists(url) {
    if (!url || !url.startsWith('/uploads/')) return true;
    const fn = path.basename(url);
    const filePath = path.join(UPLOAD_DIR, fn);
    return fs.existsSync(filePath);
}

function sanitizeBlocks(blocks) {
    return blocks.map(block => {
        const b = { ...block };
        if (b.type === 'image' && b.url) {
            if (!uploadExists(b.url)) b.url = '';
        }
        if (b.type === 'gallery' && Array.isArray(b.images)) {
            b.images = b.images.filter(uploadExists);
        }
        return b;
    });
}

function splitText(text, maxLength = MAX_TOTAL_TEXT) {
    if (!text) return [];
    if (text.length <= maxLength) return [text];

    const chunks = [];
    let remaining = text;

    while (remaining.length > maxLength) {
        let cutAt = -1;

        cutAt = remaining.lastIndexOf('\n\n', maxLength);
        if (cutAt === -1 || cutAt < maxLength * 0.5) {
            cutAt = remaining.lastIndexOf('\n', maxLength);
        }
        if (cutAt === -1 || cutAt < maxLength * 0.5) {
            cutAt = remaining.lastIndexOf('. ', maxLength);
            if (cutAt !== -1) cutAt += 1;
        }
        if (cutAt === -1 || cutAt < maxLength * 0.5) {
            cutAt = remaining.lastIndexOf(' ', maxLength);
        }
        if (cutAt === -1) cutAt = maxLength;

        chunks.push(remaining.substring(0, cutAt).trim());
        remaining = remaining.substring(cutAt).trim();
    }

    if (remaining.length > 0) chunks.push(remaining);
    return chunks;
}

function blockTextSize(block) {
    switch (block.type) {
        case 'text': return (block.content || '').length;
        case 'title': return (block.content || '').length + 2;
        case 'field': return (block.name || '').length + (block.value || '').length + 4;
        case 'button': return (block.label || '').length;
        default: return 0;
    }
}

function preprocessBlocks(blocks) {
    const result = [];
    for (const block of blocks) {
        if (block.type === 'text' && block.content && block.content.length > MAX_TOTAL_TEXT) {
            const chunks = splitText(block.content, MAX_TOTAL_TEXT - SAFETY_MARGIN);
            for (const chunk of chunks) {
                result.push({
                    ...block,
                    id: `${block.id}_chunk_${result.length}`,
                    content: chunk
                });
            }
        } else {
            result.push(block);
        }
    }
    return result;
}

function paginateBlocks(blocks) {
    const pages = [];
    let currentPage = [];
    let currentTextSize = 0;

    for (const block of blocks) {
        const size = blockTextSize(block);

        if (currentTextSize + size > MAX_TOTAL_TEXT - SAFETY_MARGIN && currentPage.length > 0) {
            pages.push(currentPage);
            currentPage = [];
            currentTextSize = 0;
        }

        currentPage.push(block);
        currentTextSize += size;
    }

    if (currentPage.length > 0) pages.push(currentPage);
    return pages;
}

function buildPayload(blocks, color) {
    const filesMap = new Map();

    const resolveImage = (url) => {
        if (!url) return null;
        if (url.startsWith('/uploads/')) {
            const fn = path.basename(url);
            const filePath = path.join(UPLOAD_DIR, fn);
            if (!fs.existsSync(filePath)) {
                console.warn(`⚠️ Imagen no encontrada, se ignora: ${fn}`);
                return null;
            }
            filesMap.set(fn, filePath);
            return `attachment://${fn}`;
        }
        return url;
    };

    const container = buildFromBlocks(blocks, color, resolveImage, filesMap);
    return { container, filesMap };
}

function deleteFiles(filenames) {
    let borradas = 0;
    const noEncontradas = [];

    for (const filename of filenames) {
        const filePath = path.join(UPLOAD_DIR, filename);
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                borradas++;
            } else {
                noEncontradas.push(filename);
            }
        } catch (err) {
            console.warn(`⚠️ No se pudo borrar ${filename}:`, err.message);
        }
    }

    return { borradas, noEncontradas };
}

function updateAdaptiveDelay() {
    if (adaptiveDelay < MAX_ADAPTIVE_DELAY) {
        adaptiveDelay = Math.min(adaptiveDelay * 1.5, MAX_ADAPTIVE_DELAY);
        console.log(`📈 Delay adaptativo aumentado a ${adaptiveDelay}ms`);
    }
}

function resetAdaptiveDelay() {
    if (adaptiveDelay > MIN_ADAPTIVE_DELAY) {
        adaptiveDelay = Math.max(adaptiveDelay * 0.9, MIN_ADAPTIVE_DELAY);
    }
}

async function sendAnnouncement(client, opts, onProgress) {
    // PROTECCIÓN 1: Lock global
    if (sendingInProgress) {
        throw new Error('Ya hay un anuncio siendo enviado. Espera a que termine.');
    }

    // PROTECCIÓN 2: Cooldown
    const timeSinceLast = Date.now() - lastAnnouncementTime;
    if (lastAnnouncementTime > 0 && timeSinceLast < COOLDOWN_BETWEEN_ANNOUNCEMENTS_MS) {
        const remaining = Math.ceil((COOLDOWN_BETWEEN_ANNOUNCEMENTS_MS - timeSinceLast) / 1000);
        throw new Error(`Espera ${remaining} segundos antes de enviar otro anuncio.`);
    }

    sendingInProgress = true;
    lastAnnouncementTime = Date.now();
    console.log(`🔒 Lock de envío ACTIVADO`);

    try {
        const consentidos = JSON.parse(fs.readFileSync(CONSENTS_PATH, 'utf-8'));
        const sanitizedBlocks = sanitizeBlocks(opts.blocks);
        const processedBlocks = preprocessBlocks(sanitizedBlocks);
        const pages = paginateBlocks(processedBlocks);

        console.log(`📄 Anuncio dividido en ${pages.length} página(s)`);

        const pagePayloads = pages.map(page => buildPayload(page, opts.color));

        const allFilesToDelete = new Set();
        pagePayloads.forEach(p => {
            for (const fn of p.filesMap.keys()) {
                allFilesToDelete.add(fn);
            }
        });

        const total = consentidos.length;
        let enviados = 0;
        let fallidos = 0;

        let failedTracker = {};
        if (fs.existsSync(FAILED_TRACKER_PATH)) {
            try {
                failedTracker = JSON.parse(fs.readFileSync(FAILED_TRACKER_PATH, 'utf-8'));
            } catch { failedTracker = {}; }
        }

        try {
            for (let i = 0; i < consentidos.length; i++) {
                const userId = consentidos[i];

                try {
                    const user = await client.users.fetch(userId).catch(() => null);

                    if (!user) {
                        fallidos++;
                        failedTracker[userId] = (failedTracker[userId] || 0) + 1;
                        continue;
                    }

                    let userFailed = false;
                    for (const { container, filesMap } of pagePayloads) {
                        try {
                            const payload = {
                                components: [container.toJSON ? container.toJSON() : container],
                                flags: getV2Flags()
                            };

                            const validFiles = [];
                            for (const [filename, filePath] of filesMap) {
                                if (fs.existsSync(filePath)) {
                                    validFiles.push({ filename, filePath });
                                }
                            }

                            if (validFiles.length > 0) {
                                payload.files = validFiles.map(({ filename, filePath }) =>
                                    new AttachmentBuilder(filePath, { name: filename })
                                );
                            }

                            await user.send(payload);

                            if (pagePayloads.length > 1) {
                                await new Promise(r => setTimeout(r, 1500));
                            }
                        } catch (pageErr) {
                            // PROTECCIÓN 3: Detección de 429
                            if (pageErr.status === 429 || pageErr.code === 429) {
                                const retryAfter = (pageErr.retry_after || pageErr.retryAfter || 5) * 1000;
                                console.warn(`⚠️ RATE LIMIT detectado. Esperando ${retryAfter}ms...`);
                                updateAdaptiveDelay();
                                await new Promise(r => setTimeout(r, retryAfter));
                                userFailed = true;
                                break;
                            }

                            console.error(`⚠️ Error enviando página a ${userId}:`, pageErr.message);
                            userFailed = true;
                            break;
                        }
                    }

                    if (userFailed) {
                        fallidos++;
                        failedTracker[userId] = (failedTracker[userId] || 0) + 1;
                    } else {
                        enviados++;
                        delete failedTracker[userId];
                        resetAdaptiveDelay();
                    }
                } catch (err) {
                    console.warn(`⚠️ Falló ${userId}:`, err.message);
                    fallidos++;
                    failedTracker[userId] = (failedTracker[userId] || 0) + 1;
                }

                if (onProgress) {
                    onProgress({ enviados, fallidos, total, procesados: i + 1 });
                }

                await new Promise(r => setTimeout(r, adaptiveDelay));

                if ((i + 1) % BATCH_SIZE === 0 && i + 1 < consentidos.length) {
                    console.log(`⏸️ Pausa de lote (${i + 1}/${total}) — delay actual: ${adaptiveDelay}ms`);
                    await new Promise(r => setTimeout(r, BATCH_PAUSE_MS));
                }
            }
        } finally {
            if (allFilesToDelete.size > 0) {
                console.log(`🗑️ Borrando ${allFilesToDelete.size} imagen(es)`);
                const { borradas } = deleteFiles(Array.from(allFilesToDelete));
                if (borradas > 0) {
                    console.log(`✅ Borradas ${borradas} imagen(es)`);
                }
            }
        }

        try {
            fs.writeFileSync(FAILED_TRACKER_PATH, JSON.stringify(failedTracker, null, 2));
        } catch (e) {
            console.warn('⚠️ No se pudo guardar failed_users.json:', e.message);
        }

        const toRemove = Object.entries(failedTracker)
            .filter(([_, count]) => count >= MAX_CONSECUTIVE_FAILURES)
            .map(([uid]) => uid);

        if (toRemove.length > 0) {
            const cleaned = consentidos.filter(uid => !toRemove.includes(uid));
            fs.writeFileSync(CONSENTS_PATH, JSON.stringify(cleaned, null, 2));
            console.log(`🧹 Eliminados ${toRemove.length} usuarios inactivos`);
        }

        return { enviados, fallidos, total, pages: pages.length };
    } finally {
        sendingInProgress = false;
        console.log(`🔓 Lock de envío DESACTIVADO`);
    }
}

function isSending() {
    return sendingInProgress;
}

function getCooldownRemaining() {
    const timeSinceLast = Date.now() - lastAnnouncementTime;
    const remaining = Math.max(0, COOLDOWN_BETWEEN_ANNOUNCEMENTS_MS - timeSinceLast);
    return Math.ceil(remaining / 1000);
}

module.exports = {
    sendAnnouncement,
    isSending,
    getCooldownRemaining
};