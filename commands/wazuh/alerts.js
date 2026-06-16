const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getAlerts, getAgents } = require('../../utilities/wazuh');
const path = require('path');

const SEVERITY = [
    { min: 13, color: 0x4A0080, label: '🔴 Critical' },
    { min: 10, color: 0x6B2FA0, label: '🟠 High'     },
    { min: 7,  color: 0x8B5EC5, label: '🟡 Medium'   },
    { min: 4,  color: 0xA97FD4, label: '🔵 Low'      },
    { min: 0,  color: 0xC9A8E8, label: '🟢 Info'     },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('alerts')
        .setDescription('Show recent security alerts from Wazuh')
        .addIntegerOption(o => o
            .setName('limit')
            .setDescription('Number of alerts to show (default: 5, max: 10)')
            .setMinValue(1).setMaxValue(10).setRequired(false))
        .addIntegerOption(o => o
            .setName('level')
            .setDescription('Minimum severity level (default: 1, max: 15)')
            .setMinValue(1).setMaxValue(15).setRequired(false))
        .addStringOption(o => o
            .setName('agent')
            .setDescription('Filter alerts by agent name (default: all agents)')
            .setRequired(false)
            .setAutocomplete(true)),

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

    async fetchAlerts(interaction) {
        await interaction.deferReply();

        const limit     = interaction.options?.getInteger?.('limit') ?? 5;
        const level     = interaction.options?.getInteger?.('level') ?? 1;
        const agentName = interaction.options?.getString?.('agent') ?? null;
        const alerts    = await getAlerts(limit, level, agentName);

        if (!alerts || alerts.length === 0) {
            const agentNote = agentName ? ` for agent **${agentName}**` : '';
            return await interaction.editReply({
                content: `✅ No alerts found at level **${level}** or above${agentNote}.`
            });
        }

        const file = new AttachmentBuilder(
            path.join(__dirname, '../../S.H.I.E.L.D-Bot-deep-in-thought.png')
        );

        const embeds = alerts.map((alert, i) => {
            const lvl = alert.rule?.level ?? 0;
            const sev = SEVERITY.find(s => lvl >= s.min);
            return new EmbedBuilder()
                .setAuthor({ name: 'S.H.I.E.L.D Bot — Wazuh Alert' })
                .setTitle(`⚠️ ${alert.rule?.description ?? 'Unknown Rule'}`)
                .setColor(sev.color)
                .addFields(
                    { name: '🛡️ Severity', value: `${sev.label} (Level ${lvl})`,                                        inline: true  },
                    { name: '🖥️ Agent',    value: `${alert.agent?.name ?? 'N/A'} (ID: ${alert.agent?.id ?? 'N/A'})`,    inline: true  },
                    { name: '📋 Rule ID',  value: `\`${alert.rule?.id ?? 'N/A'}\``,                                     inline: true  },
                    { name: '📁 Location', value: `\`${alert.location ?? 'N/A'}\``,                                     inline: false },
                    { name: '🏷️ Groups',   value: alert.rule?.groups?.join(', ') ?? 'N/A',                              inline: false },
                    { name: '🕒 Time',     value: alert.timestamp ? new Date(alert.timestamp).toLocaleString() : 'N/A', inline: false },
                )
                .setThumbnail('attachment://S.H.I.E.L.D-Bot-deep-in-thought.png')
                .setFooter({ text: `Alert ${i + 1} of ${alerts.length}` })
                .setTimestamp();
        });

        await interaction.editReply({ embeds, files: [file] });
    },

    async execute(interaction) {
        await this.fetchAlerts(interaction);
    }
};
