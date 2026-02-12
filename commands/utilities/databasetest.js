//this comment only tests the database to see if it works through the number of times a user has used this command
const keyv = require('../../database/keyv');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('databasetest')
        .setDescription('Replies with Pong!'),

    async execute(interaction) {
        const key = `uses:${interaction.user.id}`;

        const count = (await keyv.get(key)) ?? 0;
        await keyv.set(key, count + 1);

        await interaction.reply(`You used this command ${count + 1} times.`);
    },
};