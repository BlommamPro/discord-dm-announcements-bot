const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require('discord.js');
const { loadJson } = require('../utils/jsonHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anuncio')
        .setDescription('Abre la dashboard para crear un anuncio')
        .setDefaultMemberPermissions(0) // Solo visible para admins del server
        .setDMPermission(false),

    async execute(interaction, client) {
        // ============================================================
        // 1. VERIFICAR GUILD (evitar uso en otros servidores)
        // ============================================================
        const expectedGuildId = process.env.GUILD_ID;
        const currentGuildId = interaction.guildId;

        if (!expectedGuildId || currentGuildId !== expectedGuildId) {
            await interaction.reply({
                content: '❌ Este bot solo funciona en su servidor configurado.',
                flags: MessageFlags.Ephemeral
            });
            console.warn(`⚠️ Intento de /anuncio fuera del guild autorizado: ${currentGuildId} (esperado: ${expectedGuildId})`);
            return;
        }

        // ============================================================
        // 2. VERIFICAR QUE ES UN MIEMBRO DEL SERVIDOR (no DM)
        // ============================================================
        if (!interaction.member) {
            await interaction.reply({
                content: '❌ Este comando no funciona por DM.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        // ============================================================
        // 3. VERIFICAR PERMISOS (rol admin / owner / administrator)
        // ============================================================
        const config = loadJson('config.json', {});
        const adminRoleId = config.admin_role_id;

        const hasAdminRole = adminRoleId && interaction.member.roles.cache.has(adminRoleId);
        const isServerOwner = interaction.guild && interaction.guild.ownerId === interaction.member.id;
        const isAdministrator = interaction.member.permissions.has('Administrator');

        if (!hasAdminRole && !isServerOwner && !isAdministrator) {
            await interaction.reply({
                content: '❌ No tienes permiso para usar este comando.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        // ============================================================
        // 4. CONSTRUIR EL CONTENEDOR CON EL ENLACE A LA DASHBOARD
        // ============================================================
        const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';

        const container = new ContainerBuilder()
            .setAccentColor(0x5865F2)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('# 📨 Dashboard de Anuncios')
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    'Desde la dashboard web puedes:\n' +
                    '• Construir anuncios con bloques (texto, títulos, imágenes, botones...)\n' +
                    '• Subir imágenes locales\n' +
                    '• Ver una vista previa antes de enviar\n' +
                    '• Consultar el historial de envíos\n\n' +
                    '**Pulsa el botón para abrirla:**'
                )
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('🌐 Abrir Dashboard')
                .setURL(dashboardUrl)
                .setStyle(ButtonStyle.Link)
        );

        container.addActionRowComponents(row);

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    }
};