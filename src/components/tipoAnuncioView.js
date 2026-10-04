const {
    ContainerBuilder,
    TextDisplayBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

function buildTipoAnuncioV2() {
    const container = new ContainerBuilder()
        .setAccentColor(0x5865F2);

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# 📢 Crear Anuncio')
    );

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Elige el tipo de anuncio que deseas enviar:')
    );

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('tipo_solo_mensaje')
            .setLabel('📝 Solo Mensaje')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('tipo_solo_embed')
            .setLabel('🖼️ Solo Embed')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('tipo_mensaje_embed')
            .setLabel('📝🖼️ Mensaje + Embed')
            .setStyle(ButtonStyle.Primary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('tipo_mensaje_imagenes')
            .setLabel('📄🖼️ Mensaje con Imágenes')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('tipo_embed_multi')
            .setLabel('🖼️🖼️ Embed Múltiples')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('tipo_subir_imagenes')
            .setLabel('📁 Subir Imágenes')
            .setStyle(ButtonStyle.Success)
    );

    container.addActionRowComponents(row1, row2);

    return container;
}

module.exports = { buildTipoAnuncioV2 };