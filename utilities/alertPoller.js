const axios = require('axios');
const { getAlerts } = require('./wazuh');

let lastAlertTimestamp = new Date().toISOString();

async function startAlertPoller(client, channelId) {
    console.log('🔔 Alert poller started');

    setInterval(async () => {
        try {
            const alerts = await getAlerts(10, 10);
            const newAlerts = alerts.filter(a => a.timestamp > lastAlertTimestamp);

            if (newAlerts.length === 0) return;

            lastAlertTimestamp = newAlerts[0].timestamp;

            const channel = await client.channels.fetch(channelId);
            if (!channel) return;

            for (const alert of newAlerts.reverse()) {
                const level = alert.rule?.level ?? 0;
                const color = level >= 12 ? 0xff0000 : level >= 10 ? 0xff6600 : 0xffcc00;

                const embed = {
                    color,
                    title: `🚨 Wazuh Alert — Level ${level}`,
                    fields: [
                        { name: '📋 Rule', value: alert.rule?.description ?? 'Unknown', inline: false },
                        { name: '🖥️ Agent', value: alert.agent?.name ?? 'N/A', inline: true },
                        { name: '🔢 Rule ID', value: String(alert.rule?.id ?? 'N/A'), inline: true },
                        { name: '📁 Groups', value: alert.rule?.groups?.join(', ') ?? 'N/A', inline: false },
                    ],
                    timestamp: alert.timestamp,
                    footer: { text: 'Wazuh SIEM' }
                };

                await channel.send({ embeds: [embed] });
            }
        } catch (err) {
            console.error('Poller error:', err.message);
        }
    }, 30000); // checks every 30 seconds
}

module.exports = { startAlertPoller };