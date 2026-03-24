const { SlashCommandBuilder } = require('discord.js');
const { getAgentDetails } = require('../../utilities/wazuh');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('agent')
        .setDescription('Get detailed info about a specific agent')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Agent name to look up')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const name = interaction.options.getString('name');
            const agents = await getAgentDetails(name);

            if (!agents.length) {
                return await interaction.editReply(`❌ No agent found with name: \`${name}\``);
            }

            const a = agents[0];
            const statusEmoji = a.status === 'active' ? '✅' : '❌';

            const embed = {
                color: a.status === 'active' ? 0x00ff00 : 0xff0000,
                title: `🖥️ Agent: ${a.name}`,
                fields: [
                    { name: 'Status', value: `${statusEmoji} ${a.status}`, inline: true },
                    { name: 'ID', value: a.id, inline: true },
                    { name: 'IP', value: a.ip ?? 'N/A', inline: true },
                    { name: 'OS', value: a.os?.name ?? 'N/A', inline: true },
                    { name: 'OS Version', value: a.os?.version ?? 'N/A', inline: true },
                    { name: 'Agent Version', value: a.version ?? 'N/A', inline: true },
                    { name: 'Last Keepalive', value: a.lastKeepAlive ?? 'N/A', inline: false },
                    { name: 'Registration Date', value: a.dateAdd ?? 'N/A', inline: false },
                ],
                footer: { text: 'Wazuh SIEM' },
                timestamp: new Date().toISOString()
            };

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply('❌ Error fetching agent: ' + err.message);
        }
    }
};