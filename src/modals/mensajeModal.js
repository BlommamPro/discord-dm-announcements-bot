const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    LabelBuilder
} = require('discord.js');

function createMensajeModal(conImagenes = false) {
    const modal = new ModalBuilder()
        .setCustomId(conImagenes ? 'modal_mensaje_imagenes' : 'modal_mensaje')
        .setTitle('📝 Escribir Mensaje');

    const mensajeInput = new TextInputBuilder()
        .setCustomId('mensaje_input')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Escribe el mensaje...')
        .setRequired(true)
        .setMaxLength(2000);

    const mensajeLabel = new LabelBuilder()
        .setLabel('Mensaje')
        .setDescription('Texto que se enviará a los usuarios')
        .setTextInputComponent(mensajeInput);

    modal.addLabelComponents(mensajeLabel);

    if (conImagenes) {
        const imagenesInput = new TextInputBuilder()
            .setCustomId('imagenes_input')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Una URL por línea:\nhttps://ejemplo.com/img1.png\nhttps://ejemplo.com/img2.jpg')
            .setRequired(false)
            .setMaxLength(2000);

        const imagenesLabel = new LabelBuilder()
            .setLabel('URLs de imágenes (opcional)')
            .setDescription('Una URL por línea')
            .setTextInputComponent(imagenesInput);

        modal.addLabelComponents(imagenesLabel);
    }

    return modal;
}

module.exports = { createMensajeModal };