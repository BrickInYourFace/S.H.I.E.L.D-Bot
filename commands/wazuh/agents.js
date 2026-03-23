const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAgents } = require('../../utilities/wazuh');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('agents')
        .setDescription('List all Wazuh agents and their status'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const agents = await getAgents();

            let description = '';
            agents.forEach(agent => {
                const emoji = agent.status === 'active' ? '✅' : '❌';
                description += `${emoji} **${agent.name}** — ${agent.status}\n`;
            });

            const embed = new EmbedBuilder()
                .setTitle('Wazuh Agents')
                .setDescription(description || 'No agents found.')
                .setColor(0x800080) 
                .setThumbnail('../../wazuh.png') 
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (err) {
            await interaction.editReply({
                content: '❌ Error fetching agents: ' + err.message
            });
        }
    }
};