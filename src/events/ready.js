const { syncConsentimiento } = require('../utils/syncConsentimiento');

module.exports = {
    name: 'clientReady',
    once: true,
    async execute(client) {
        console.log(`Bot iniciado como: ${client.user.tag}`);

        try {
            const synced = await client.application.commands.set(
                Array.from(client.commands.values()).map(cmd => cmd.data.toJSON())
            );
            console.log(`Comandos sincronizados: ${synced.size}`);
        } catch (error) {
            console.error('Error sincronizando comandos:', error.message);
        }

        await syncConsentimiento(client);
    }
};