const { loadJson, saveJson } = require('../utils/jsonHandler');

module.exports = {
    name: 'messageReactionRemove',
    async execute(reaction, user) {
        if (user.bot) return;

        const config = loadJson('config.json', {});
        if (reaction.message.id !== config.mensaje_consentimiento_id) return;
        if (reaction.emoji.toString() !== config.emoji_consentimiento) return;

        let consentidos = loadJson('consentidos.json', []);

        if (consentidos.includes(user.id)) {
            consentidos = consentidos.filter(id => id !== user.id);
            saveJson('consentidos.json', consentidos);
            console.log(`Usuario ${user.tag} eliminado de consentidos.`);
        }
    }
};