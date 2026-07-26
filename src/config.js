require('dotenv').config();

module.exports = {
    token: process.env.DISCORD_TOKEN,
    guildId: process.env.GUILD_ID,
    intents: [
        'Guilds',
        'GuildMembers',
        'GuildMessages',
        'GuildMessageReactions',
        'DirectMessages',
        'MessageContent',
    ],
    partials: ['Message', 'Channel', 'Reaction'],
};