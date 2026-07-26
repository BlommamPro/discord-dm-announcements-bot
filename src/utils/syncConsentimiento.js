const { loadJson, saveJson } = require('./jsonHandler');

async function syncConsentimiento(client) {
    const config = loadJson('config.json', {});

    if (!config.canal_consentimiento_id || config.canal_consentimiento_id === '0') {
        console.log('No hay canal configurado.');
        return;
    }

    try {
        const canal = await client.channels.fetch(config.canal_consentimiento_id);
        const mensaje = await canal.messages.fetch(config.mensaje_consentimiento_id);

        console.log('Sincronizando reacciones...');

        let consentidos = [];
        const emoji = config.emoji_consentimiento;

        const reaction = mensaje.reactions.cache.find(r => r.emoji.toString() === emoji);

        if (reaction) {
            const users = await reaction.users.fetch();
            users.forEach(user => {
                if (!user.bot && !consentidos.includes(user.id)) {
                    consentidos.push(user.id);
                }
            });
        }

        saveJson('consentidos.json', consentidos);
        console.log(`Sincronización completada. ${consentidos.length} usuarios consentidos.`);
    } catch (error) {
        console.error('Error cargando mensaje:', error.message);
    }
}

module.exports = { syncConsentimiento };