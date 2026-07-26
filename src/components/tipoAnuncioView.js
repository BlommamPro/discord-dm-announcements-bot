const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function createTipoAnuncioView() {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('tipo_solo_mensaje')
            .setLabel('📝 Solo Mensaje')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('tipo_solo_embed')
            .setLabel('🎨 Solo Embed')
            .setStyle(ButtonStyle.Primary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('tipo_mensaje_embed')
            .setLabel('📝🎨 Mensaje + Embed')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('tipo_mensaje_imagenes')
            .setLabel('📝🖼️ Mensaje con Imágenes')
            .setStyle(ButtonStyle.Secondary)
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('tipo_embed_imagenes')
            .setLabel('🎨🖼️ Embed con Múltiples Imágenes')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('tipo_subir_imagenes')
            .setLabel('📎 Subir Imágenes Locales')
            .setStyle(ButtonStyle.Success)
    );

    return [row1, row2, row3];
}

module.exports = { createTipoAnuncioView };