const botConfig = require('../config');

function validarGuild(interaction) {
    if (!interaction.guild) {
        return {
            valido: false,
            mensaje: '❌ Este comando solo puede usarse en un servidor.'
        };
    }

    if (interaction.guild.id !== botConfig.guildId) {
        return {
            valido: false,
            mensaje: '❌ Este bot no está autorizado en este servidor.'
        };
    }

    return { valido: true };
}

module.exports = { validarGuild };