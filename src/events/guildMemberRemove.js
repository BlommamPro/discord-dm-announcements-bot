const { loadJson, saveJson } = require('../utils/jsonHandler');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member, client) {
        // Verificar guild
        const expectedGuildId = process.env.GUILD_ID;
        if (!expectedGuildId || member.guild.id !== expectedGuildId) return;

        // Ignorar bots
        if (member.user?.bot) return;

        try {
            const consentidos = loadJson('consentidos.json', []);

            if (consentidos.includes(member.id)) {
                const cleaned = consentidos.filter(id => id !== member.id);
                saveJson('consentidos.json', cleaned);
                console.log(`🚪 Eliminado de consentidos (salió del server): ${member.user?.tag || member.id} (${member.id})`);
            }
        } catch (err) {
            console.error('❌ Error en guildMemberRemove:', err.message);
        }
    }
};