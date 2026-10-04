const { loadJson, saveJson } = require('../utils/jsonHandler');

module.exports = {
    name: 'messageReactionRemove',
    async execute(reaction, user, client) {
        if (user.bot) return;

        if (!reaction.message.guildId) return;

        const expectedGuildId = process.env.GUILD_ID;
        if (expectedGuildId && reaction.message.guildId !== expectedGuildId) return;

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

            let consentidos = loadJson('consentidos.json', []);
            if (consentidos.includes(user.id)) {
                consentidos = consentidos.filter(id => id !== user.id);
                saveJson('consentidos.json', consentidos);
                console.log(`❌ Consentimiento revocado: ${user.tag} (${user.id})`);
            }
        } catch (err) {
            console.error('❌ Error en messageReactionRemove:', err.message);
        }
    }
};