const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getAlerts } = require('../../utilities/wazuh');
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
            .setMinValue(1).setMaxValue(15).setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const limit  = interaction.options.getInteger('limit') ?? 5;
            const level  = interaction.options.getInteger('level') ?? 1;
            const alerts = await getAlerts(limit, level);

            if (!alerts || alerts.length === 0) {
                return await interaction.editReply({
                    content: `✅ No alerts found at level **${level}** or above.`
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

            // Discord allows max 10 embeds per message
            await interaction.editReply({ embeds, files: [file] });

        } catch (err) {
            await interaction.editReply({
                content: `❌ Error fetching alerts: ${err.message}`
            });
        }
    }
};