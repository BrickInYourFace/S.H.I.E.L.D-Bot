const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const path = require('path');

const NVD_API = 'https://services.nvd.nist.gov/rest/json/cves/2.0';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cve')
        .setDescription('Search for a CVE by ID')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('CVE ID (e.g., CVE-2021-44228)')
                .setRequired(true)
        ),

    async execute(interaction) {
        const cveId = interaction.options.getString('id');

        await interaction.reply({ content: `🔍 Searching for ${cveId}...` });

        try {
            const res = await axios.get(`${NVD_API}?cveId=${cveId}`);
            const data = res.data;

            if (!data.vulnerabilities || data.vulnerabilities.length === 0) {
                return interaction.editReply('❌ CVE not found.');
            }

            const cve = data.vulnerabilities[0].cve;

            const description = cve.descriptions?.[0]?.value || 'No description';

            const severity =
                cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseSeverity ||
                cve.metrics?.cvssMetricV30?.[0]?.cvssData?.baseSeverity ||
                'N/A';

            const score =
                cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore ||
                cve.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore ||
                'N/A';

            
            const filePath = path.join(process.cwd(), 'shieldbot-impressed.png');
            const attachment = new AttachmentBuilder(filePath, { name: 'shieldbot-impressed.png' });

            
            const embed = new EmbedBuilder()
                .setTitle(`🔎 ${cve.id}`)
                .setDescription(description.substring(0, 4000)) // Discord limit safety
                .addFields(
                    { name: 'Severity', value: severity, inline: true },
                    { name: 'Score', value: String(score), inline: true }
                )
                .setColor(
                    severity === 'CRITICAL' ? 0xff0000 :
                    severity === 'HIGH' ? 0xffa500 :
                    severity === 'MEDIUM' ? 0xffff00 :
                    severity === 'LOW' ? 0x00ff00 :
                    0x808080
                )
                .setThumbnail('attachment://shieldbot-impressed.png')
                .setFooter({ text: 'Data from NVD (CVE API)' })
                .setTimestamp();

            await interaction.editReply({
                content: '',
                embeds: [embed],
                files: [attachment]
            });

        } catch (err) {
            console.error(err);
            await interaction.editReply('⚠️ Error fetching CVE data.');
        }
    }
};