const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { buildFromBlocks, getV2Flags } = require('./v2Builder');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
const CONSENTS_PATH = path.join(__dirname, '..', '..', '..', 'consentidos.json');
const FAILED_TRACKER_PATH = path.join(__dirname, '..', '..', '..', 'failed_users.json');

// Configuración optimizada para 3000 usuarios
const RATE_LIMIT_MS = 1500;
const BATCH_SIZE = 50;
const BATCH_PAUSE_MS = 5000;
const MAX_CONSECUTIVE_FAILURES = 5;

/**
 * Verifica si un archivo /uploads/xxx existe en disco.
 */
function uploadExists(url) {
    if (!url || !url.startsWith('/uploads/')) return true; // URL externa → siempre válida
    const fn = path.basename(url);
    const filePath = path.join(UPLOAD_DIR, fn);
    return fs.existsSync(filePath);
}

/**
 * Limpia los bloques eliminando imágenes que ya no existen.
 * Devuelve una copia de los bloques (no modifica el original).
 */
function sanitizeBlocks(blocks) {
    return blocks.map(block => {
        const b = { ...block };

        if (b.type === 'image' && b.url) {
            if (!uploadExists(b.url)) {
                b.url = ''; // Imagen desaparecida → bloque vacío
            }
        }

        if (b.type === 'gallery' && Array.isArray(b.images)) {
            b.images = b.images.filter(uploadExists);
        }

        return b;
    });
}

/**
 * Construye el payload V2 desde los bloques ya sanitizados.
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
                return null; // ← Ignorar en lugar de referenciar
            }
            filesMap.set(fn, filePath);
            return `attachment://${fn}`;
        }
        return url;
    };

    const container = buildFromBlocks(blocks, color, resolveImage, filesMap);

    return { container, filesMap };
}

/**
 * Envía el anuncio con batching para 3000 usuarios.
 */
async function sendAnnouncement(client, opts, onProgress) {
    const consentidos = JSON.parse(fs.readFileSync(CONSENTS_PATH, 'utf-8'));

    // 1. Sanitizar bloques (quitar imágenes que ya no existen)
    const sanitizedBlocks = sanitizeBlocks(opts.blocks);
    const totalImagesRemoved = opts.blocks.length - sanitizedBlocks.length;
    
    // 2. Construir payload
    const { container, filesMap } = buildPayload(sanitizedBlocks, opts.color);

    if (!container) {
        throw new Error('No se pudo construir el anuncio');
    }

    const total = consentidos.length;
    let enviados = 0;
    let fallidos = 0;

    // Tracker de fallos consecutivos
    let failedTracker = {};
    if (fs.existsSync(FAILED_TRACKER_PATH)) {
        try {
            failedTracker = JSON.parse(fs.readFileSync(FAILED_TRACKER_PATH, 'utf-8'));
        } catch { failedTracker = {}; }
    }

    // Verificar que al menos hay UN archivo válido
    const validFiles = [];
    for (const [filename, filePath] of filesMap) {
        if (fs.existsSync(filePath)) {
            validFiles.push({ filename, filePath });
        }
    }

    if (filesMap.size > 0 && validFiles.length === 0) {
        throw new Error('Las imágenes del anuncio ya no existen en el servidor. Vuelve a subirlas.');
    }

    for (let i = 0; i < consentidos.length; i++) {
        const userId = consentidos[i];

        try {
            const user = await client.users.fetch(userId).catch(() => null);

            if (!user) {
                fallidos++;
                failedTracker[userId] = (failedTracker[userId] || 0) + 1;
                continue;
            }

            // Construir payload fresco por cada usuario
            const payload = {
                components: [container.toJSON ? container.toJSON() : container],
                flags: getV2Flags()
            };

            // Recrear attachments por cada envío
            if (validFiles.length > 0) {
                const attachments = validFiles.map(({ filename, filePath }) =>
                    new AttachmentBuilder(filePath, { name: filename })
                );
                payload.files = attachments;
            }

            await user.send(payload);
            enviados++;
            delete failedTracker[userId];
        } catch (err) {
            console.warn(`⚠️ Falló ${userId}:`, err.message);
            fallidos++;
            failedTracker[userId] = (failedTracker[userId] || 0) + 1;
        }

        if (onProgress) {
            onProgress({ enviados, fallidos, total, procesados: i + 1 });
        }

        await new Promise(r => setTimeout(r, RATE_LIMIT_MS));

        // Pausa cada BATCH_SIZE envíos
        if ((i + 1) % BATCH_SIZE === 0 && i + 1 < consentidos.length) {
            console.log(`⏸️ Pausa de lote (${i + 1}/${total})`);
            await new Promise(r => setTimeout(r, BATCH_PAUSE_MS));
        }
    }

    // Guardar tracker de fallos
    try {
        fs.writeFileSync(FAILED_TRACKER_PATH, JSON.stringify(failedTracker, null, 2));
    } catch (e) {
        console.warn('⚠️ No se pudo guardar failed_users.json:', e.message);
    }

    // Auto-eliminar usuarios con 5+ fallos
    const toRemove = Object.entries(failedTracker)
        .filter(([_, count]) => count >= MAX_CONSECUTIVE_FAILURES)
        .map(([uid]) => uid);

    if (toRemove.length > 0) {
        const cleaned = consentidos.filter(uid => !toRemove.includes(uid));
        fs.writeFileSync(CONSENTS_PATH, JSON.stringify(cleaned, null, 2));
        console.log(`🧹 Eliminados ${toRemove.length} usuarios inactivos`);
    }

    // Borrado de imágenes SOLO después de enviar a todos
    try {
        let borradas = 0;
        for (const [filename] of filesMap) {
            const filePath = path.join(UPLOAD_DIR, filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                borradas++;
            }
        }
        if (borradas > 0) console.log(`🗑️ Borradas ${borradas} imagen(es)`);
    } catch (err) {
        console.warn('⚠️ Error borrando imágenes:', err.message);
    }

    return { enviados, fallidos, total };
}

module.exports = { sendAnnouncement };