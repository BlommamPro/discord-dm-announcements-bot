const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

function createEmbedModal1() {
    const modal = new ModalBuilder()
        .setCustomId('modal_embed_parte1')
        .setTitle('🎨 Embed - Contenido Principal');

    const titulo = new TextInputBuilder()
        .setCustomId('titulo')
        .setLabel('Título')
        .setPlaceholder('Título del embed')
        .setRequired(false)
        .setMaxLength(256)
        .setStyle(TextInputStyle.Short);

    const descripcion = new TextInputBuilder()
        .setCustomId('descripcion')
        .setLabel('Descripción')
        .setPlaceholder('Contenido principal del embed')
        .setRequired(false)
        .setMaxLength(4000)
        .setStyle(TextInputStyle.Paragraph);

    const urlTitulo = new TextInputBuilder()
        .setCustomId('url_titulo')
        .setLabel('URL del Título (opcional)')
        .setPlaceholder('https://ejemplo.com - hace el título clickeable')
        .setRequired(false)
        .setMaxLength(200)
        .setStyle(TextInputStyle.Short);

    const color = new TextInputBuilder()
        .setCustomId('color')
        .setLabel('Color (opcional)')
        .setPlaceholder('#00FF00 o verde, azul, rojo, amarillo, morado, etc.')
        .setRequired(false)
        .setMaxLength(20)
        .setStyle(TextInputStyle.Short);

    const autor = new TextInputBuilder()
        .setCustomId('autor')
        .setLabel('Autor (opcional)')
        .setPlaceholder('Nombre que aparece en la parte superior')
        .setRequired(false)
        .setMaxLength(256)
        .setStyle(TextInputStyle.Short);

    modal.addComponents(
        new ActionRowBuilder().addComponents(titulo),
        new ActionRowBuilder().addComponents(descripcion),
        new ActionRowBuilder().addComponents(urlTitulo),
        new ActionRowBuilder().addComponents(color),
        new ActionRowBuilder().addComponents(autor)
    );

    return modal;
}

module.exports = { createEmbedModal1 };