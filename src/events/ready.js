module.exports = {
    name: 'clientReady',
    once: true,
    async execute(client) {
        const expectedGuildId = process.env.GUILD_ID;

        if (!expectedGuildId) {
            console.error('❌ Falta la variable GUILD_ID en .env');
            return;
        }

        console.log(`🔒 Bot configurado para el guild: ${expectedGuildId}`);
        console.log(`📊 Guilds actuales: ${client.guilds.cache.size}`);

        // Solo advertir si hay guilds extra, pero NO salir
        for (const [guildId, guild] of client.guilds.cache) {
            if (guildId !== expectedGuildId) {
                console.warn(`⚠️ Bot presente en guild NO autorizado: ${guild.name} (${guildId})`);
                console.warn(`   → Los comandos y eventos serán ignorados en ese guild.`);
            }
        }

        console.log(`✅ Bot conectado como ${client.user.tag}`);
    }
};