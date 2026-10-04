const { MessageFlags } = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // ============================================================
        // VERIFICAR GUILD — ignorar silenciosamente fuera del guild
        // ============================================================
        const expectedGuildId = process.env.GUILD_ID;

        // Ignorar DMs
        if (!interaction.guildId) {
            if (interaction.isRepliable()) {
                await interaction.reply({
                    content: '❌ Este bot solo funciona en su servidor.',
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});
            }
            return;
        }

        // Ignorar interacciones de otros guilds
        if (expectedGuildId && interaction.guildId !== expectedGuildId) {
            console.warn(`⚠️ Interacción ignorada (guild ${interaction.guildId}):`, interaction.type);
            return;
        }

        // ============================================================
        // COMANDOS DE BARRA
        // ============================================================
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error('❌ Error ejecutando comando:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Hubo un error ejecutando este comando.',
                        flags: MessageFlags.Ephemeral
                    }).catch(() => {});
                }
            }
            return;
        }
    }
};