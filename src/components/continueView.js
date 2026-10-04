const {
    ContainerBuilder,
    TextDisplayBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

function createContinueView(tipo) {
    const container = new ContainerBuilder().setAccentColor(0x5865F2);

    let titulo = '¿Continuar?';
    if (tipo === 'imagenes') titulo = '🖼️ ¿Agregar imágenes?';
    if (tipo === 'campos') titulo = '📋 ¿Agregar campos adicionales?';

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${titulo}`)
    );

    const row = new ActionRowBuilder();
    if (tipo === 'imagenes') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('continuar_imagenes')
                .setLabel('➕ Sí, agregar imágenes')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('terminar_imagenes')
                .setLabel('⏭️ No, continuar')
                .setStyle(ButtonStyle.Secondary)
        );
    } else if (tipo === 'campos') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('continuar_campos')
                .setLabel('➕ Sí, agregar campos')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('terminar_campos')
                .setLabel('⏭️ No, finalizar')
                .setStyle(ButtonStyle.Secondary)
        );
    }

    container.addActionRowComponents(row);

    return container; // ahora devuelve un Container, no un array
}

module.exports = { createContinueView };