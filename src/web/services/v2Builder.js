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

const MAX_TOTAL_IMAGES = 10; // Límite duro de Discord

/**
 * Construye un Container V2 desde bloques.
 * Soporta: text, title, image, gallery, separator, field, button (link)
 * Respeta el límite global de 10 imágenes.
 */
function buildFromBlocks(blocks, colorHex, resolveImage, filesMap) {
    const container = new ContainerBuilder();

    // Color del borde
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
                    container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(block.content)
                    );
                    componentsCount++;
                }
                break;

            case 'title':
                if (block.content) {
                    flushButtons();
                    let titleText = `# ${block.content}`;
                    if (block.url) titleText = `# [${block.content}](${block.url})`;
                    container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(titleText)
                    );
                    componentsCount++;
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
                    container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**${block.name}**\n${block.value}`)
                    );
                    componentsCount++;
                }
                break;

            case 'button':
                if (block.label && block.url && /^https?:\/\//i.test(block.url)) {
                    buttonBuffer.push({ label: block.label, url: block.url });
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
    MAX_TOTAL_IMAGES
};