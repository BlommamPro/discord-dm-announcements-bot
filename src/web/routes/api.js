const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../middleware/auth');
const { sendAnnouncement, isSending, getCooldownRemaining } = require('../services/announcementSender');
const { cleanupOldUploads, cleanupAllUploads, countUploads } = require('../services/cleanup');

const ROOT = path.join(__dirname, '..', '..', '..');
const CONSENTS_PATH = path.join(ROOT, 'consentidos.json');
const CONFIG_PATH = path.join(ROOT, 'config.json');
const HISTORY_PATH = path.join(ROOT, 'historial.json');

const activeSends = new Map();

module.exports = (client) => {
    const router = express.Router();

    // --- Diagnóstico ---
    router.get('/ping', (req, res) => {
        res.json({
            ok: true,
            consentsExists: fs.existsSync(CONSENTS_PATH),
            clientReady: client ? client.isReady() : false,
            uploadsCount: countUploads(),
            isSending: isSending(),
            cooldownRemaining: getCooldownRemaining()
        });
    });

    // --- Consentidos ---
    router.get('/consents', requireAuth, (req, res) => {
        try {
            const data = fs.existsSync(CONSENTS_PATH)
                ? JSON.parse(fs.readFileSync(CONSENTS_PATH, 'utf-8'))
                : [];
            res.json({ total: data.length, users: data });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // --- Config ---
    router.get('/config', requireAuth, (req, res) => {
        try {
            res.json(JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')));
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // --- Estado del envío (para que el frontend consulte) ---
    router.get('/announcement/status', requireAuth, (req, res) => {
        res.json({
            isSending: isSending(),
            cooldownRemaining: getCooldownRemaining()
        });
    });

    // --- Enviar anuncio ---
    router.post('/announcement', requireAuth, async (req, res) => {
        const { tipo, blocks, color } = req.body;

        // PROTECCIÓN: Lock global
        if (isSending()) {
            return res.status(429).json({
                error: 'Ya hay un anuncio siendo enviado. Espera a que termine.'
            });
        }

        // PROTECCIÓN: Cooldown
        const cooldown = getCooldownRemaining();
        if (cooldown > 0) {
            return res.status(429).json({
                error: `Espera ${cooldown} segundos antes de enviar otro anuncio.`
            });
        }

        if (!client || !client.isReady()) {
            return res.status(503).json({ error: 'El bot no está listo' });
        }

        if (tipo !== 'custom-blocks' || !blocks || blocks.length === 0) {
            return res.status(400).json({ error: 'Anuncio vacío' });
        }

        if (blocks.length > 20) {
            return res.status(400).json({ error: 'Máximo 20 bloques' });
        }

        const sendId = `send-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        activeSends.set(sendId, { progress: null });

        res.json({ ok: true, sendId });

        try {
            const result = await sendAnnouncement(
                client,
                { blocks, color },
                (progress) => {
                    const entry = activeSends.get(sendId);
                    if (entry) entry.progress = progress;
                }
            );

            saveHistory({
                sendId,
                tipo: 'custom-blocks',
                blocksCount: blocks.length,
                result,
                date: new Date().toISOString()
            });

            const entry = activeSends.get(sendId);
            if (entry) entry.progress = { ...entry.progress, ...result, done: true };

            setTimeout(() => activeSends.delete(sendId), 5 * 60 * 1000);
        } catch (err) {
            console.error('❌ Error en envío:', err);
            const entry = activeSends.get(sendId);
            if (entry) entry.progress = { error: err.message, done: true };
        }
    });

    // --- SSE de progreso ---
    router.get('/announcement/:sendId/progress', requireAuth, (req, res) => {
        const { sendId } = req.params;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        const interval = setInterval(() => {
            const entry = activeSends.get(sendId);
            if (!entry) {
                res.write(`data: ${JSON.stringify({ error: 'Envío no encontrado' })}\n\n`);
                clearInterval(interval);
                res.end();
                return;
            }
            if (entry.progress) {
                res.write(`data: ${JSON.stringify(entry.progress)}\n\n`);
                if (entry.progress.done) {
                    clearInterval(interval);
                    res.end();
                }
            }
        }, 500);

        req.on('close', () => clearInterval(interval));
    });

    // --- Historial ---
    router.get('/history', requireAuth, (req, res) => {
        if (!fs.existsSync(HISTORY_PATH)) return res.json([]);
        res.json(JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8')));
    });

    // --- Info de uploads ---
    router.get('/uploads/info', requireAuth, (req, res) => {
        try {
            const UPLOAD_DIR = path.join(ROOT, 'src', 'web', 'public', 'uploads');
            const files = fs.existsSync(UPLOAD_DIR)
                ? fs.readdirSync(UPLOAD_DIR).filter(f => f !== '.gitkeep')
                : [];

            let totalSize = 0;
            for (const f of files) {
                try {
                    const stat = fs.statSync(path.join(UPLOAD_DIR, f));
                    totalSize += stat.size;
                } catch {}
            }

            res.json({
                count: files.length,
                totalSize,
                totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // --- Limpiar TODAS las imágenes ---
    router.post('/uploads/cleanup-all', requireAuth, (req, res) => {
        try {
            const borrados = cleanupAllUploads();
            res.json({ ok: true, borrados });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // --- Limpiar solo las antiguas ---
    router.post('/uploads/cleanup-old', requireAuth, (req, res) => {
        try {
            const borrados = cleanupOldUploads();
            res.json({ ok: true, borrados });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};

function saveHistory(entry) {
    let history = [];
    if (fs.existsSync(HISTORY_PATH)) {
        history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
    }
    history.unshift(entry);
    if (history.length > 100) history = history.slice(0, 100);
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}