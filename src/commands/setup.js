const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
} = require("discord.js");
const { loadJson, saveJson } = require("../utils/jsonHandler");
const { syncConsentimiento } = require("../utils/syncConsentimiento");
const { validarGuild } = require("../utils/validarGuild");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setup")
        .setDescription("Configurar roles y consentimiento")
        .addRoleOption((opt) =>
            opt
                .setName("admin_role")
                .setDescription("Rol administrador")
                .setRequired(true),
        )
        .addChannelOption((opt) =>
            opt
                .setName("canal_consentimiento")
                .setDescription("Canal donde está el mensaje")
                .setRequired(true),
        )
        .addStringOption((opt) =>
            opt
                .setName("mensaje_id")
                .setDescription("ID del mensaje de consentimiento")
                .setRequired(true),
        )
        .addStringOption((opt) =>
            opt
                .setName("emoji")
                .setDescription("Emoji de la reacción")
                .setRequired(true),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        const validacion = validarGuild(interaction);
        if (!validacion.valido) {
            return await interaction.reply({
                content: validacion.mensaje,
                flags: [MessageFlags.Ephemeral],
            });
        }

        if (interaction.user.id !== interaction.guild.ownerId) {
            return await interaction.reply({
                content: "❌ Solo el dueño puede ejecutar esto.",
                flags: [MessageFlags.Ephemeral],
            });
        }

        const adminRole = interaction.options.getRole("admin_role");
        const canal = interaction.options.getChannel("canal_consentimiento");
        const mensajeId = interaction.options.getString("mensaje_id");
        const emoji = interaction.options.getString("emoji");

        const config = loadJson("config.json", {
            admin_role_id: "0",
            canal_consentimiento_id: "0",
            mensaje_consentimiento_id: "0",
            emoji_consentimiento: "✅",
        });

        config.admin_role_id = adminRole.id;
        config.canal_consentimiento_id = canal.id;
        config.mensaje_consentimiento_id = mensajeId;
        config.emoji_consentimiento = emoji;

        saveJson("config.json", config);

        await interaction.reply({
            content: "✅ Configurado exitosamente.",
            flags: [MessageFlags.Ephemeral],
        });

        await syncConsentimiento(client);
    },
};
