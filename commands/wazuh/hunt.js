const { SlashCommandBuilder } = require('discord.js');
const { threatHunt } = require('../../utilities/wazuh');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hunt')
        .setDescription('Search alerts across all agents by keyword, IP, or username')
        .addStringOption(opt =>
            opt.setName('query')
                .setDescription('Keyword, IP address, or username to search for')
                .setRequired(true)
        )
        .addIntegerOption(opt =>
            opt.setName('limit')
                .setDescription('Number of results (default: 5, max: 10)')
                .setMinValue(1)
                .setMaxValue(10)
                .setRequired(false)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const query = interaction.options.getString('query');
            const limit = interaction.options.getInteger('limit') ?? 5;
            const results = await threatHunt(query, limit);

            if (!results.length) {
                return await interaction.editReply(`🔍 No alerts found matching \`${query}\``);
            }

            let msg = `**🔍 Threat Hunt Results for \`${query}\` (${results.length} found):**\n`;
            results.forEach((alert, i) => {
                const level = alert.rule?.level ?? 0;
                const emoji = level >= 12 ? '🔴' : level >= 10 ? '🟠' : level >= 7 ? '🟡' : '⚪';
                msg += `\n**${i + 1}.** ${emoji} \`${alert.rule?.description ?? 'Unknown'}\`\n`;
                msg += `   🖥️ Agent: ${alert.agent?.name ?? 'N/A'} | 🔢 Level: ${level}\n`;
                msg += `   🕒 ${new Date(alert.timestamp).toLocaleString()}\n`;
            });

            await interaction.editReply(msg);
        } catch (err) {
            await interaction.editReply('❌ Error: ' + err.message);
        }
    }
};