const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function createConfirmView() {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('confirmar_envio')
            .setLabel('✅ Enviar')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('cancelar_envio')
            .setLabel('❌ Cancelar')
            .setStyle(ButtonStyle.Danger)
    );

    return { row };
}

module.exports = { createConfirmView };