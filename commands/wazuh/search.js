const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getAlertsByRuleId } = require('../../utilities/wazuh');
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
        .setName('search')
        .setDescription('Fetch all alerts triggered by a specific Wazuh rule ID')
        .addStringOption(o => o
            .setName('rule_id')
            .setDescription('The Wazuh rule ID to search for (e.g. 5710)')
            .setRequired(true))
        .addIntegerOption(o => o
            .setName('limit')
            .setDescription('Number of alerts to show (default: 5, max: 10)')
            .setMinValue(1).setMaxValue(10).setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        const ruleId = interaction.options.getString('rule_id').trim();
        const limit  = interaction.options.getInteger('limit') ?? 5;

        try {
            const alerts = await getAlertsByRuleId(ruleId, limit);

            if (!alerts || alerts.length === 0) {
                return await interaction.editReply({
                    content: `🔍 No alerts found for rule ID **${ruleId}**.`
                });
            }

            const file = new AttachmentBuilder(
                path.join(__dirname, '../../S.H.I.E.L.D-Bot-deep-in-thought.png')
            );

            const embeds = alerts.map((alert, i) => {
                const lvl = alert.rule?.level ?? 0;
                const sev = SEVERITY.find(s => lvl >= s.min);

                return new EmbedBuilder()
                    .setAuthor({ name: 'S.H.I.E.L.D Bot — Rule Search' })
                    .setTitle(`🔎 ${alert.rule?.description ?? 'Unknown Rule'}`)
                    .setColor(sev.color)
                    .addFields(
                        { name: '📋 Rule ID',  value: `\`${alert.rule?.id ?? ruleId}\``,                                     inline: true  },
                        { name: '🛡️ Severity', value: `${sev.label} (Level ${lvl})`,                                        inline: true  },
                        { name: '🖥️ Agent',    value: `${alert.agent?.name ?? 'N/A'} (ID: ${alert.agent?.id ?? 'N/A'})`,    inline: true  },
                        { name: '📁 Location', value: `\`${alert.location ?? 'N/A'}\``,                                     inline: false },
                        { name: '🏷️ Groups',   value: alert.rule?.groups?.join(', ') ?? 'N/A',                              inline: false },
                        { name: '🕒 Time',     value: alert.timestamp ? new Date(alert.timestamp).toLocaleString() : 'N/A', inline: false },
                    )
                    .setThumbnail('attachment://S.H.I.E.L.D-Bot-deep-in-thought.png')
                    .setFooter({ text: `Alert ${i + 1} of ${alerts.length}` })
                    .setTimestamp();
            });

            await interaction.editReply({ embeds, files: [file] });

        } catch (err) {
            await interaction.editReply({
                content: `❌ Error searching for rule **${ruleId}**: ${err.message}`
            });
        }
    }
};
