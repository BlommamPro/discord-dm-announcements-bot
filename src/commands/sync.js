const {
    SlashCommandBuilder,
    MessageFlags,
} = require("discord.js");
const { loadJson } = require("../utils/jsonHandler");
const { syncConsentimiento } = require("../utils/syncConsentimiento");
const { validarGuild } = require("../utils/validarGuild");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sync")
        .setDescription("Sincroniza los usuarios que reaccionaron con el emoji de consentimiento")
        .setDefaultMemberPermissions(0)
        .setDMPermission(false),

    async execute(interaction, client) {
        // 1. Validar guild
        const validacion = validarGuild(interaction);
        if (!validacion.valido) {
            return await interaction.reply({
                content: validacion.mensaje,
                flags: [MessageFlags.Ephemeral],
            });
        }

        // 2. Verificar permisos (rol config + owner)
        const config = loadJson('config.json', {});
        const adminRoleId = config.admin_role_id;
        const hasAdminRole = adminRoleId && interaction.member.roles.cache.has(adminRoleId);
        const isServerOwner = interaction.guild && interaction.guild.ownerId === interaction.member.id;

        if (!hasAdminRole && !isServerOwner) {
            return await interaction.reply({
                content: '❌ No tienes permiso para usar este comando.',
                flags: MessageFlags.Ephemeral
            });
        }

        // 3. Defer y sincronizar
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const result = await syncConsentimiento(client);

            if (result.ok) {
                await interaction.editReply({
                    content: `✅ **Sincronización completada**\n\n${result.message}`
                });
            } else {
                await interaction.editReply({
                    content: `❌ **Error:**\n${result.message}`
                });
            }
        } catch (err) {
            console.error('❌ Error en /sync:', err);
            await interaction.editReply({
                content: `❌ Error: ${err.message}`
            });
        }
    }
};