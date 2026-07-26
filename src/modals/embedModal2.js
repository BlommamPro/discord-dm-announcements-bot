const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

function createEmbedModal2() {
    const modal = new ModalBuilder()
        .setCustomId('modal_embed_parte2')
        .setTitle('🖼️ Embed - Imágenes y Extras');

    const imagen = new TextInputBuilder()
        .setCustomId('imagen')
        .setLabel('URL Imagen Grande (principal)')
        .setPlaceholder('https://ejemplo.com/imagen.png')
        .setRequired(false)
        .setMaxLength(500)
        .setStyle(TextInputStyle.Short);

    const imagenesExtra = new TextInputBuilder()
        .setCustomId('imagenes_extra')
        .setLabel('URLs Imágenes adicionales (opcional)')
        .setPlaceholder('https://img1.png\nhttps://img2.png\nhttps://img3.png (una por línea)')
        .setRequired(false)
        .setMaxLength(2000)
        .setStyle(TextInputStyle.Paragraph);

    const thumbnail = new TextInputBuilder()
        .setCustomId('thumbnail')
        .setLabel('URL Miniatura (esquina sup. derecha)')
        .setPlaceholder('https://ejemplo.com/thumb.png')
        .setRequired(false)
        .setMaxLength(500)
        .setStyle(TextInputStyle.Short);

    const footer = new TextInputBuilder()
        .setCustomId('footer')
        .setLabel('Footer')
        .setPlaceholder('Texto al pie del embed')
        .setRequired(false)
        .setMaxLength(2048)
        .setStyle(TextInputStyle.Short);

    const footerIcon = new TextInputBuilder()
        .setCustomId('footer_icon')
        .setLabel('URL Icono del Footer')
        .setPlaceholder('https://ejemplo.com/icon.png')
        .setRequired(false)
        .setMaxLength(500)
        .setStyle(TextInputStyle.Short);

    modal.addComponents(
        new ActionRowBuilder().addComponents(imagen),
        new ActionRowBuilder().addComponents(imagenesExtra),
        new ActionRowBuilder().addComponents(thumbnail),
        new ActionRowBuilder().addComponents(footer),
        new ActionRowBuilder().addComponents(footerIcon)
    );

    return modal;
}

module.exports = { createEmbedModal2 };