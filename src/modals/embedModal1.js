const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    LabelBuilder
} = require('discord.js');

function buildEmbedModalV2(customId = 'modal_embed_v2') {
    const modal = new ModalBuilder()
        .setCustomId(customId)
        .setTitle('🎨 Configurar Embed');

    const titleInput = new TextInputBuilder()
        .setCustomId('embed_title')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Título del embed')
        .setRequired(false)
        .setMaxLength(256);

    const titleLabel = new LabelBuilder()
        .setLabel('Título')
        .setDescription('El título principal del embed')
        .setTextInputComponent(titleInput);

    const descInput = new TextInputBuilder()
        .setCustomId('embed_description')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Descripción del embed...')
        .setRequired(false)
        .setMaxLength(4000);

    const descLabel = new LabelBuilder()
        .setLabel('Descripción')
        .setDescription('Soporta Markdown de Discord')
        .setTextInputComponent(descInput);

    const colorInput = new TextInputBuilder()
        .setCustomId('embed_color')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('#5865F2')
        .setRequired(false)
        .setMaxLength(7);

    const colorLabel = new LabelBuilder()
        .setLabel('Color')
        .setDescription('Código hex (ej: #5865F2)')
        .setTextInputComponent(colorInput);

    const imageInput = new TextInputBuilder()
        .setCustomId('embed_image')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://...')
        .setRequired(false);

    const imageLabel = new LabelBuilder()
        .setLabel('Imagen Principal')
        .setDescription('URL de la imagen principal')
        .setTextInputComponent(imageInput);

    const footerInput = new TextInputBuilder()
        .setCustomId('embed_footer')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Texto del pie')
        .setRequired(false)
        .setMaxLength(2048);

    const footerLabel = new LabelBuilder()
        .setLabel('Footer')
        .setDescription('Texto pequeño al pie del embed')
        .setTextInputComponent(footerInput);

    modal.addLabelComponents(
        titleLabel,
        descLabel,
        colorLabel,
        imageLabel,
        footerLabel
    );

    return modal;
}

module.exports = { buildEmbedModalV2 };