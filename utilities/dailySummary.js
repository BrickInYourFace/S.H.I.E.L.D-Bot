const { getAlerts, getAgents, getTopRules } = require('./wazuh');
const { alertMentionId } = require('../config.json');

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
            return Date.now() - d.getTime() < 86400000; // last 24h
        }).length;
        const highCount = highAlerts.filter(a => {
            const d = new Date(a.timestamp);
            return Date.now() - d.getTime() < 86400000;
        }).length;

        const topRulesList = topRules
            .map((r, i) => `${i + 1}. ${r.description} (${r.count} times)`)
            .join('\n');

        const embed = {
            color: criticalCount > 0 ? 0xff0000 : highCount > 0 ? 0xff6600 : 0x00ff00,
            title: '📊 Daily Wazuh Security Summary',
            fields: [
                { name: '🖥️ Agents', value: `✅ Active: ${activeAgents}\n❌ Disconnected: ${disconnectedAgents}\n📊 Total: ${agents.length - 1}`, inline: true },
                { name: '🚨 Alerts (24h)', value: `🔴 Critical (12+): ${criticalCount}\n🟠 High (10+): ${highCount}`, inline: true },
                { name: '🔥 Top Triggered Rules', value: topRulesList || 'None', inline: false },
            ],
            timestamp: new Date().toISOString(),
            footer: { text: 'Wazuh SIEM — Daily Report' }
        };

        await channel.send({ embeds: [embed] });
        console.log('✅ Daily summary sent');
    } catch (err) {
        console.error('❌ Daily summary error:', err.message);
    }
}

function scheduleDailySummary(client, channelId) {
    console.log('📅 Daily summary scheduler started');



    // Then send every 24 hours
    setInterval(() => sendDailySummary(client, channelId), 86400000);
}

module.exports = { scheduleDailySummary };