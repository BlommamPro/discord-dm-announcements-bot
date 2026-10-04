// deploy-commands.js (en la raíz de tu proyecto)
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config(); // Carga tu .env

const commands = [];
// Toma los archivos de comando desde src/commands
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
    } else {
        console.log(`[WARNING] El comando en ${filePath} no tiene las propiedades "data" o "execute".`);
    }
}

// Usa tu token y el ID de tu cliente desde .env
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`Empezando a registrar ${commands.length} comandos de aplicación (/).`);

        // Registra los comandos globalmente (pueden tardar en aparecer)
        // O en un guild específico para que aparezcan al instante
        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        console.log(`Se recargaron exitosamente ${data.length} comandos de aplicación (/).`);
    } catch (error) {
        console.error(error);
    }
})();