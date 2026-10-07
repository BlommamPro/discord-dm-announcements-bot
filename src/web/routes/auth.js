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
// HELPER: Notificar al owner del bot
// ============================================================
async function notifyOwner(client, user, reason, req) {
    if (!BOT_OWNER_ID || !client) return;

    try {
        const owner = await client.users.fetch(BOT_OWNER_ID).catch(() => null);
        if (!owner) {
            console.warn(`⚠️ No se pudo encontrar al owner ${BOT_OWNER_ID} para notificar`);
            return;
        }

        const razones = {
            'not_in_guild': '🚫 No está en el servidor',
            'no_permission': '🔒 No tiene el rol autorizado'
        };

        const ip = req.headers['cf-connecting-ip'] 
            || req.headers['x-forwarded-for']?.split(',')[0] 
            || req.connection?.remoteAddress 
            || 'Desconocida';

        const timestamp = Math.floor(Date.now() / 1000);

        const mensaje = 
            `⚠️ **Intento de acceso a la dashboard**\n\n` +
            `👤 **Usuario:** ${user.username} (\`${user.id}\`)\n` +
            `❌ **Motivo:** ${razones[reason] || reason}\n` +
            `🌐 **IP:** \`${ip}\`\n` +
            `🕐 **Cuándo:** <t:${timestamp}:f> (<t:${timestamp}:R>)\n\n` +
            `Si no reconoces este intento, revisa quién tiene acceso a tu dashboard.`;

        await owner.send(mensaje);
        console.log(`📨 Notificación enviada al owner sobre: ${user.username}`);
    } catch (err) {
        console.warn('⚠️ No se pudo enviar notificación al owner:', err.message);
    }
}

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

        // 3. ¿Es el owner del bot?
        const isBotOwner = BOT_OWNER_ID && userId === BOT_OWNER_ID;

        let hasAdminRole = false;
        let isServerOwner = false;
        let isInGuild = false;

        const client = req.app.get('discordClient');

        if (!isBotOwner) {
            // Verificar que esté en el guild
            const memberRes = await fetch(
                `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            if (!memberRes.ok) {
                console.warn(`⚠️ Usuario ${user.username} no está en el guild`);
                
                // 🔔 Notificar al owner
                await notifyOwner(client, user, 'not_in_guild', req);
                
                return res.redirect('/?error=not_in_guild');
            }

            const member = await memberRes.json();
            isInGuild = true;

            // Verificar rol
            const config = loadJson('config.json', {});
            const adminRoleId = config.admin_role_id;
            hasAdminRole = adminRoleId && member.roles.includes(adminRoleId);

            // Verificar si es owner del server
            if (client) {
                const guild = client.guilds.cache.get(GUILD_ID);
                if (guild && guild.ownerId === userId) {
                    isServerOwner = true;
                }
            }

            // Rechazar si no tiene permisos
            if (!hasAdminRole && !isServerOwner) {
                console.warn(`⚠️ Usuario ${user.username} sin permisos`);
                
                // 🔔 Notificar al owner
                await notifyOwner(client, user, 'no_permission', req);
                
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