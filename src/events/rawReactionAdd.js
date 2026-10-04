const { loadJson, saveJson } = require('../utils/jsonHandler');

module.exports = {
    name: 'messageReactionAdd',
    async execute(reaction, user, client) {
        if (user.bot) return;

        // Ignorar reacciones en DMs
        if (!reaction.message.guildId) return;

        // Ignorar reacciones en otros guilds (silenciosamente)
        const expectedGuildId = process.env.GUILD_ID;
        if (expectedGuildId && reaction.message.guildId !== expectedGuildId) return;

        // Si la reacción es parcial, hacer fetch completo
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (err) {
                console.warn('⚠️ No se pudo obtener la reacción:', err.message);
                return;
            }
        }

        try {
            const config = loadJson('config.json', {});
            const emojiConsentimiento = config.emoji_consentimiento || '✅';

            if (reaction.emoji.name !== emojiConsentimiento) return;
            if (reaction.message.id !== config.mensaje_consentimiento_id) return;

            const consentidos = loadJson('consentidos.json', []);
            if (!consentidos.includes(user.id)) {
                consentidos.push(user.id);
                saveJson('consentidos.json', consentidos);
                console.log(`✅ Nuevo consentimiento: ${user.tag} (${user.id})`);
            }
        } catch (err) {
            console.error('❌ Error en messageReactionAdd:', err.message);
        }
    }
};