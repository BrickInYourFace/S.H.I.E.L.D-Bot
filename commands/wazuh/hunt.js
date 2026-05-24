const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { threatHunt } = require('../../utilities/wazuh');

const commonSuggestions = [
    'SessionEnv', 'netstat', 'wazuh-server', 'DESKTOP-C9Q13F7',
    'tailscaled', 'winlogon', 'EventChannel', 'authentication failed',
    'port opened', 'port closed', 'windows_application', 'powershell',
    'failed password', 'sshd', 'sudo',
];

const levelColor = (level) => {
    if (level >= 12) return 0xe74c3c;
    if (level >= 10) return 0xe67e22;
    if (level >= 7)  return 0xf1c40f;
    return 0x95a5a6;
};

const levelEmoji = (level) => {
    if (level >= 12) return '🔴 Critical';
    if (level >= 10) return '🟠 High';
    if (level >= 7)  return '🟡 Medium';
    return '⚪ Low';
};

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
                .setMinValue(1).setMaxValue(10).setRequired(false)
        ),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        const filtered = commonSuggestions
            .filter(s => s.includes(focused))
            .map(s => ({ name: s, value: s }))
            .slice(0, 25);
        await interaction.respond(
            filtered.length > 0 ? filtered : commonSuggestions.slice(0, 25).map(s => ({ name: s, value: s }))
        );
    },

    async execute(interaction) {
        await interaction.deferReply();

        const query = interaction.options.getString('query');
        const limit = interaction.options.getInteger('limit') ?? 5;

        if (!query) {
            const helpEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🔍 Threat Hunt')
                .setDescription('Search alerts across all agents by keyword, IP address, or username.')
                .addFields(
                    { name: 'Options',  value: '`query` — keyword, IP, or username\n`limit` — number of results (1–10, default 5)' },
                    { name: 'Examples', value: [
                        '`/hunt query:192.168.1.100` — search by IP',
                        '`/hunt query:administrator` — search by username',
                        '`/hunt query:brute force` — search by keyword',
                        '`/hunt query:powershell limit:10` — with limit',
                    ].join('\n') }
                )
                .setFooter({ text: 'S.H.I.E.L.D Bot • Threat Intelligence' });
            return await interaction.editReply({ embeds: [helpEmbed] });
        }

        const results = await threatHunt(query, limit);

        if (!results.length) {
            const emptyEmbed = new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('🔍 No Results Found')
                .setDescription(`No alerts matched \`${query}\``)
                .setTimestamp()
                .setFooter({ text: 'S.H.I.E.L.D Bot • Threat Intelligence' });
            return await interaction.editReply({ embeds: [emptyEmbed] });
        }

        const highestLevel = Math.max(...results.map(a => a.rule?.level ?? 0));
        const embed = new EmbedBuilder()
            .setColor(levelColor(highestLevel))
            .setTitle(`🔍 Threat Hunt — \`${query}\``)
            .setDescription(`Found **${results.length}** alert${results.length > 1 ? 's' : ''}`)
            .setTimestamp()
            .setFooter({ text: 'S.H.I.E.L.D Bot • Threat Intelligence' });

        results.forEach((alert, i) => {
            const level = alert.rule?.level ?? 0;
            embed.addFields({
                name:  `${i + 1}. ${levelEmoji(level)} — Level ${level}`,
                value: [
                    `**${alert.rule?.description ?? 'Unknown'}**`,
                    `🖥️ Agent: \`${alert.agent?.name ?? 'N/A'}\``,
                    `🕒 ${new Date(alert.timestamp).toLocaleString()}`,
                ].join('\n'),
            });
        });

        await interaction.editReply({ embeds: [embed] });
    }
};
