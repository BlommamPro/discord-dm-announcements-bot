const {
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require('discord.js');

const MAX_TOTAL_IMAGES = 10;
const MAX_TEXT_LENGTH = 4000;      // Límite de Discord para TextDisplay
const MAX_TITLE_LENGTH = 256;      // Límite para títulos grandes
const MAX_FIELD_NAME = 256;
const MAX_FIELD_VALUE = 1024;

/**
 * Divide un texto largo en chunks de máximo `maxLength` caracteres.
 * Intenta cortar por párrafos o frases para no romper palabras.
 */
function splitText(text, maxLength = MAX_TEXT_LENGTH) {
    if (!text) return [];
    if (text.length <= maxLength) return [text];

    const chunks = [];
    let remaining = text;

    while (remaining.length > maxLength) {
        let cutAt = -1;

        // 1. Intentar cortar por doble salto de línea (párrafo)
        cutAt = remaining.lastIndexOf('\n\n', maxLength);

        // 2. Si no, por salto simple
        if (cutAt === -1 || cutAt < maxLength * 0.5) {
            cutAt = remaining.lastIndexOf('\n', maxLength);
        }

        // 3. Si no, por punto seguido de espacio
        if (cutAt === -1 || cutAt < maxLength * 0.5) {
            cutAt = remaining.lastIndexOf('. ', maxLength);
            if (cutAt !== -1) cutAt += 1;
        }

        // 4. Si no, por espacio
        if (cutAt === -1 || cutAt < maxLength * 0.5) {
            cutAt = remaining.lastIndexOf(' ', maxLength);
        }

        // 5. Cortar a lo bruto si no hay opción
        if (cutAt === -1) cutAt = maxLength;

        chunks.push(remaining.substring(0, cutAt).trim());
        remaining = remaining.substring(cutAt).trim();
    }

    if (remaining.length > 0) chunks.push(remaining);

    return chunks;
}

/**
 * Sanitiza el título (sin saltos de línea, sin espacios múltiples).
 */
function sanitizeTitle(content) {
    if (!content) return '';
    return content
        .replace(/[\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_TITLE_LENGTH);
}

/**
 * Sanitiza la URL (sin espacios ni caracteres raros).
 */
function sanitizeUrl(url) {
    if (!url) return '';
    return url
        .replace(/\s+/g, '')
        .replace(/[<>]/g, '')
        .trim();
}

/**
 * Sanitiza descripciones (mantiene saltos de línea).
 */
function sanitizeDescription(content) {
    if (!content) return '';
    return content
        .replace(/\r/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * Construye un Container V2 desde bloques.
 * Soporta: text, title, image, gallery, separator, field, button (link)
 */
function buildFromBlocks(blocks, colorHex, resolveImage, filesMap) {
    const container = new ContainerBuilder();

    // Color
    if (colorHex) {
        try {
            const hex = colorHex.startsWith('#') ? colorHex : `#${colorHex}`;
            container.setAccentColor(parseInt(hex.replace('#', ''), 16));
        } catch {
            container.setAccentColor(0x5865F2);
        }
    } else {
        container.setAccentColor(0x5865F2);
    }

    let componentsCount = 0;
    const MAX_COMPONENTS = 38;
    let buttonBuffer = [];
    let totalImagesAdded = 0;

    const flushButtons = () => {
        if (buttonBuffer.length === 0) return;
        for (let i = 0; i < buttonBuffer.length; i += 5) {
            const chunk = buttonBuffer.slice(i, i + 5);
            const row = new ActionRowBuilder();
            for (const b of chunk) {
                row.addComponents(
                    new ButtonBuilder()
                        .setLabel(b.label.substring(0, 80))
                        .setURL(b.url)
                        .setStyle(ButtonStyle.Link)
                );
            }
            container.addActionRowComponents(row);
            componentsCount++;
        }
        buttonBuffer = [];
    };

    for (const block of blocks) {
        if (componentsCount >= MAX_COMPONENTS) break;

        switch (block.type) {
            case 'text':
                if (block.content) {
                    flushButtons();
                    const cleanText = sanitizeDescription(block.content);
                    const chunks = splitText(cleanText, MAX_TEXT_LENGTH);
                    for (const chunk of chunks) {
                        if (componentsCount >= MAX_COMPONENTS) break;
                        container.addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(chunk)
                        );
                        componentsCount++;
                    }
                }
                break;

            case 'title':
                if (block.content) {
                    flushButtons();
                    const cleanContent = sanitizeTitle(block.content);
                    let titleText = `# ${cleanContent}`;

                    if (block.url) {
                        const cleanUrl = sanitizeUrl(block.url);
                        if (/^https?:\/\/.+/i.test(cleanUrl)) {
                            titleText = `# [${cleanContent}](${cleanUrl})`;
                        }
                    }

                    // El título también tiene límite de 4000
                    if (titleText.length > MAX_TEXT_LENGTH) {
                        const chunks = splitText(titleText, MAX_TEXT_LENGTH);
                        for (const chunk of chunks) {
                            if (componentsCount >= MAX_COMPONENTS) break;
                            container.addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(chunk)
                            );
                            componentsCount++;
                        }
                    } else {
                        container.addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(titleText)
                        );
                        componentsCount++;
                    }
                }
                break;

            case 'image':
                if (block.url && totalImagesAdded < MAX_TOTAL_IMAGES) {
                    flushButtons();
                    try {
                        const url = resolveImage ? resolveImage(block.url, filesMap) : block.url;
                        if (url) {
                            const gallery = new MediaGalleryBuilder();
                            gallery.addItems(new MediaGalleryItemBuilder().setURL(url));
                            container.addMediaGalleryComponents(gallery);
                            componentsCount++;
                            totalImagesAdded++;
                        }
                    } catch (err) {
                        console.warn('⚠️ Imagen inválida:', err.message);
                    }
                }
                break;

            case 'gallery':
                if (block.images && block.images.length > 0) {
                    flushButtons();
                    const remaining = MAX_TOTAL_IMAGES - totalImagesAdded;
                    if (remaining <= 0) break;

                    const urls = block.images
                        .slice(0, Math.min(remaining, 5))
                        .map(u => resolveImage ? resolveImage(u, filesMap) : u)
                        .filter(Boolean);

                    if (urls.length > 0) {
                        const gallery = new MediaGalleryBuilder();
                        for (const url of urls) {
                            gallery.addItems(new MediaGalleryItemBuilder().setURL(url));
                        }
                        container.addMediaGalleryComponents(gallery);
                        componentsCount++;
                        totalImagesAdded += urls.length;
                    }
                }
                break;

            case 'separator':
                flushButtons();
                container.addSeparatorComponents(
                    new SeparatorBuilder()
                        .setDivider(block.divider !== false)
                        .setSpacing(block.spacing === 'large'
                            ? SeparatorSpacingSize.Large
                            : SeparatorSpacingSize.Small)
                );
                componentsCount++;
                break;

            case 'field':
                if (block.name && block.value) {
                    flushButtons();
                    const fieldName = (block.name || '').slice(0, MAX_FIELD_NAME);
                    const fieldValue = (block.value || '').slice(0, MAX_FIELD_VALUE);

                    container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**${fieldName}**\n${fieldValue}`)
                    );
                    componentsCount++;
                }
                break;

            case 'button':
                if (block.label && block.url && /^https?:\/\//i.test(block.url)) {
                    buttonBuffer.push({
                        label: block.label,
                        url: sanitizeUrl(block.url)
                    });
                }
                break;
        }
    }

    flushButtons();

    if (componentsCount === 0) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent('\u200B')
        );
    }

    return container;
}

function getV2Flags() {
    return MessageFlags.IsComponentsV2;
}

module.exports = {
    buildFromBlocks,
    getV2Flags,
    splitText,
    sanitizeTitle,
    sanitizeUrl,
    sanitizeDescription
};