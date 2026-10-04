function requireAuth(req, res, next) {
    if (req.session && req.session.loggedIn) return next();
    res.status(401).json({ error: 'No autorizado' });
}

module.exports = { requireAuth };