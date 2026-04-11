const { SlashCommandBuilder } = require('discord.js');
const { scanUrl, scanHash, scanFile } = require('../../utilities/virustotal');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('virustotal')
        .setDescription('Scan using VirusTotal')
        .addSubcommand(sub =>
            sub.setName('url')
                .setDescription('Scan a URL or IP address')
                .addStringOption(opt =>
                    opt.setName('target')
                        .setDescription('URL or IP to scan')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('hash')
                .setDescription('Scan a file hash (MD5, SHA1, SHA256)')
                .addStringOption(opt =>
                    opt.setName('hash')
                        .setDescription('File hash to scan')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('file')
                .setDescription('Scan a file attachment')
                .addAttachmentOption(opt =>
                    opt.setName('file')
                        .setDescription('File to scan (max 32MB)')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        await interaction.deferReply();
        const sub = interaction.options.getSubcommand();

        try {
            let result;

            if (sub === 'url') {
                const target = interaction.options.getString('target');
                result = await scanUrl(target);
                result.label = `🌐 URL: \`${target}\``;
            }

            else if (sub === 'hash') {
                const hash = interaction.options.getString('hash');
                result = await scanHash(hash);
                result.label = `#️⃣ Hash: \`${hash}\``;
            }

            else if (sub === 'file') {
                const attachment = interaction.options.getAttachment('file');
                if (attachment.size > 32 * 1024 * 1024) {
                    return await interaction.editReply('❌ File too large. Max size is 32MB.');
                }
                await interaction.editReply('⏳ Uploading file to VirusTotal, this may take a moment...');
                result = await scanFile(attachment.url, attachment.name);
                result.label = `📄 File: \`${attachment.name}\``;
            }

            const { malicious, suspicious, harmless, undetected } = result.stats;
            const total = malicious + suspicious + harmless + undetected;
            const color = malicious > 0 ? 0xff0000 : suspicious > 0 ? 0xff6600 : 0x00ff00;
            const verdict = malicious > 0 ? '🚨 MALICIOUS' : suspicious > 0 ? '⚠️ SUSPICIOUS' : '✅ CLEAN';

            const embed = {
                color,
                title: `VirusTotal Scan — ${verdict}`,
                description: result.label,
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

            // Show detections if any
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
            await interaction.editReply('❌ Error: ' + err.message);
        }
    }
};