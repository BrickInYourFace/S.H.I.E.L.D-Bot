const { getAlerts, getAgents, getTopRules } = require('./wazuh');
const alertMentionId = process.env.ALERT_MENTION_ID;
const fs = require('fs');
const path = require('path');

const SUMMARY_FILE = path.join(__dirname, '../data/lastSummaryTimestamp.json');

function loadLastSummaryTime() {
    try {
        if (fs.existsSync(SUMMARY_FILE)) {
            const data = JSON.parse(fs.readFileSync(SUMMARY_FILE));
            return new Date(data.timestamp);
        }
    } catch (err) {
        console.error('Error loading summary timestamp:', err.message);
    }
    return null;
}

function saveLastSummaryTime() {
    try {
        fs.mkdirSync(path.dirname(SUMMARY_FILE), { recursive: true });
        fs.writeFileSync(SUMMARY_FILE, JSON.stringify({ timestamp: new Date().toISOString() }));
    } catch (err) {
        console.error('Error saving summary timestamp:', err.message);
    }
}

async function sendDailySummary(client, channelId) {
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) return;

        const [agents, topRules, criticalAlerts, highAlerts] = await Promise.all([
            getAgents(),
            getTopRules(5),
            getAlerts(100, 12),
            getAlerts(100, 10)
        ]);

        const activeAgents = agents.filter(a => a.status === 'active').length;
        const disconnectedAgents = agents.filter(a => a.status === 'disconnected').length;

        const criticalCount = criticalAlerts.filter(a => {
            const d = new Date(a.timestamp);
            return Date.now() - d.getTime() < 86400000;
        }).length;

        const highCount = highAlerts.filter(a => {
            const d = new Date(a.timestamp);
            return Date.now() - d.getTime() < 86400000;
        }).length;

        const topRulesList = topRules
            .map((r, i) => `${i + 1}. ${r.description} (${r.count} times)`)
            .join('\n');

        // Calculate next summary time
        const nextSummary = new Date(Date.now() + 86400000);

        const embed = {
            color: criticalCount > 0 ? 0xff0000 : highCount > 0 ? 0xff6600 : 0x00ff00,
            title: '📊 Daily Wazuh Security Summary',
            fields: [
                { 
                    name: '🖥️ Agents', 
                    value: `✅ Active: ${activeAgents}\n❌ Disconnected: ${disconnectedAgents}\n📊 Total: ${agents.length - 1}`, 
                    inline: true 
                },
                { 
                    name: '🚨 Alerts (24h)', 
                    value: `🔴 Critical (12+): ${criticalCount}\n🟠 High (10+): ${highCount}`, 
                    inline: true 
                },
                { 
                    name: '🔥 Top Triggered Rules', 
                    value: topRulesList || 'None', 
                    inline: false 
                },
                {
                    name: '⏭️ Next Summary',
                    value: nextSummary.toLocaleString(),
                    inline: false
                }
            ],
            timestamp: new Date().toISOString(),
            footer: { text: 'Wazuh SIEM — Daily Report' }
        };

        await channel.send({ embeds: [embed] });
        saveLastSummaryTime();
        console.log(`✅ Daily summary sent. Next at ${nextSummary.toLocaleString()}`);
    } catch (err) {
        console.error('❌ Daily summary error:', err.message);
    }
}

function scheduleDailySummary(client, channelId) {
    console.log('📅 Daily summary scheduler started');

    const lastSummary = loadLastSummaryTime();
    const now = Date.now();

    if (!lastSummary) {
        // Never sent before — send immediately then schedule every 24h
        console.log('📅 No previous summary found — sending now');
        sendDailySummary(client, channelId);
        setInterval(() => sendDailySummary(client, channelId), 86400000);
    } else {
        const timeSinceLast = now - lastSummary.getTime();
        const timeUntilNext = 86400000 - timeSinceLast;

        if (timeUntilNext <= 0) {
            // 24 hours already passed — send immediately
            console.log('📅 24 hours passed — sending summary now');
            sendDailySummary(client, channelId);
            setInterval(() => sendDailySummary(client, channelId), 86400000);
        } else {
            // Wait for the remaining time then resume 24h schedule
            const minutesLeft = Math.round(timeUntilNext / 60000);
            console.log(`📅 Next summary in ${minutesLeft} minutes`);
            setTimeout(() => {
                sendDailySummary(client, channelId);
                setInterval(() => sendDailySummary(client, channelId), 86400000);
            }, timeUntilNext);
        }
    }
}

module.exports = { scheduleDailySummary };