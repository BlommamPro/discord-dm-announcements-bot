const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
const MAX_AGE_HOURS = 1; // Borra imágenes con más de 24h

/**
 * Borra todas las imágenes con más de MAX_AGE_HOURS de antigüedad.
 */
function cleanupOldUploads() {
    if (!fs.existsSync(UPLOAD_DIR)) return 0;

    const now = Date.now();
    const maxAge = MAX_AGE_HOURS * 60 * 60 * 1000;
    let borrados = 0;

    const files = fs.readdirSync(UPLOAD_DIR);
    for (const file of files) {
        if (file === '.gitkeep') continue;

        const filePath = path.join(UPLOAD_DIR, file);
        try {
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > maxAge) {
                fs.unlinkSync(filePath);
                borrados++;
            }
        } catch (err) {
            console.warn(`⚠️ No se pudo borrar ${file}:`, err.message);
        }
    }

    if (borrados > 0) {
        console.log(`🧹 Limpieza: ${borrados} imagen(es) borrada(s) (>${MAX_AGE_HOURS}h)`);
    }
    return borrados;
}

/**
 * Borra TODAS las imágenes de la carpeta uploads (excepto .gitkeep).
 */
function cleanupAllUploads() {
    if (!fs.existsSync(UPLOAD_DIR)) return 0;

    let borrados = 0;
    const files = fs.readdirSync(UPLOAD_DIR);
    for (const file of files) {
        if (file === '.gitkeep') continue;
        try {
            fs.unlinkSync(path.join(UPLOAD_DIR, file));
            borrados++;
        } catch (err) {
            console.warn(`⚠️ No se pudo borrar ${file}:`, err.message);
        }
    }
    return borrados;
}

/**
 * Cuenta cuántas imágenes hay en uploads/.
 */
function countUploads() {
    if (!fs.existsSync(UPLOAD_DIR)) return 0;
    return fs.readdirSync(UPLOAD_DIR).filter(f => f !== '.gitkeep').length;
}

/**
 * Inicia el job de limpieza automática.
 * @param {number} intervalMinutes - Cada cuántos minutos se ejecuta
 */
function startCleanupJob(intervalMinutes = 60) {
    cleanupOldUploads();
    setInterval(cleanupOldUploads, intervalMinutes * 60 * 1000);
    console.log(`🧹 Limpieza automática activada (cada ${intervalMinutes} min, borra >${MAX_AGE_HOURS}h)`);
}

module.exports = {
    startCleanupJob,
    cleanupOldUploads,
    cleanupAllUploads,
    countUploads
};