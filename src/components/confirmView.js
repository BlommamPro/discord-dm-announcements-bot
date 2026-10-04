const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

function createConfirmView() {
    const container = new ContainerBuilder().setAccentColor(0x57F287);

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# ✅ Confirmar Anuncio')
    );

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('¿Deseas enviar este anuncio a todos los usuarios consentidos?')
    );

    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('confirmar_envio')
            .setLabel('✅ Confirmar y Enviar')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('cancelar_envio')
            .setLabel('❌ Cancelar')
            .setStyle(ButtonStyle.Danger)
    );

    container.addActionRowComponents(row);

    return { container, row }; // devolvemos ambos por compatibilidad
}

module.exports = { createConfirmView };