const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getManagerStatus } = require('../../utilities/wazuh');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Show Wazuh manager service status'),
    async execute(interaction) {
        const statusEmbed = new EmbedBuilder()
            .setAuthor({ name: 'Developed By The S.H.I.E.L.D Team' })
            .setTitle('Status')
            .setDescription('Show Wazuh manager service status')
            .setColor('#6B52ED')

        await interaction.deferReply();
        try {
            const statuses = await getManagerStatus();
            let msg = '**Wazuh Manager Status:**\n';
            for (const [service, status] of Object.entries(statuses)) {
                const emoji = status === 'running' ? '✅' : '❌';
                msg += `${emoji} ${service}: ${status}\n`;
            }
            await interaction.editReply({msg, embeds: [statusEmbed]});
        } catch (err) {
            await interaction.editReply('❌ Error fetching status: ' + err.message);
        }
    }
};