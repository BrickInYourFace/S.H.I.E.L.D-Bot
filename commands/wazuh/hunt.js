const { SlashCommandBuilder } = require('discord.js');
const { threatHunt } = require('../../utilities/wazuh');

const commonSuggestions = [
    'SessionEnv',
    'netstat',
    'wazuh-server',
    'DESKTOP-C9Q13F7',
    'tailscaled',
    'winlogon',
    'EventChannel',
    'authentication failed',
    'port opened',
    'port closed',
    'windows_application',
    'powershell',
    'failed password',
    'sshd',
    'sudo',
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hunt')
        .setDescription('Search alerts across all agents by keyword, IP, or username')
        .addStringOption(opt =>
            opt.setName('query')
                .setDescription('Keyword, IP address, or username to search for')
                .setRequired(false)
                .setAutocomplete(true)
        )
        .addIntegerOption(opt =>
            opt.setName('limit')
                .setDescription('Number of results (default: 5, max: 10)')
                .setMinValue(1)
                .setMaxValue(10)
                .setRequired(false)
        ),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();

        // Filter suggestions based on what user is typing
        const filtered = commonSuggestions
            .filter(s => s.includes(focused))
            .map(s => ({ name: s, value: s }))
            .slice(0, 25);

        // If nothing matches, show all suggestions
        await interaction.respond(
            filtered.length > 0 ? filtered : commonSuggestions.slice(0, 25).map(s => ({ name: s, value: s }))
        );
    },

    async execute(interaction) {
        await interaction.deferReply();
        try {
            const query = interaction.options.getString('query');
            const limit = interaction.options.getInteger('limit') ?? 5;

            // If no query provided show help
            if (!query) {
                return await interaction.editReply(
                    '🔍 **Threat Hunt Usage:**\n' +
                    'Provide a keyword, IP address, or username to search across all alerts.\n\n' +
                    '**Examples:**\n' +
                    '• `/hunt query:192.168.1.100` — search by IP\n' +
                    '• `/hunt query:administrator` — search by username\n' +
                    '• `/hunt query:brute force` — search by keyword\n' +
                    '• `/hunt query:powershell limit:10` — search with limit'
                );
            }

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