const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

function createEmbedModal3() {
    const modal = new ModalBuilder()
        .setCustomId('modal_embed_parte3')
        .setTitle('📋 Embed - Campos Adicionales');

    const campo1Nombre = new TextInputBuilder()
        .setCustomId('campo1_nombre')
        .setLabel('Campo 1 - Nombre')
        .setPlaceholder('Ej: Precio, Fecha, Ubicación')
        .setRequired(false)
        .setMaxLength(256)
        .setStyle(TextInputStyle.Short);

    const campo1Valor = new TextInputBuilder()
        .setCustomId('campo1_valor')
        .setLabel('Campo 1 - Valor')
        .setPlaceholder('Contenido del campo 1')
        .setRequired(false)
        .setMaxLength(1024)
        .setStyle(TextInputStyle.Short);

    const campo2Nombre = new TextInputBuilder()
        .setCustomId('campo2_nombre')
        .setLabel('Campo 2 - Nombre')
        .setPlaceholder('Ej: Horario, Precio')
        .setRequired(false)
        .setMaxLength(256)
        .setStyle(TextInputStyle.Short);

    const campo2Valor = new TextInputBuilder()
        .setCustomId('campo2_valor')
        .setLabel('Campo 2 - Valor')
        .setPlaceholder('Contenido del campo 2')
        .setRequired(false)
        .setMaxLength(1024)
        .setStyle(TextInputStyle.Short);

    const campo3Nombre = new TextInputBuilder()
        .setCustomId('campo3_nombre')
        .setLabel('Campo 3 - Nombre')
        .setPlaceholder('Campo adicional')
        .setRequired(false)
        .setMaxLength(256)
        .setStyle(TextInputStyle.Short);

    modal.addComponents(
        new ActionRowBuilder().addComponents(campo1Nombre),
        new ActionRowBuilder().addComponents(campo1Valor),
        new ActionRowBuilder().addComponents(campo2Nombre),
        new ActionRowBuilder().addComponents(campo2Valor),
        new ActionRowBuilder().addComponents(campo3Nombre)
    );

    return modal;
}

module.exports = { createEmbedModal3 };