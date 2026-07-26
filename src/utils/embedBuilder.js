const { EmbedBuilder } = require('discord.js');

const colorMap = {
    rojo: 0xFF0000, red: 0xFF0000,
    verde: 0x00FF00, green: 0x00FF00,
    azul: 0x0000FF, blue: 0x0000FF,
    amarillo: 0xFFFF00, yellow: 0xFFFF00,
    morado: 0x800080, purple: 0x800080,
    naranja: 0xFFA500, orange: 0xFFA500,
    rosa: 0xFFC0CB, pink: 0xFFC0CB,
    negro: 0x000000, black: 0x000000,
    blanco: 0xFFFFFF, white: 0xFFFFFF,
    gris: 0x808080, gray: 0x808080,
    cyan: 0x00FFFF, cian: 0x00FFFF,
    magenta: 0xFF00FF,
};

function parseColor(colorStr) {
    if (!colorStr) return null;
    const clean = colorStr.toLowerCase().trim();
    if (colorMap[clean]) return colorMap[clean];
    if (clean.startsWith('#')) {
        try {
            return parseInt(clean.slice(1), 16);
        } catch {
            return null;
        }
    }
    return null;
}

function validateUrl(url) {
    if (!url) return null;
    const trimmed = url.trim();
    return trimmed.startsWith('http') ? trimmed : null;
}

function parseImageUrls(text) {
    if (!text) return [];
    return text
        .split(/[\n,]+/)
        .map(url => url.trim())
        .filter(url => url.startsWith('http'));
}

function crearEmbed(data) {
    const color = parseColor(data.color);
    const urlTitulo = validateUrl(data.url_titulo);

    const embed = new EmbedBuilder()
        .setTitle(data.titulo || null)
        .setDescription(data.descripcion || null)
        .setColor(color || null)
        .setURL(urlTitulo)
        .setTimestamp();

    if (data.autor) {
        embed.setAuthor({
            name: data.autor,
            iconURL: validateUrl(data.autor_icon)
        });
    }

    if (data.imagen) {
        const imgUrl = validateUrl(data.imagen);
        if (imgUrl) embed.setImage(imgUrl);
    }

    if (data.thumbnail) {
        const thumbUrl = validateUrl(data.thumbnail);
        if (thumbUrl) embed.setThumbnail(thumbUrl);
    }

    if (data.footer) {
        embed.setFooter({
            text: data.footer,
            iconURL: validateUrl(data.footer_icon)
        });
    }

    const fields = data.fields || [];
    for (const field of fields) {
        if (field.name && field.value) {
            embed.addFields({
                name: field.name,
                value: field.value,
                inline: field.inline ?? true
            });
        }
    }

    return embed;
}

module.exports = { crearEmbed, parseColor, validateUrl, parseImageUrls };