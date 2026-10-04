const { loadJson, saveJson } = require('./jsonHandler');

/**
 * Normaliza un emoji para comparar con reaction.emoji.name
 * - Unicode (✅) → devuelve tal cual
 * - Custom (<:E_S:123>) → devuelve solo el nombre 'E_S'
 */
function normalizeEmojiName(e) {
    if (!e) return '';
    const customMatch = e.match(/^<a?:(\w+):(\d+)>$/);
    if (customMatch) return customMatch[1];
    return e;
}

/**
 * Extrae el ID de un emoji custom, si lo tiene.
 */
function extractEmojiId(e) {
    if (!e) return null;
    const match = e.match(/^<a?:\w+:(\d+)>$/);
    return match ? match[1] : null;
}

/**
 * Sincroniza el mensaje de consentimiento:
 *  - Añade la reacción del emoji configurado (puesta por el bot)
 *  - Lee todos los usuarios que reaccionaron (excluyendo bots)
 *  - Actualiza consentidos.json
 */
async function syncConsentimiento(client) {
    const config = loadJson('config.json', {});
    const channelId = config.canal_consentimiento_id;
    const messageId = config.mensaje_consentimiento_id;
    const emoji = config.emoji_consentimiento || '✅';

    if (!channelId || channelId === '0') {
        return { ok: false, message: '❌ Falta canal_consentimiento_id en config.json' };
    }
    if (!messageId || messageId === '0') {
        return { ok: false, message: '❌ Falta mensaje_consentimiento_id en config.json' };
    }

    console.log(`🔄 Sincronizando consentimiento...`);
    console.log(`   Canal: ${channelId}`);
    console.log(`   Mensaje: ${messageId}`);
    console.log(`   Emoji: ${emoji}`);

    // 1. Obtener canal
    const channel = await client.channels.fetch(channelId).catch((err) => {
        console.error(`❌ No se encontró el canal ${channelId}:`, err.message);
        return null;
    });

    if (!channel) {
        return { ok: false, message: `❌ No se encontró el canal con ID ${channelId}` };
    }

    if (!channel.isTextBased()) {
        return { ok: false, message: '❌ El canal no es de texto' };
    }

    // 2. Obtener mensaje
    const message = await channel.messages.fetch(messageId).catch((err) => {
        console.error(`❌ No se encontró el mensaje ${messageId}:`, err.message);
        return null;
    });

    if (!message) {
        return { ok: false, message: `❌ No se encontró el mensaje con ID ${messageId}` };
    }

    // 3. Normalizar
    const emojiName = normalizeEmojiName(emoji);
    const emojiId = extractEmojiId(emoji);

    // 4. Comprobar si el bot ya reaccionó
    const botReaction = message.reactions.cache.find(r => {
        if (r.me !== true) return false;
        if (r.emoji.name === emojiName) return true;
        if (emojiId && r.emoji.id === emojiId) return true;
        return false;
    });

    if (!botReaction) {
        try {
            await message.react(emoji);
            console.log(`   ✅ Reacción ${emoji} añadida al mensaje (por el bot)`);
            await new Promise(r => setTimeout(r, 1500));
        } catch (err) {
            console.error(`❌ No se pudo añadir la reacción ${emoji}:`, err.message);
            return {
                ok: false,
                message: `❌ No se pudo añadir la reacción ${emoji}: ${err.message}`
            };
        }
    } else {
        console.log(`   ℹ️ El bot ya tiene la reacción ${emoji} puesta`);
    }

    // 5. Refrescar mensaje
    const freshMessage = await channel.messages.fetch(messageId).catch(() => null);
    if (!freshMessage) {
        return { ok: false, message: '❌ Error al refrescar el mensaje' };
    }

    // 6. Buscar la reacción (por nombre O por ID)
    const reaction = freshMessage.reactions.cache.find(r => {
        if (r.emoji.name === emojiName) return true;
        if (emojiId && r.emoji.id === emojiId) return true;
        return false;
    });

    if (!reaction) {
        return {
            ok: false,
            message: `❌ No se encontró la reacción ${emoji} en el mensaje`
        };
    }

    // 7. Leer usuarios (excluyendo bots)
    const allUsers = [];
    const seen = new Set();
    let lastId = null;

    try {
        while (true) {
            const options = { limit: 100 };
            if (lastId) options.after = lastId;

            const users = await reaction.users.fetch(options);
            if (users.size === 0) break;

            for (const [userId, user] of users) {
                if (user.bot) continue;
                if (seen.has(userId)) continue;
                seen.add(userId);
                allUsers.push(userId);
                lastId = userId;
            }

            if (users.size < 100) break;
        }
    } catch (err) {
        console.error('❌ Error leyendo usuarios de la reacción:', err.message);
    }

    console.log(`   📊 Usuarios humanos que reaccionaron: ${allUsers.length}`);

    // 8. Unificar con consentidos.json
    const currentList = loadJson('consentidos.json', []);
    const unified = [...new Set([...currentList, ...allUsers])];

    saveJson('consentidos.json', unified);

    console.log(`   ✅ Total en consentidos.json: ${unified.length}`);

    return {
        ok: true,
        message: `Sincronizado: **${allUsers.length}** usuarios con reacción, **${unified.length}** en total`,
        users: unified.length
    };
}

module.exports = { syncConsentimiento };