const { Events } = require('discord.js');
const { startAlertPoller } = require('../utilities/alertPoller');
const { alertChannelId, alertMentionId} = require('../config.json');
const { scheduleDailySummary } = require('../utilities/dailySummary');
module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		startAlertPoller(client, alertChannelId);
		scheduleDailySummary(client, alertChannelId);
		const channel = await client.channels.fetch(alertChannelId);
		if (channel) {
    		await channel.send(`<@${alertMentionId}> 🔔 Alert poller is online and watching!`);
    		console.log('✅ Test message sent to channel');
		} else {
    		console.error('❌ Could not find channel:', alertChannelId);
		}
	},
};