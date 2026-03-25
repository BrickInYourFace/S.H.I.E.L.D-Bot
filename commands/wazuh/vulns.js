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

            let msg = `**Vulnerabilities on \`${agentName}\`${severity ? ` (${severity})` : ''}:**\n`; //the chosen severity will be >=
            vulns.slice(0, 10).forEach((v, i) => {
                const sev = v.vulnerability?.severity ?? 'N/A';
                const sevEmoji = sev === 'Critical' ? '🔴' : sev === 'High' ? '🟠' : sev === 'Medium' ? '🟡' : '🟢';
                msg += `\n**${i + 1}.** \`${v.package?.name ?? 'Unknown'}\` — ${v.package?.version ?? 'N/A'}\n`;
                msg += `   ${sevEmoji} Severity: ${sev} | CVE: ${v.vulnerability?.id ?? 'N/A'}\n`;
                msg += `   📋 ${v.vulnerability?.description?.slice(0, 80) ?? 'No description'}...\n`;
            });

            if (vulns.length > 10) msg += `\n...and ${vulns.length - 10} more. Use \`severity\` filter to narrow down.`;

            await interaction.editReply(msg);
        } catch (err) {
            await interaction.editReply('❌ Error fetching vulnerabilities: ' + err.message);
        }
    }
};