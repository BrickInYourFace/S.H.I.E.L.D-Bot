const { getAlerts } = require('./wazuh');
const { alertMentionId } = require('../config.json');
const fs = require('fs');
const path = require('path');

const TIMESTAMP_FILE = path.join(__dirname, '../data/lastAlertTimestamp.json');
let seenAlertIds = new Set();

function loadLastTimestamp() {
    try {
        if (fs.existsSync(TIMESTAMP_FILE)) {
            const data = JSON.parse(fs.readFileSync(TIMESTAMP_FILE));
            return data.timestamp;
        }
    } catch (err) {
        console.error('Error loading timestamp:', err.message);
    }
    return new Date().toISOString(); // default to now if no file
}

function saveLastTimestamp(timestamp) {
    try {
        fs.mkdirSync(path.dirname(TIMESTAMP_FILE), { recursive: true });
        fs.writeFileSync(TIMESTAMP_FILE, JSON.stringify({ timestamp }));
    } catch (err) {
        console.error('Error saving timestamp:', err.message);
    }
}

async function startAlertPoller(client, channelId) {
    console.log('🔔 Alert poller started, watching channel:', channelId);

    // Load last known timestamp from file
    let lastTimestamp = loadLastTimestamp();
    console.log(`⏱️ Resuming from timestamp: ${lastTimestamp}`);

    // Initialize seen IDs from recent alerts after that timestamp
    const initAlerts = await getAlerts(200, 1);
    initAlerts
        .filter(a => a.timestamp <= lastTimestamp)
        .forEach(a => seenAlertIds.add(a._id ?? `${a.timestamp}-${a.rule?.id}`));
    console.log(`⏱️ Marked ${seenAlertIds.size} old alerts as seen`);

    setInterval(async () => {
        try {
            console.log('🔍 Polling for new alerts...');
            const alerts = await getAlerts(50, 10);

            const newAlerts = alerts.filter(a => {
                const id = a._id ?? `${a.timestamp}-${a.rule?.id}`;
                return !seenAlertIds.has(id) && a.timestamp > lastTimestamp;
            });

            console.log(`🆕 New alerts: ${newAlerts.length}`);
            if (newAlerts.length === 0) return;

            // Update timestamp and save to file
            lastTimestamp = newAlerts[0].timestamp;
            saveLastTimestamp(lastTimestamp);

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