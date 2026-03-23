const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getAgents } = require('../../utilities/wazuh');
const path = require('path');

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
            const file = new AttachmentBuilder(
                path.join(__dirname, '../../S.H.I.E.L.D-Bot deep in thought.png')
            );

            const embed = new EmbedBuilder()
                .setTitle('Wazuh Agents')
                .setDescription(description)
                .setColor(0x800080) 
                .setThumbnail('attachment://wazuh.png')
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                files: [file]
            });

        } catch (err) {
            await interaction.editReply({
                content: `❌ Error fetching agents: ${err.message}`
            });
        }
    }
};