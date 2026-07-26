const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

function createMensajeModal(withImages = false) {
    const modal = new ModalBuilder()
        .setCustomId(withImages ? 'modal_mensaje_imagenes' : 'modal_mensaje')
        .setTitle(withImages ? '📝🖼️ Crear Mensaje con Imágenes' : '📝 Crear Mensaje');

    const mensajeInput = new TextInputBuilder()
        .setCustomId('mensaje_input')
        .setLabel('Mensaje')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Escribe el mensaje que se enviará...')
        .setRequired(true)
        .setMaxLength(2000);

    modal.addComponents(new ActionRowBuilder().addComponents(mensajeInput));

    if (withImages) {
        const imagenesInput = new TextInputBuilder()
            .setCustomId('imagenes_input')
            .setLabel('URLs de imágenes (una por línea)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('https://ejemplo.com/img1.png\nhttps://ejemplo.com/img2.png\nhttps://ejemplo.com/img3.gif')
            .setRequired(false)
            .setMaxLength(2000);

        modal.addComponents(new ActionRowBuilder().addComponents(imagenesInput));
    }

    return modal;
}

module.exports = { createMensajeModal };