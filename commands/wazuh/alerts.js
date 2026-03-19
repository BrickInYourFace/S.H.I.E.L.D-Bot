const { SlashCommandBuilder } = require('discord.js');
const { getAlerts } = require('../../utilities/wazuh');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('alerts')
        .setDescription('Show recent security alerts from Wazuh')
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Number of alerts to show (default: 5, max: 10)')
                .setMinValue(1)
                .setMaxValue(10)
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('Minimum severity level (default: 1, max: 15)')
                .setMinValue(1)
                .setMaxValue(15)
                .setRequired(false)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const limit = interaction.options.getInteger('limit') ?? 5;
            const level = interaction.options.getInteger('level') ?? 1;
            const alerts = await getAlerts(limit, level);

            if (!alerts.length) {
                return await interaction.editReply(`✅ No alerts found at level ${level} or above.`);
            }

            let msg = `**Recent Wazuh Security Alerts (level ≥ ${level}, last ${alerts.length}):**\n`;
            alerts.forEach((alert, i) => {
                msg += `\n**${i + 1}.** \`${alert.rule?.description ?? 'Unknown'}\`\n`;
                msg += `   🔴 Level: ${alert.rule?.level ?? 'N/A'} | 🖥️ Agent: ${alert.agent?.name ?? 'N/A'}\n`;
                msg += `   🕒 ${new Date(alert.timestamp).toLocaleString()}\n`;
            });

            await interaction.editReply(msg);
        } catch (err) {
            await interaction.editReply('❌ Error fetching alerts: ' + err.message);
        }
    }
};