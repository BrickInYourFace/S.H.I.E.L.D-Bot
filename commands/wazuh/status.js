const { SlashCommandBuilder } = require('discord.js');
const { getManagerStatus } = require('../../utilities/wazuh');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Show Wazuh manager service status'),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const statuses = await getManagerStatus();
            let msg = '**Wazuh Manager Status:**\n';
            for (const [service, status] of Object.entries(statuses)) {
                const emoji = status === 'running' ? '✅' : '❌';
                msg += `${emoji} ${service}: ${status}\n`;
            }
            await interaction.editReply(msg);
        } catch (err) {
            await interaction.editReply('❌ Error fetching status: ' + err.message);
        }
    }
};