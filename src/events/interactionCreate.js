const { loadJson, saveJson } = require('../utils/jsonHandler');
const { crearEmbed, parseImageUrls } = require('../utils/embedBuilder');
const { progressBar } = require('../utils/progressBar');
const { createMensajeModal } = require('../modals/mensajeModal');
const { createEmbedModal1 } = require('../modals/embedModal1');
const { createEmbedModal2 } = require('../modals/embedModal2');
const { createEmbedModal3 } = require('../modals/embedModal3');
const { createConfirmView } = require('../components/confirmView');
const { createContinueView } = require('../components/continueView');
const {
    MessageFlags,
    AttachmentBuilder,
    ContainerBuilder,
    TextDisplayBuilder
} = require('discord.js');
const https = require('https');
const http = require('http');

const tempData = new Map();
const V2 = MessageFlags.IsComponentsV2;

function truncar(texto, max = 1900) {
    if (!texto || texto.length <= max) return texto;
    return texto.substring(0, max - 3) + '...';
}

function getExtensionFromContentType(contentType) {
    if (!contentType) return 'png';
    const type = contentType.toLowerCase();
    if (type.includes('png')) return 'png';
    if (type.includes('jpeg') || type.includes('jpg')) return 'jpg';
    if (type.includes('gif')) return 'gif';
    if (type.includes('webp')) return 'webp';
    if (type.includes('bmp')) return 'bmp';
    return 'png';
}

function downloadImage(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, { timeout: 15000 }, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                downloadImage(res.headers.location).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode !== 200) {
                reject(new Error(`Status ${res.statusCode}`));
                return;
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const contentType = res.headers['content-type'];
                const ext = getExtensionFromContentType(contentType);
                resolve({ buffer, ext });
            });
        }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
    });
}

/**
 * Helper: construye un Container simple con solo texto.
 */
function simpleTextContainer(text) {
    return new ContainerBuilder()
        .setAccentColor(0x5865F2)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(text)
        );
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (interaction.isModalSubmit()) {
            await handleModalSubmit(interaction, client);
            return;
        }

        if (interaction.isButton()) {
            await handleButton(interaction, client);
            return;
        }

        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Hubo un error ejecutando este comando.',
                        flags: MessageFlags.Ephemeral
                    });
                }
            }
        }
    }
};

async function handleModalSubmit(interaction, client) {
    const customId = interaction.customId;

    if (customId === 'modal_mensaje') {
        const mensaje = interaction.fields.getTextInputValue('mensaje_input');
        const tipo = tempData.get(`tipo_${interaction.user.id}`);

        if (tipo === 'solo_mensaje') {
            const { container } = createConfirmView();
            tempData.set(`mensaje_${interaction.user.id}`, mensaje);
            tempData.set(`estado_${interaction.user.id}`, 'confirmar_mensaje');

            // Añadimos la preview al container
            const previewContainer = simpleTextContainer(
                `**Vista Previa:**\n${truncar(mensaje)}`
            );
            previewContainer.addActionRowComponents(
                container.components[container.components.length - 1]
            );

            await interaction.reply({
                components: [previewContainer],
                flags: V2 | MessageFlags.Ephemeral
            });
        } else if (tipo === 'mensaje_embed') {
            tempData.set(`mensaje_${interaction.user.id}`, mensaje);
            await interaction.reply({
                components: [createContinueView('imagenes')],
                flags: V2 | MessageFlags.Ephemeral
            });
            tempData.set(`estado_${interaction.user.id}`, 'embed_parte1_ambos');
        }
        return;
    }

    if (customId === 'modal_mensaje_imagenes') {
        const mensaje = interaction.fields.getTextInputValue('mensaje_input');
        const imagenesTexto = interaction.fields.getTextInputValue('imagenes_input') || '';
        const imagenesUrls = parseImageUrls(imagenesTexto);

        tempData.set(`mensaje_${interaction.user.id}`, mensaje);
        tempData.set(`estado_${interaction.user.id}`, 'confirmar_mensaje_imagenes');

        const imagenesBuffers = [];
        for (let i = 0; i < imagenesUrls.length; i++) {
            try {
                console.log(`📥 Descargando URL ${i + 1}...`);
                const { buffer, ext } = await downloadImage(imagenesUrls[i]);
                imagenesBuffers.push({ buffer, ext, name: `imagen_${i + 1}.${ext}` });
                console.log(`✅ URL ${i + 1} descargada: ${buffer.length} bytes (.${ext})`);
            } catch (e) {
                console.error(`❌ Error URL ${i + 1}:`, e.message);
            }
        }
        tempData.set(`imagenes_buffers_${interaction.user.id}`, imagenesBuffers);

        let previewContent = `**Vista Previa:**\n${truncar(mensaje)}`;
        if (imagenesBuffers.length > 0) {
            previewContent += `\n\n🖼️ **Imágenes adjuntas (${imagenesBuffers.length}):**`;
            imagenesBuffers.forEach((img, i) => {
                previewContent += `\n${i + 1}. ${img.name} (${(img.buffer.length / 1024).toFixed(1)} KB)`;
            });
        }

        const { container } = createConfirmView();
        const previewContainer = simpleTextContainer(previewContent);
        previewContainer.addActionRowComponents(
            container.components[container.components.length - 1]
        );

        await interaction.reply({
            components: [previewContainer],
            flags: V2 | MessageFlags.Ephemeral
        });
        return;
    }

    if (customId === 'modal_embed_parte1') {
        const data = {
            titulo: interaction.fields.getTextInputValue('titulo') || null,
            descripcion: interaction.fields.getTextInputValue('descripcion') || null,
            url_titulo: interaction.fields.getTextInputValue('url_titulo') || null,
            color: interaction.fields.getTextInputValue('color') || null,
            autor: interaction.fields.getTextInputValue('autor') || null,
        };

        tempData.set(`embed_data_${interaction.user.id}`, data);
        const estado = tempData.get(`estado_${interaction.user.id}`);
        const embedContainer = crearEmbed(data);

        // Añadimos los botones de continuar al mismo container
        const continueContainer = createContinueView('imagenes');
        for (const comp of continueContainer.components) {
            embedContainer.addActionRowComponents(comp);
        }

        if (estado === 'embed_parte1_ambos') {
            tempData.set(`estado_${interaction.user.id}`, 'embed_parte2_ambos');
        } else if (estado === 'embed_parte1_imagenes') {
            tempData.set(`estado_${interaction.user.id}`, 'embed_parte2_imagenes');
        } else {
            tempData.set(`estado_${interaction.user.id}`, 'embed_parte2');
        }

        await interaction.reply({
            components: [embedContainer],
            flags: V2 | MessageFlags.Ephemeral
        });
        return;
    }

    if (customId === 'modal_embed_parte2') {
        const existingData = tempData.get(`embed_data_${interaction.user.id}`) || {};
        const imagenesTexto = interaction.fields.getTextInputValue('imagenes_extra') || '';
        const imagenesExtraUrls = parseImageUrls(imagenesTexto);
        const imagenPrincipal = interaction.fields.getTextInputValue('imagen') || null;

        const imagenesBuffers = [];
        if (imagenPrincipal) {
            try {
                console.log(`📥 Descargando imagen principal...`);
                const { buffer, ext } = await downloadImage(imagenPrincipal);
                imagenesBuffers.push({ buffer, ext, name: `imagen_principal.${ext}` });
                console.log(`✅ Principal descargada: ${buffer.length} bytes (.${ext})`);
            } catch (e) {
                console.error(`❌ Error imagen principal:`, e.message);
            }
        }

        for (let i = 0; i < imagenesExtraUrls.length; i++) {
            try {
                console.log(`📥 Descargando extra ${i + 1}...`);
                const { buffer, ext } = await downloadImage(imagenesExtraUrls[i]);
                imagenesBuffers.push({ buffer, ext, name: `imagen_extra_${i + 1}.${ext}` });
                console.log(`✅ Extra ${i + 1} descargada: ${buffer.length} bytes (.${ext})`);
            } catch (e) {
                console.error(`❌ Error extra ${i + 1}:`, e.message);
            }
        }

        const data = {
            ...existingData,
            imagen: imagenPrincipal,
            thumbnail: interaction.fields.getTextInputValue('thumbnail') || null,
            footer: interaction.fields.getTextInputValue('footer') || null,
            footer_icon: interaction.fields.getTextInputValue('footer_icon') || null,
        };

        tempData.set(`embed_data_${interaction.user.id}`, data);
        tempData.set(`imagenes_buffers_${interaction.user.id}`, imagenesBuffers);
        const estado = tempData.get(`estado_${interaction.user.id}`);
        const embedContainer = crearEmbed(data);

        const continueContainer = createContinueView('campos');
        for (const comp of continueContainer.components) {
            embedContainer.addActionRowComponents(comp);
        }

        if (estado === 'embed_parte2_ambos') {
            tempData.set(`estado_${interaction.user.id}`, 'embed_parte3_ambos');
        } else if (estado === 'embed_parte2_imagenes') {
            tempData.set(`estado_${interaction.user.id}`, 'embed_parte3_imagenes');
        } else {
            tempData.set(`estado_${interaction.user.id}`, 'embed_parte3');
        }

        await interaction.reply({
            components: [embedContainer],
            flags: V2 | MessageFlags.Ephemeral
        });
        return;
    }

    if (customId === 'modal_embed_parte3') {
        const existingData = tempData.get(`embed_data_${interaction.user.id}`) || {};
        const fields = [];

        const c1n = interaction.fields.getTextInputValue('campo1_nombre');
        const c1v = interaction.fields.getTextInputValue('campo1_valor');
        if (c1n && c1v) fields.push({ name: c1n, value: c1v, inline: true });

        const c2n = interaction.fields.getTextInputValue('campo2_nombre');
        const c2v = interaction.fields.getTextInputValue('campo2_valor');
        if (c2n && c2v) fields.push({ name: c2n, value: c2v, inline: true });

        const c3n = interaction.fields.getTextInputValue('campo3_nombre');
        if (c3n) {
            tempData.set(`campo3_nombre_${interaction.user.id}`, c3n);
            tempData.set(`embed_data_temp_${interaction.user.id}`, { ...existingData, fields });
        }

        const data = { ...existingData, fields };
        tempData.set(`embed_data_${interaction.user.id}`, data);
        await mostrarPreviewFinal(interaction, data);
        return;
    }
}

async function handleButton(interaction, client) {
    const customId = interaction.customId;

    if (customId === 'tipo_solo_mensaje') {
        tempData.set(`tipo_${interaction.user.id}`, 'solo_mensaje');
        await interaction.showModal(createMensajeModal(false));
        return;
    }

    if (customId === 'tipo_solo_embed') {
        tempData.set(`tipo_${interaction.user.id}`, 'solo_embed');
        tempData.set(`estado_${interaction.user.id}`, 'embed_parte1');
        await interaction.showModal(createEmbedModal1());
        return;
    }

    if (customId === 'tipo_mensaje_embed') {
        tempData.set(`tipo_${interaction.user.id}`, 'mensaje_embed');
        await interaction.showModal(createMensajeModal(false));
        return;
    }

    if (customId === 'tipo_mensaje_imagenes') {
        tempData.set(`tipo_${interaction.user.id}`, 'mensaje_imagenes');
        await interaction.showModal(createMensajeModal(true));
        return;
    }

    if (customId === 'tipo_embed_imagenes') {
        tempData.set(`tipo_${interaction.user.id}`, 'embed_imagenes');
        tempData.set(`estado_${interaction.user.id}`, 'embed_parte1_imagenes');
        await interaction.showModal(createEmbedModal1());
        return;
    }

    if (customId === 'tipo_subir_imagenes') {
        await iniciarCollectorImagenes(interaction, client);
        return;
    }

    if (customId === 'continuar_imagenes') {
        await interaction.showModal(createEmbedModal2());
        return;
    }

    if (customId === 'terminar_imagenes') {
        const estado = tempData.get(`estado_${interaction.user.id}`);
        const data = tempData.get(`embed_data_${interaction.user.id}`) || {};
        data.fields = [];
        tempData.set(`embed_data_${interaction.user.id}`, data);

        if (estado?.includes('ambos')) {
            tempData.set(`estado_${interaction.user.id}`, 'embed_parte3_ambos');
        } else if (estado?.includes('imagenes')) {
            tempData.set(`estado_${interaction.user.id}`, 'embed_parte3_imagenes');
        } else {
            tempData.set(`estado_${interaction.user.id}`, 'embed_parte3');
        }

        const embedContainer = crearEmbed(data);
        const continueContainer = createContinueView('campos');
        for (const comp of continueContainer.components) {
            embedContainer.addActionRowComponents(comp);
        }

        await interaction.reply({
            components: [embedContainer],
            flags: V2 | MessageFlags.Ephemeral
        });
        return;
    }

    if (customId === 'continuar_campos') {
        await interaction.showModal(createEmbedModal3());
        return;
    }

    if (customId === 'terminar_campos') {
        const data = tempData.get(`embed_data_${interaction.user.id}`) || {};
        if (!data.fields) data.fields = [];
        tempData.set(`embed_data_${interaction.user.id}`, data);
        await mostrarPreviewFinal(interaction, data);
        return;
    }

    if (customId === 'confirmar_envio') {
        await interaction.deferUpdate();
        await enviarAnuncios(interaction, client);
        return;
    }

    if (customId === 'cancelar_envio') {
        limpiarDatosTemporales(interaction.user.id);
        await interaction.update({
            components: [simpleTextContainer('❌ Envío cancelado.')],
            flags: V2
        });
        return;
    }
}

async function iniciarCollectorImagenes(interaction, client) {
    const canal = interaction.channel;

    const botMsg = await canal.send({
        content: `<@${interaction.user.id}> **📎 Subir imágenes locales**\n\nResponde a este mensaje con los archivos que quieres adjuntar (máx. 10 imágenes).\nEscribe **'listo'** cuando termines.\nTienes 2 minutos.`,
        allowedMentions: { users: [interaction.user.id] }
    });

    await interaction.reply({
        content: '⏳ Esperando que subas las imágenes... Revisa el mensaje que acabo de enviar en el canal.',
        flags: MessageFlags.Ephemeral
    });

    const filter = m => {
        if (m.author.id !== interaction.user.id) return false;
        if (m.reference?.messageId !== botMsg.id) return false;
        return true;
    };

    const collector = canal.createMessageCollector({
        filter,
        time: 120000,
        max: 11
    });

    const imagenesBuffers = [];

    collector.on('collect', async (m) => {
        if (m.content.trim().toLowerCase() === 'listo') {
            collector.stop('listo');
            return;
        }

        if (m.attachments.size > 0) {
            for (const att of m.attachments.values()) {
                if (att.contentType?.startsWith('image/')) {
                    try {
                        console.log(`📥 Descargando imagen: ${att.name}`);
                        const { buffer, ext } = await downloadImage(att.url);
                        const finalName = att.name.endsWith(`.${ext}`) ? att.name : `imagen_${imagenesBuffers.length + 1}.${ext}`;
                        imagenesBuffers.push({ buffer, ext, name: finalName });
                        console.log(`✅ Imagen descargada: ${finalName} (${buffer.length} bytes)`);
                        await m.react('✅');
                    } catch (e) {
                        console.error(`❌ Error descargando ${att.name}:`, e.message);
                        await m.react('❌');
                    }
                }
            }
        }
    });

    collector.on('end', async (collected, reason) => {
        try {
            await botMsg.delete();
            for (const m of collected.values()) {
                if (m.deletable) await m.delete();
            }
        } catch (e) {}

        if (reason === 'time') {
            await interaction.followUp({
                content: '⏰ **Tiempo agotado.** No se recibieron imágenes. Intenta de nuevo con `/anuncio`.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (imagenesBuffers.length === 0) {
            await interaction.followUp({
                content: '❌ No se recibieron imágenes válidas. Intenta de nuevo con `/anuncio`.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        tempData.set(`tipo_${interaction.user.id}`, 'mensaje_imagenes_locales');
        tempData.set(`imagenes_buffers_${interaction.user.id}`, imagenesBuffers);
        tempData.set(`estado_${interaction.user.id}`, 'confirmar_mensaje_imagenes');

        let previewContent = `**Vista Previa:**\n📎 **${imagenesBuffers.length} imagen(es) local(es) lista(s) para enviar:**`;
        imagenesBuffers.forEach((img, i) => {
            previewContent += `\n${i + 1}. ${img.name} (${(img.buffer.length / 1024).toFixed(1)} KB)`;
        });

        const { container } = createConfirmView();
        const previewContainer = simpleTextContainer(truncar(previewContent));
        previewContainer.addActionRowComponents(
            container.components[container.components.length - 1]
        );

        await interaction.followUp({
            components: [previewContainer],
            flags: V2 | MessageFlags.Ephemeral
        });
    });
}

function limpiarDatosTemporales(userId) {
    tempData.delete(`tipo_${userId}`);
    tempData.delete(`mensaje_${userId}`);
    tempData.delete(`imagenes_${userId}`);
    tempData.delete(`imagenes_buffers_${userId}`);
    tempData.delete(`embed_data_${userId}`);
    tempData.delete(`estado_${userId}`);
    tempData.delete(`campo3_nombre_${userId}`);
    tempData.delete(`embed_data_temp_${userId}`);
}

async function mostrarPreviewFinal(interaction, embedData) {
    const embedContainer = crearEmbed(embedData);
    const tipo = tempData.get(`tipo_${interaction.user.id}`);
    const mensaje = tempData.get(`mensaje_${interaction.user.id}`);
    const imagenesBuffers = tempData.get(`imagenes_buffers_${interaction.user.id}`) || [];
    const { container } = createConfirmView();

    let headerText = '**Vista Previa Final:**';

    if (tipo === 'mensaje_embed' && mensaje) {
        headerText = `**Vista Previa Final:**\n${mensaje}`;
        tempData.set(`estado_${interaction.user.id}`, 'confirmar_ambos');
    } else if (tipo === 'mensaje_imagenes' && mensaje) {
        headerText = `**Vista Previa Final:**\n${mensaje}`;
        if (imagenesBuffers.length > 0) {
            headerText += `\n\n🖼️ **${imagenesBuffers.length} imagen(es) adjunta(s)**`;
        }
        tempData.set(`estado_${interaction.user.id}`, 'confirmar_mensaje_imagenes');
    } else if (tipo === 'mensaje_imagenes_locales') {
        if (imagenesBuffers.length > 0) {
            headerText += `\n📎 **${imagenesBuffers.length} imagen(es) local(es) adjunta(s)**`;
        }
        tempData.set(`estado_${interaction.user.id}`, 'confirmar_mensaje_imagenes');
    } else if (tipo === 'embed_imagenes') {
        if (imagenesBuffers.length > 0) {
            headerText += `\n🖼️ **${imagenesBuffers.length} imagen(es) adjunta(s)**`;
        }
        tempData.set(`estado_${interaction.user.id}`, 'confirmar_embed_imagenes');
    } else {
        tempData.set(`estado_${interaction.user.id}`, 'confirmar_embed');
    }

    const headerContainer = simpleTextContainer(truncar(headerText));
    headerContainer.addActionRowComponents(
        container.components[container.components.length - 1]
    );

    await interaction.reply({
        components: [embedContainer, headerContainer],
        flags: V2 | MessageFlags.Ephemeral
    });
}

async function enviarAnuncios(interaction, client) {
    const consentidos = loadJson('consentidos.json', []);
    const total = consentidos.length;
    let enviados = 0;
    let fallidos = 0;

    const tipo = tempData.get(`tipo_${interaction.user.id}`);
    const mensaje = tempData.get(`mensaje_${interaction.user.id}`);
    const imagenesBuffers = tempData.get(`imagenes_buffers_${interaction.user.id}`) || [];
    const embedData = tempData.get(`embed_data_${interaction.user.id}`);

    const progresoMsg = await interaction.followUp({
        content: `📤 Enviando mensajes...\n${progressBar(0)} (0/${total})`,
        ephemeral: false
    });

    let embedContainer = null;
    let filesArray = [];
    if (embedData) {
        const embedDataCopy = { ...embedData };
        const tieneImagenPrincipal = imagenesBuffers.find(img => img.name.startsWith('imagen_principal'));
        if (tieneImagenPrincipal && embedDataCopy.imagen) {
            embedDataCopy.imagen = `attachment://${tieneImagenPrincipal.name}`;
        }
        embedContainer = crearEmbed(embedDataCopy);
    }

    for (const uid of consentidos) {
        const user = await client.users.fetch(uid).catch(() => null);
        if (!user) { fallidos++; continue; }

        try {
            const messageOptions = { flags: V2 };
            const components = [];

            // Construir el contenido V2 según el tipo
            if (tipo === 'solo_mensaje') {
                components.push(simpleTextContainer(mensaje));
            }
            else if (tipo === 'mensaje_imagenes') {
                if (mensaje) components.push(simpleTextContainer(mensaje));
                if (imagenesBuffers.length > 0) {
                    const files = [];
                    for (let i = 0; i < Math.min(imagenesBuffers.length, 10); i++) {
                        const img = imagenesBuffers[i];
                        files.push(new AttachmentBuilder(img.buffer, { name: img.name }));
                    }
                    if (files.length > 0) messageOptions.files = files;
                }
            }
            else if (tipo === 'mensaje_imagenes_locales') {
                if (mensaje) components.push(simpleTextContainer(mensaje));
                if (imagenesBuffers.length > 0) {
                    const files = [];
                    for (let i = 0; i < Math.min(imagenesBuffers.length, 10); i++) {
                        const img = imagenesBuffers[i];
                        files.push(new AttachmentBuilder(img.buffer, { name: img.name }));
                    }
                    if (files.length > 0) messageOptions.files = files;
                }
            }
            else if (tipo === 'solo_embed') {
                if (embedContainer) components.push(embedContainer);
            }
            else if (tipo === 'embed_imagenes') {
                if (embedContainer) components.push(embedContainer);
                if (imagenesBuffers.length > 0) {
                    const files = [];
                    for (let i = 0; i < Math.min(imagenesBuffers.length, 10); i++) {
                        const img = imagenesBuffers[i];
                        files.push(new AttachmentBuilder(img.buffer, { name: img.name }));
                    }
                    if (files.length > 0) messageOptions.files = files;
                }
            }
            else if (tipo === 'mensaje_embed') {
                if (mensaje) components.push(simpleTextContainer(mensaje));
                if (embedContainer) components.push(embedContainer);
            }

            messageOptions.components = components;

            await user.send(messageOptions);
            enviados++;
        } catch (error) {
            console.error(`Error enviando a ${user?.tag}:`, error.message);
            fallidos++;
        }

        const porcentaje = total > 0 ? Math.floor((enviados / total) * 100) : 0;
        await progresoMsg.edit({
            content: `📤 Enviando mensajes...\n${progressBar(porcentaje)} (${enviados}/${total})`
        });

        await new Promise(r => setTimeout(r, 1200));
    }

    await progresoMsg.edit({
        content: `✅ **Envío completado**\n${progressBar(100)} (${enviados}/${total})\n❌ Fallidos: ${fallidos}`
    });

    limpiarDatosTemporales(interaction.user.id);
}