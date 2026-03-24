const { Events } = require('discord.js');
const { startAlertPoller } = require('../utilities/alertPoller');
const { alertChannelId } = require('../config.json');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		startAlertPoller(client, alertChannelId);
	},
};