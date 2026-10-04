const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const id = crypto.randomBytes(8).toString('hex');
        cb(null, `${Date.now()}-${id}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Solo se permiten imágenes'));
    }
});

module.exports = () => {
    const router = express.Router();

    router.post('/upload', requireAuth, upload.array('images', 10), (req, res) => {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No se subieron archivos' });
        }
        const urls = req.files.map(f => `/uploads/${f.filename}`);
        res.json({ ok: true, files: urls });
    });

    router.delete('/upload/:filename', requireAuth, (req, res) => {
        const filePath = path.join(UPLOAD_DIR, req.params.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.json({ ok: true });
    });

    return router;
};