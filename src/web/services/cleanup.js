const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
const MAX_AGE_HOURS = 1; // Borra imágenes con más de 1 hora

/**
 * Borra todas las imágenes con más de MAX_AGE_HOURS de antigüedad.
 * Devuelve el número de archivos borrados.
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
 * Devuelve info detallada de las imágenes en uploads/.
 */
function listUploads() {
    if (!fs.existsSync(UPLOAD_DIR)) return { count: 0, files: [], totalSize: 0 };

    const files = fs.readdirSync(UPLOAD_DIR).filter(f => f !== '.gitkeep');
    let totalSize = 0;
    const details = files.map(f => {
        try {
            const stat = fs.statSync(path.join(UPLOAD_DIR, f));
            totalSize += stat.size;
            return {
                name: f,
                size: stat.size,
                ageMinutes: Math.floor((Date.now() - stat.mtimeMs) / 60000)
            };
        } catch {
            return { name: f, size: 0, ageMinutes: 0 };
        }
    });

    return { count: files.length, files: details, totalSize };
}

/**
 * Inicia el job de limpieza automática.
 * Ejecuta una limpieza INMEDIATA al arrancar.
 */
function startCleanupJob(intervalMinutes = 30) {
    // Limpieza inicial (al arrancar el bot)
    console.log('🧹 Ejecutando limpieza inicial...');
    const inicial = cleanupOldUploads();
    if (inicial > 0) {
        console.log(`✅ ${inicial} imagen(es) huérfana(s) borrada(s) al arrancar`);
    } else {
        console.log('✅ Nada que limpiar');
    }

    // Limpieza periódica
    setInterval(cleanupOldUploads, intervalMinutes * 60 * 1000);
    console.log(`🧹 Limpieza automática activada (cada ${intervalMinutes} min, borra >${MAX_AGE_HOURS}h)`);
}

module.exports = {
    startCleanupJob,
    cleanupOldUploads,
    cleanupAllUploads,
    countUploads,
    listUploads
};