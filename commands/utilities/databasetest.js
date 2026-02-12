//this comment only tests the database to see if it works through the number of times a user has used this command
const db = require('../../database/keyv');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('databasetest')
        .setDescription('Replies with Pong!'),

    async execute(interaction) {
        const userIdKey = interaction.user.id;
        const count = (await db.uses.get(userIdKey)) ?? 0;
        await db.uses.set(userIdKey, count + 1);

        /* testing new database namespaces feature
        const threatID = interaction.user.id;
        const threatValue = (await db.threats.get(threatID)) ?? 100;
        await db.threats.set(threatID, threatValue + 1);
        */
 
        await interaction.reply(`You used this command ${count + 1} times and have a threat level of ${threatValue + 1}.`);
    },
};