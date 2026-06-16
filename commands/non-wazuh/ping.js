const { SlashCommandBuilder } = require('discord.js');
//sends a reply and it has 10 seconds cooldown, a feature I added to interactionCreate.js
module.exports = {
	cooldown: 10,
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Check Bot Alive Status'),
	async execute(interaction) {
		await interaction.reply('pong');
	}
};