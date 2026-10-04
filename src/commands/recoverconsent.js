const {
    SlashCommandBuilder,
    MessageFlags
} = require('discord.js');
const { loadJson, saveJson } = require('../utils/jsonHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recoverconsent')
        .setDescription('Recupera la lista de usuarios consentidos desde las reacciones del mensaje')
        .setDefaultMemberPermissions(0)
        .setDMPermission(false),

    async execute(interaction, client) {
        // ============================================================
        // 1. VERIFICAR GUILD
        // ============================================================
        const expectedGuildId = process.env.GUILD_ID;
        if (!expectedGuildId || interaction.guildId !== expectedGuildId) {
            await interaction.reply({
                content: '❌ Este bot solo funciona en su servidor configurado.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        // ============================================================
        // 2. VERIFICAR PERMISOS
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
        // 3. DEFER (por si tarda con muchos usuarios)
        // ============================================================
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const channelId = config.canal_consentimiento_id;
            const messageId = config.mensaje_consentimiento_id;
            const emoji = config.emoji_consentimiento || '✅';

            if (!channelId || !messageId) {
                return interaction.editReply({
                    content: '❌ Falta `canal_consentimiento_id` o `mensaje_consentimiento_id` en `config.json`'
                });
            }

            // ============================================================
            // 4. OBTENER CANAL Y MENSAJE
            // ============================================================
            const channel = await client.channels.fetch(channelId).catch(() => null);
            if (!channel) {
                return interaction.editReply({
                    content: `❌ No se encontró el canal con ID \`${channelId}\``
                });
            }

            const message = await channel.messages.fetch(messageId).catch(() => null);
            if (!message) {
                return interaction.editReply({
                    content: `❌ No se encontró el mensaje con ID \`${messageId}\` en ese canal`
                });
            }

            // ============================================================
            // 5. BUSCAR LA REACCIÓN
            // ============================================================
            const reaction = message.reactions.cache.find(r => r.emoji.name === emoji);
            if (!reaction) {
                return interaction.editReply({
                    content: `❌ No hay reacciones con el emoji ${emoji} en el mensaje`
                });
            }

            console.log(`📊 Reacción encontrada: ${reaction.count} reacciones (incluyendo bots)`);

            // ============================================================
            // 6. PAGINAR TODOS LOS USUARIOS QUE REACCIONARON
            // ============================================================
            const allUsers = [];
            const seen = new Set();
            let lastId = null;

            while (true) {
                const options = { limit: 100 };
                if (lastId) options.after = lastId;

                const users = await reaction.users.fetch(options);
                if (users.size === 0) break;

                for (const [userId, user] of users) {
                    if (user.bot) continue;
                    if (seen.has(userId)) continue;
                    seen.add(userId);
                    allUsers.push(userId);
                    lastId = userId;
                }

                if (users.size < 100) break;
            }

            console.log(`✅ Recuperados ${allUsers.length} usuarios consentidos`);

            // ============================================================
            // 7. UNIFICAR CON LA LISTA ACTUAL
            // ============================================================
            const currentList = loadJson('consentidos.json', []);
            const unified = [...new Set([...currentList, ...allUsers])];

            // ============================================================
            // 8. GUARDAR
            // ============================================================
            saveJson('consentidos.json', unified);

            await interaction.editReply({
                content:
                    `✅ **Recuperación completa**\n\n` +
                    `• Usuarios ya en la lista: **${currentList.length}**\n` +
                    `• Usuarios recuperados de reacciones: **${allUsers.length}**\n` +
                    `• Total único (sin duplicados): **${unified.length}**\n\n` +
                    `El archivo \`consentidos.json\` ha sido actualizado.`
            });

        } catch (err) {
            console.error('❌ Error en /recoverconsent:', err);
            await interaction.editReply({
                content: `❌ Error: ${err.message}`
            });
        }
    }
};