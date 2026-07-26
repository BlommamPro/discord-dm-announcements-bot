const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function createContinueView(step) {
    const labels = {
        imagenes: { primary: '🖼️ Agregar Imágenes', success: '✅ Terminar Así' },
        campos: { primary: '📋 Agregar Campos', success: '✅ Terminar Así' }
    };

    const config = labels[step] || labels.imagenes;

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`continuar_${step}`)
            .setLabel(config.primary)
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`terminar_${step}`)
            .setLabel(config.success)
            .setStyle(ButtonStyle.Success)
    );

    return row;
}

module.exports = { createContinueView };