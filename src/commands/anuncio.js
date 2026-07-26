const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
} = require("discord.js");
const { loadJson } = require("../utils/jsonHandler");
const { createTipoAnuncioView } = require("../components/tipoAnuncioView");
const { validarGuild } = require("../utils/validarGuild");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("anuncio")
        .setDescription(
            "Enviar anuncio por MD a los usuarios que dieron consentimiento.",
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const validacion = validarGuild(interaction);
        if (!validacion.valido) {
            return await interaction.reply({
                content: validacion.mensaje,
                flags: [MessageFlags.Ephemeral],
            });
        }

        const config = loadJson("config.json", {});
        const rolAdmin = interaction.guild.roles.cache.get(config.admin_role_id);
        const tieneRol =
            rolAdmin && interaction.member.roles.cache.has(rolAdmin.id);
        const esOwner = interaction.user.id === interaction.guild.ownerId;

        if (!tieneRol && !esOwner) {
            return await interaction.reply({
                content: "❌ No tienes permiso para usar este comando.",
                flags: [MessageFlags.Ephemeral],
            });
        }

        const rows = createTipoAnuncioView();

        await interaction.reply({
            content:
                "📢 **Crear Anuncio**\n\nElige el tipo de anuncio que deseas enviar:",
            components: rows,
            flags: [MessageFlags.Ephemeral],
        });
    },
};
