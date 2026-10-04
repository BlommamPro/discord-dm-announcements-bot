// ============================================================
// refresh-commands.js
// Borra TODOS los comandos (globales + guild) y registra los
// comandos actuales de src/commands/ en el GUILD.
// Úsalo solo cuando haya comandos fantasma o quieras limpiar.
// Uso: node refresh-commands.js
// ============================================================

const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// ============================================================
// VALIDAR VARIABLES DE ENTORNO
// ============================================================
if (!process.env.DISCORD_TOKEN) {
    console.error('❌ Falta DISCORD_TOKEN en el .env');
    process.exit(1);
}
if (!process.env.CLIENT_ID) {
    console.error('❌ Falta CLIENT_ID en el .env');
    process.exit(1);
}
if (!process.env.GUILD_ID) {
    console.error('❌ Falta GUILD_ID en el .env');
    process.exit(1);
}

// ============================================================
// 1. CARGAR COMANDOS ACTUALES
// ============================================================
const commands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');

if (!fs.existsSync(commandsPath)) {
    console.error(`❌ No existe la carpeta: ${commandsPath}`);
    process.exit(1);
}

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log('\n📂 Cargando comandos desde src/commands/...\n');

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
            console.log(`  ✓ /${command.data.name}`);
        } else {
            console.warn(`  ⚠️ Ignorado (falta "data" o "execute"): ${file}`);
        }
    } catch (err) {
        console.error(`  ❌ Error cargando ${file}:`, err.message);
    }
}

console.log(`\n📋 Total de comandos a registrar: ${commands.length}\n`);

// ============================================================
// 2. REFRESH COMPLETO
// ============================================================
(async () => {
    try {
        // --- 2.1 Borrar comandos GLOBALES ---
        console.log('🗑️  Borrando comandos GLOBALES...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: [] }
        );
        console.log('   ✅ Globales borrados\n');

        // --- 2.2 Borrar comandos del GUILD ---
        console.log('🗑️  Borrando comandos del GUILD...');
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: [] }
        );
        console.log('   ✅ Guild borrados\n');

        // --- 2.3 Pausa breve ---
        await new Promise(r => setTimeout(r, 2000));

        // --- 2.4 Registrar comandos nuevos ---
        console.log('📤 Registrando comandos nuevos en el GUILD...');
        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );
        console.log(`   ✅ ${data.length} comandos registrados\n`);

        // --- 2.5 Verificar ---
        console.log('🔍 Verificando estado final...\n');
        const guildCommands = await rest.get(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
        );
        const globalCommands = await rest.get(
            Routes.applicationCommands(process.env.CLIENT_ID)
        );

        console.log('📋 Estado actual:');
        console.log(`   Guild (${guildCommands.length}):`);
        guildCommands.forEach(c => console.log(`     /${c.name}`));
        console.log(`   Globales (${globalCommands.length}):`);
        if (globalCommands.length === 0) {
            console.log('     (ninguno)');
        } else {
            globalCommands.forEach(c => console.log(`     /${c.name}`));
        }

        console.log('\n✅ REFRESH COMPLETADO');
        console.log('💡 Si no ves los comandos en Discord:');
        console.log('   1. Cierra Discord completamente (bandeja → Quit)');
        console.log('   2. Ábrelo de nuevo');
        console.log('   3. Escribe / en cualquier canal\n');

    } catch (error) {
        console.error('\n❌ Error durante el refresh:');
        console.error(error);

        if (error.code === 50035) {
            console.error('\n💡 Error 50035: Los comandos tienen un formato inválido.');
            console.error('   Revisa que todos los .js de src/commands/ tengan:');
            console.error('   - data: new SlashCommandBuilder()');
            console.error('   - execute: async function');
        }

        if (error.status === 401) {
            console.error('\n💡 Error 401: El DISCORD_TOKEN es inválido.');
        }

        process.exit(1);
    }
})();