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
        // 1. Validar guild
        const validacion = validarGuild(interaction);
        if (!validacion.valido) {
            return await interaction.reply({
                content: validacion.mensaje,
                flags: [MessageFlags.Ephemeral],
            });
        }

        // 2. Solo el owner del server
        if (interaction.user.id !== interaction.guild.ownerId) {
            return await interaction.reply({
                content: "❌ Solo el dueño puede ejecutar esto.",
                flags: [MessageFlags.Ephemeral],
            });
        }

        // 3. Recoger parámetros
        const adminRole = interaction.options.getRole("admin_role");
        const canal = interaction.options.getChannel("canal_consentimiento");
        const mensajeId = interaction.options.getString("mensaje_id");
        const emoji = interaction.options.getString("emoji");

        // 4. Guardar en config.json
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

        // 5. Defer
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // 6. Sincronizar
        let syncResult = { ok: false, message: 'Sincronización omitida' };
        try {
            syncResult = await syncConsentimiento(client);
        } catch (err) {
            console.error('❌ Error en syncConsentimiento:', err);
            syncResult = { ok: false, message: `❌ Error: ${err.message}` };
        }

        // 7. Responder con detalles
        let respuesta = `✅ **Configuración guardada**\n\n`;
        respuesta += `• **Rol admin:** <@&${adminRole.id}>\n`;
        respuesta += `• **Canal:** <#${canal.id}>\n`;
        respuesta += `• **Mensaje:** \`${mensajeId}\`\n`;
        respuesta += `• **Emoji:** ${emoji}\n\n`;

        if (syncResult.ok) {
            respuesta += `**🔄 Sincronización:**\n`;
            respuesta += `• ${syncResult.message}\n`;
        } else {
            respuesta += `**⚠️ Sincronización fallida:**\n`;
            respuesta += `• ${syncResult.message}\n\n`;
            respuesta += `💡 Revisa que el ID del mensaje sea correcto y esté en ese canal.`;
        }

        await interaction.editReply({ content: respuesta });
    },
};