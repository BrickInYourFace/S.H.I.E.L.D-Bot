const { SlashCommandBuilder } = require('discord.js');
const { getTopRules } = require('../../utilities/wazuh');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toprules')
        .setDescription('Show the most frequently triggered Wazuh rules')
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Number of rules to show (default: 5, max: 10)')
                .setMinValue(1)
                .setMaxValue(10)
                .setRequired(false)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const limit = interaction.options.getInteger('limit') ?? 5;
            const rules = await getTopRules(limit);

            if (!rules.length) {
                return await interaction.editReply('✅ No rules found.');
            }

            let msg = `**Top ${rules.length} Triggered Rules:**\n`;
            rules.forEach((rule, i) => {
                msg += `\n**${i + 1}.** \`${rule.description}\`\n`;
                msg += `   🔢 Rule ID: ${rule.id} | 🔴 Level: ${rule.level} | 📊 Count: ${rule.count}\n`;
            });

            await interaction.editReply(msg);
        } catch (err) {
            await interaction.editReply('❌ Error fetching top rules: ' + err.message);
        }
    }
};