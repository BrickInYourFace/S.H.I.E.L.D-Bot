const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getManagerStatus } = require('../../utilities/wazuh');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Show Wazuh manager service status'),
    async execute(interaction) {

        await interaction.deferReply();
        try {
            const statuses = await getManagerStatus();
            let msg = '';
            for (const [service, status] of Object.entries(statuses)) {
                const emoji = status === 'running' ? '✅' : '❌';
                msg += `${emoji} ${service}: ${status}\n`;
            }
            const statusEmbed = new EmbedBuilder()
                .setAuthor({ name: 'Developed By The S.H.I.E.L.D Team' })
                .setTitle('Status of background processes running on the wazuh server:')
                .setDescription(msg)
                .setColor('#6B52ED')
                .setTimestamp()

            await interaction.editReply({ embeds: [statusEmbed] });
        } catch (err) {
            await interaction.editReply('❌ Error fetching status: ' + err.message);
        }
    }
};