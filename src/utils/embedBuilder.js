const {
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder
} = require('discord.js');

/**
 * Convierte embedData a un Container V2.
 * Soporta: title, description, color, image, thumbnail, author, footer, fields, timestamp
 */
function crearEmbed(data) {
    const container = new ContainerBuilder();

    // Color
    if (data.color) {
        try {
            const hex = data.color.startsWith('#') ? data.color : `#${data.color}`;
            container.setAccentColor(parseInt(hex.replace('#', ''), 16));
        } catch {
            container.setAccentColor(0x5865F2);
        }
    } else {
        container.setAccentColor(0x5865F2);
    }

    // Autor
    if (data.autor) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**${data.autor}**`)
        );
    }

    // Título
    if (data.titulo || data.title) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# ${data.titulo || data.title}`)
        );
    }

    // Descripción
    if (data.descripcion || data.description) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(data.descripcion || data.description)
        );
    }

    // Thumbnail como Section con accesorio
    if (data.thumbnail) {
        const section = new SectionBuilder();
        section.addTextDisplayComponents(
            new TextDisplayBuilder().setContent('\u200B')
        );
        section.setThumbnailAccessory(
            new ThumbnailBuilder().setURL(data.thumbnail)
        );
        container.addSectionComponents(section);
    }

    // Imagen principal (galería)
    if (data.imagen || data.image) {
        const gallery = new MediaGalleryBuilder();
        gallery.addItems(
            new MediaGalleryItemBuilder().setURL(data.imagen || data.image)
        );
        container.addMediaGalleryComponents(gallery);
    }

    // Fields
    if (data.fields && data.fields.length > 0) {
        container.addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        );
        for (const field of data.fields) {
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**${field.name}**\n${field.value}`)
            );
        }
    }

    // Footer
    if (data.footer) {
        container.addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        );
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# ${data.footer}`)
        );
    }

    return container;
}

/**
 * Parsea URLs de imágenes de un texto (una por línea).
 */
function parseImageUrls(texto) {
    if (!texto) return [];
    return texto
        .split('\n')
        .map(l => l.trim())
        .filter(l => /^https?:\/\//i.test(l));
}

module.exports = { crearEmbed, parseImageUrls };