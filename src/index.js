const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const botConfig = require('./config');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

loadCommands(client);
loadEvents(client);

client.login(botConfig.token).catch(error => {
    console.error('Error al iniciar el bot:', error.message);
    console.error('Asegúrate de configurar el token correctamente en src/config.js');
    process.exit(1);
});

const os = require('os');

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

setInterval(() => {
    const usage = process.memoryUsage();
    console.log(`[RAM] RSS: ${formatBytes(usage.rss)} | Heap: ${formatBytes(usage.heapUsed)}/${formatBytes(usage.heapTotal)} | Externa: ${formatBytes(usage.external)}`);
}, 30000);
