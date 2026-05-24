const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getVulnerabilities, getAgents } = require('../../utilities/wazuh');

const sevColor     = { Critical: 0xFF0000, High: 0xFF6600, Medium: 0xFFCC00, Low: 0x00CC44 };
const sevEmoji     = { Critical: '🔴', High: '🟠', Medium: '🟡', Low: '🟢' };
const sevThumbnail = {
    Critical: 'https://raw.githubusercontent.com/BrickInYourFace/S.H.I.E.L.D-Bot/main/Gemini_Generated_Image_fvoikcfvoikcfvoi.png',
    High:     'https://raw.githubusercontent.com/BrickInYourFace/S.H.I.E.L.D-Bot/main/Gemini_Generated_Image_szkwjaszkwjaszkw.png',
    Medium:   'https://raw.githubusercontent.com/BrickInYourFace/S.H.I.E.L.D-Bot/main/Gemini_Generated_Image_wn8cn4wn8cn4wn8c.png',
    Low:      'https://raw.githubusercontent.com/BrickInYourFace/S.H.I.E.L.D-Bot/main/Gemini_Generated_Image_j13gnlj13gnlj13g.png'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vulnerabilities')
        .setDescription('Show vulnerabilities detected on an agent')
        .addStringOption(option =>
            option.setName('agent')
                .setDescription('Agent name to check')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('severity')
                .setDescription('Filter by severity')
                .setRequired(false)
                .addChoices(
                    { name: 'Critical', value: 'Critical' },
                    { name: 'High',     value: 'High'     },
                    { name: 'Medium',   value: 'Medium'   },
                    { name: 'Low',      value: 'Low'      }
                )
        ),

    async autocomplete(interaction) {
        try {
            const focused = interaction.options.getFocused().toLowerCase();
            const agents = await getAgents();
            const choices = agents
                .filter(a => a.id !== '000' && a.name.toLowerCase().includes(focused))
                .map(a => ({ name: `${a.name} (${a.status})`, value: a.name }))
                .slice(0, 25);
            await interaction.respond(choices);
        } catch {
            await interaction.respond([]);
        }
    },

    async execute(interaction) {
        await interaction.deferReply();

        const agentName = interaction.options.getString('agent');
        const severity  = interaction.options.getString('severity');
        const vulns     = await getVulnerabilities(agentName, severity);

        if (!vulns.length) {
            const noResultEmbed = new EmbedBuilder()
                .setColor(0x00CC44)
                .setTitle('✅ No Vulnerabilities Found')
                .setDescription(`Agent \`${agentName}\` looks clean${severity ? ` for **${severity}** severity` : ''}.`)
                .setThumbnail(sevThumbnail['Low'])
                .setTimestamp();
            return await interaction.editReply({ embeds: [noResultEmbed] });
        }

        const topSev = ['Critical', 'High', 'Medium', 'Low'].find(s =>
            vulns.some(v => v.vulnerability?.severity === s)
        );

        const embed = new EmbedBuilder()
            .setColor(sevColor[topSev] ?? 0x888888)
            .setTitle(`🛡️ Vulnerabilities — ${agentName}`)
            .setDescription(`${severity ? `Filtered by **${severity}**` : 'All severities'} • Showing ${Math.min(vulns.length, 10)} of ${vulns.length}`)
            .setThumbnail(sevThumbnail[topSev] ?? null)
            .setTimestamp()
            .setFooter({ text: vulns.length > 10 ? 'Use the severity filter to narrow down results' : 'S.H.I.E.L.D Bot' });

        vulns.slice(0, 10).forEach(v => {
            const sev   = v.vulnerability?.severity ?? 'N/A';
            const emoji = sevEmoji[sev] ?? '⚪';
            const cve   = v.vulnerability?.id ?? 'N/A';
            const desc  = v.vulnerability?.description?.slice(0, 80) ?? 'No description';
            const pkg   = v.package?.name ?? 'Unknown';
            const ver   = v.package?.version ?? 'N/A';
            embed.addFields({
                name:  `${emoji} ${pkg} (${ver})`,
                value: `**CVE:** ${cve}\n**Severity:** ${sev}\n**Info:** ${desc}...`,
            });
        });

        await interaction.editReply({ embeds: [embed] });
    }
};
