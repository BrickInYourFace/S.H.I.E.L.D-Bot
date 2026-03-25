const { getAlerts } = require('./wazuh');
const { alertMentionId } = require('../config.json');

let seenAlertIds = new Set();
let initialized = false;

async function startAlertPoller(client, channelId) {
    console.log('🔔 Alert poller started, watching channel:', channelId);

    // Initialize — mark all current alerts as already seen
    const initAlerts = await getAlerts(50, 1);
    initAlerts.forEach(a => seenAlertIds.add(a._id ?? `${a.timestamp}-${a.rule?.id}`));
    initialized = true;
    console.log(`⏱️ Initialized with ${seenAlertIds.size} existing alerts marked as seen`);

    setInterval(async () => {
        try {
            console.log('🔍 Polling for new alerts...');
            const alerts = await getAlerts(50, 10); // change 1 back to 10 after testing

            const newAlerts = alerts.filter(a => {
                const id = a._id ?? `${a.timestamp}-${a.rule?.id}`;
                return !seenAlertIds.has(id);
            });

            console.log(`🆕 New alerts: ${newAlerts.length}`);
            if (newAlerts.length === 0) return;

            // Mark new alerts as seen
            newAlerts.forEach(a => {
                const id = a._id ?? `${a.timestamp}-${a.rule?.id}`;
                seenAlertIds.add(id);
            });

            const channel = await client.channels.fetch(channelId);
            if (!channel) {
                console.error('❌ Channel not found:', channelId);
                return;
            }

            for (const alert of newAlerts.reverse()) {
                const level = alert.rule?.level ?? 0;
                const color = level >= 12 ? 0xff0000 : level >= 10 ? 0xff6600 : 0xffcc00;
                const levelLabel = level >= 12 ? '🔴 CRITICAL' : level >= 10 ? '🟠 HIGH' : '🟡 MEDIUM';

                const embed = {
                    color,
                    title: `🚨 Wazuh Alert — Level ${level} ${levelLabel}`,
                    fields: [
                        { name: '📋 Rule', value: alert.rule?.description ?? 'Unknown', inline: false },
                        { name: '🖥️ Agent', value: alert.agent?.name ?? 'N/A', inline: true },
                        { name: '🔢 Rule ID', value: String(alert.rule?.id ?? 'N/A'), inline: true },
                        { name: '📁 Groups', value: alert.rule?.groups?.join(', ') ?? 'N/A', inline: false },
                    ],
                    timestamp: alert.timestamp,
                    footer: { text: 'Wazuh SIEM' }
                };

                await channel.send({
                    content: `<@${alertMentionId}> ⚠️ New Wazuh alert detected!`,
                    embeds: [embed]
                });
                console.log(`✅ Sent alert: ${alert.rule?.description}`);
            }
        } catch (err) {
            console.error('❌ Poller error:', err.message);
        }
    }, 30000);
}

module.exports = { startAlertPoller };