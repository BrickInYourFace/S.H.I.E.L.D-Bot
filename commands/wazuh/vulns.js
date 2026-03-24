const { SlashCommandBuilder } = require('discord.js');
const { getVulnerabilities } = require('../../utilities/wazuh');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vulns')
        .setDescription('Show vulnerabilities detected on an agent')
        .addStringOption(option =>
            option.setName('agent')
                .setDescription('Agent name to check')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('severity')
                .setDescription('Filter by severity')
                .setRequired(false)
                .addChoices(
                    { name: 'Critical', value: 'Critical' },
                    { name: 'High', value: 'High' },
                    { name: 'Medium', value: 'Medium' },
                    { name: 'Low', value: 'Low' }
                )
        ),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const agentName = interaction.options.getString('agent');
            const severity = interaction.options.getString('severity');
            const vulns = await getVulnerabilities(agentName, severity);

            if (!vulns.length) {
                return await interaction.editReply(`✅ No vulnerabilities found for \`${agentName}\``);
            }

            let msg = `**Vulnerabilities on \`${agentName}\`${severity ? ` (${severity})` : ''}:**\n`;
            vulns.slice(0, 10).forEach((v, i) => {
                msg += `\n**${i + 1}.** \`${v.name}\` — ${v.version ?? 'N/A'}\n`;
                msg += `   ⚠️ Severity: ${v.severity ?? 'N/A'} | CVE: ${v.cve ?? 'N/A'}\n`;
            });

            if (vulns.length > 10) msg += `\n...and ${vulns.length - 10} more.`;

            await interaction.editReply(msg);
        } catch (err) {
            await interaction.editReply('❌ Error fetching vulnerabilities: ' + err.message);
        }
    }
};