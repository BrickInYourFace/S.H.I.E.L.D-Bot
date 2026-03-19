const { SlashCommandBuilder } = require('discord.js');
const { getAgents } = require('../../utilities/wazuh');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('agents')
        .setDescription('List all Wazuh agents and their status'),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const agents = await getAgents();
            let msg = '**Wazuh Agents:**\n';
            agents.forEach(agent => {
                const emoji = agent.status === 'active' ? '✅' : '❌';
                msg += `${emoji} ${agent.name} — ${agent.status}\n`;
            });
            await interaction.editReply(msg);
        } catch (err) {
            await interaction.editReply('❌ Error fetching agents: ' + err.message);
        }
    }
};