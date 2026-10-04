const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
    const { user, password } = req.body;
    const validUser = process.env.DASHBOARD_USER || 'admin';
    const validPass = process.env.DASHBOARD_PASSWORD || 'admin123';

    if (user === validUser && password === validPass) {
        req.session.loggedIn = true;
        return res.json({ ok: true });
    }
    res.status(401).json({ error: 'Credenciales inválidas' });
});

router.post('/logout', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
});

module.exports = router;