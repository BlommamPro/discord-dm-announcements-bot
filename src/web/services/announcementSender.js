const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { buildFromBlocks, getV2Flags } = require('./v2Builder');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
const CONSENTS_PATH = path.join(__dirname, '..', '..', '..', 'consentidos.json');
const FAILED_TRACKER_PATH = path.join(__dirname, '..', '..', '..', 'failed_users.json');

const RATE_LIMIT_MS = 1500;
const BATCH_SIZE = 50;
const BATCH_PAUSE_MS = 5000;
const MAX_CONSECUTIVE_FAILURES = 5;

const MAX_TOTAL_TEXT = 4000;
const SAFETY_MARGIN = 100; // Margen para evitar pasarse por poco

/**
 * Verifica si una imagen local existe.
 */
function uploadExists(url) {
    if (!url || !url.startsWith('/uploads/')) return true;
    const fn = path.basename(url);
    const filePath = path.join(UPLOAD_DIR, fn);
    return fs.existsSync(filePath);
}

/**
 * Sanitiza los bloques eliminando imágenes inexistentes.
 */
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

/**
 * Divide un texto largo en chunks por párrafos/frases.
 */
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

/**
 * Calcula el tamaño de texto de un bloque.
 */
function blockTextSize(block) {
    switch (block.type) {
        case 'text':
            return (block.content || '').length;
        case 'title':
            return (block.content || '').length + 2;
        case 'field':
            return (block.name || '').length + (block.value || '').length + 4;
        case 'button':
            return (block.label || '').length;
        default:
            return 0;
    }
}

/**
 * Pre-procesa los bloques: divide los que superen el límite individual.
 */
function preprocessBlocks(blocks) {
    const result = [];

    for (const block of blocks) {
        // Si es un bloque de texto y supera el límite, dividirlo
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

/**
 * Divide los bloques en páginas que no superen el límite de texto.
 */
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

    if (currentPage.length > 0) {
        pages.push(currentPage);
    }

    return pages;
}

/**
 * Construye el payload V2 desde los bloques.
 */
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

async function sendAnnouncement(client, opts, onProgress) {
    const consentidos = JSON.parse(fs.readFileSync(CONSENTS_PATH, 'utf-8'));

    // 1. Sanitizar bloques (imágenes inexistentes)
    const sanitizedBlocks = sanitizeBlocks(opts.blocks);

    // 2. Pre-procesar (dividir bloques de texto >4000)
    const processedBlocks = preprocessBlocks(sanitizedBlocks);

    // 3. Paginar
    const pages = paginateBlocks(processedBlocks);

    console.log(`📄 Anuncio dividido en ${pages.length} página(s)`);
    pages.forEach((page, i) => {
        const totalSize = page.reduce((sum, b) => sum + blockTextSize(b), 0);
        console.log(`   Página ${i + 1}: ${page.length} bloques, ~${totalSize} caracteres`);
    });

    // 4. Construir payloads
    const pagePayloads = pages.map(page => buildPayload(page, opts.color));

    // Archivos a borrar
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

    // ============================================================
    // ENVÍO
    // ============================================================
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
                            await new Promise(r => setTimeout(r, 1000));
                        }
                    } catch (pageErr) {
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
                }
            } catch (err) {
                console.warn(`⚠️ Falló ${userId}:`, err.message);
                fallidos++;
                failedTracker[userId] = (failedTracker[userId] || 0) + 1;
            }

            if (onProgress) {
                onProgress({ enviados, fallidos, total, procesados: i + 1 });
            }

            await new Promise(r => setTimeout(r, RATE_LIMIT_MS));

            if ((i + 1) % BATCH_SIZE === 0 && i + 1 < consentidos.length) {
                console.log(`⏸️ Pausa de lote (${i + 1}/${total})`);
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
}

module.exports = { sendAnnouncement };