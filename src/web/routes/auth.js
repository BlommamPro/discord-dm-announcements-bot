const express = require('express');
const router = express.Router();
const { loadJson } = require('../../utils/jsonHandler');

// ============================================================
// CONFIGURACIÓN OAUTH2
// ============================================================
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_OAUTH_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_OAUTH_REDIRECT_URL || 'http://localhost:3000/api/discord/callback';
const GUILD_ID = process.env.GUILD_ID;
const BOT_OWNER_ID = process.env.BOT_OWNER_ID;

const SCOPES = ['identify', 'guilds', 'guilds.members.read'];

// ============================================================
// LOGIN — redirige a Discord
// ============================================================
router.get('/discord', (req, res) => {
    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: SCOPES.join(' '),
        prompt: 'consent'
    });

    res.redirect(`https://discord.com/oauth2/authorize?${params}`);
});

// ============================================================
// CALLBACK — Discord devuelve aquí
// ============================================================
router.get('/discord/callback', async (req, res) => {
    const code = req.query.code;
    const error = req.query.error;

    if (error) {
        console.warn(`⚠️ OAuth2 error: ${error}`);
        return res.redirect('/?error=' + encodeURIComponent(error));
    }

    if (!code) {
        return res.redirect('/?error=no_code');
    }

    try {
        // 1. Intercambiar code por access_token
        const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI
            })
        });

        if (!tokenRes.ok) {
            console.error('❌ Error obteniendo token:', await tokenRes.text());
            return res.redirect('/?error=token_exchange_failed');
        }

        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;

        // 2. Obtener info del usuario
        const userRes = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!userRes.ok) {
            console.error('❌ Error obteniendo usuario:', await userRes.text());
            return res.redirect('/?error=user_fetch_failed');
        }

        const user = await userRes.json();
        const userId = user.id;

        console.log(`🔐 Intento de login: ${user.username} (${userId})`);

        // ============================================================
        // 3. VERIFICAR: ¿Es el owner del BOT?
        // ============================================================
        const isBotOwner = BOT_OWNER_ID && userId === BOT_OWNER_ID;

        // ============================================================
        // 4. Si NO es el owner del bot, verificar que esté en el guild y tenga permisos
        // ============================================================
        let hasAdminRole = false;
        let isServerOwner = false;
        let isInGuild = false;

        if (!isBotOwner) {
            // Solo verificamos guild y permisos si NO es el owner del bot

            // 4.1. Obtener info del miembro en el servidor
            const memberRes = await fetch(
                `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            if (!memberRes.ok) {
                console.warn(`⚠️ Usuario ${user.username} no está en el guild`);
                return res.redirect('/?error=not_in_guild');
            }

            const member = await memberRes.json();
            isInGuild = true;

            // 4.2. Verificar rol
            const config = loadJson('config.json', {});
            const adminRoleId = config.admin_role_id;
            hasAdminRole = adminRoleId && member.roles.includes(adminRoleId);

            // 4.3. Verificar si es owner del server
            const client = req.app.get('discordClient');
            if (client) {
                const guild = client.guilds.cache.get(GUILD_ID);
                if (guild && guild.ownerId === userId) {
                    isServerOwner = true;
                }
            }

            // 4.4. Rechazar si no tiene permisos
            if (!hasAdminRole && !isServerOwner) {
                console.warn(`⚠️ Usuario ${user.username} sin permisos`);
                return res.redirect('/?error=no_permission');
            }
        }

        // 5. Crear sesión
        req.session.loggedIn = true;
        req.session.userId = userId;
        req.session.username = user.username;
        req.session.avatar = user.avatar;
        req.session.isOwner = isServerOwner;
        req.session.isBotOwner = isBotOwner;
        req.session.hasAdminRole = hasAdminRole;

        // Log del tipo de acceso
        if (isBotOwner) {
            console.log(`✅ Login correcto (BOT OWNER): ${user.username} (${userId})`);
        } else if (isServerOwner) {
            console.log(`✅ Login correcto (SERVER OWNER): ${user.username} (${userId})`);
        } else if (hasAdminRole) {
            console.log(`✅ Login correcto (ROL): ${user.username} (${userId})`);
        }

        res.redirect('/');
    } catch (err) {
        console.error('❌ Error en OAuth2:', err);
        res.redirect('/?error=internal_error');
    }
});

// ============================================================
// LOGOUT
// ============================================================
router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ ok: true });
    });
});

// ============================================================
// INFO DEL USUARIO LOGUEADO
// ============================================================
router.get('/me', (req, res) => {
    if (req.session.loggedIn) {
        return res.json({
            loggedIn: true,
            userId: req.session.userId,
            username: req.session.username,
            avatar: req.session.avatar,
            isOwner: req.session.isOwner || false,
            isBotOwner: req.session.isBotOwner || false,
            hasAdminRole: req.session.hasAdminRole || false
        });
    }
    res.json({ loggedIn: false });
});

// ============================================================
// MIDDLEWARE
// ============================================================
function requireAuth(req, res, next) {
    if (req.session && req.session.loggedIn) return next();
    res.status(401).json({ error: 'No autorizado' });
}

module.exports = router;
module.exports.requireAuth = requireAuth;