const { SlashCommandBuilder } = require('discord.js');
const { scanUrl } = require('../../utilities/virustotal');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('virustotal')
        .setDescription('Scan a URL or IP using VirusTotal')
        .addStringOption(option =>
            option.setName('target')
                .setDescription('URL or IP address to scan')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const target = interaction.options.getString('target');
            const result = await scanUrl(target);

            const { malicious, suspicious, harmless, undetected } = result.stats;
            const total = malicious + suspicious + harmless + undetected;
            const color = malicious > 0 ? 0xff0000 : suspicious > 0 ? 0xff6600 : 0x00ff00;
            const verdict = malicious > 0 ? '🚨 MALICIOUS' : suspicious > 0 ? '⚠️ SUSPICIOUS' : '✅ CLEAN';

            const embed = {
                color,
                title: `VirusTotal Scan — ${verdict}`,
                description: `**Target:** \`${target}\``,
                fields: [
                    { name: '🚨 Malicious', value: String(malicious), inline: true },
                    { name: '⚠️ Suspicious', value: String(suspicious), inline: true },
                    { name: '✅ Harmless', value: String(harmless), inline: true },
                    { name: '❓ Undetected', value: String(undetected), inline: true },
                    { name: '📊 Total Engines', value: String(total), inline: true },
                ],
                url: result.permalink,
                footer: { text: 'Powered by VirusTotal' },
                timestamp: new Date().toISOString()
            };

            // Show which engines detected it
            if (result.detections.length > 0) {
                const detectionList = result.detections
                    .slice(0, 10)
                    .map(d => `• **${d.engine}**: ${d.result}`)
                    .join('\n');
                embed.fields.push({
                    name: `🔍 Detections (${result.detections.length})`,
                    value: detectionList,
                    inline: false
                });
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply('❌ Error scanning target: ' + err.message);
        }
    }
};