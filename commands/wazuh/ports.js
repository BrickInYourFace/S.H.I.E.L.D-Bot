const { SlashCommandBuilder } = require('discord.js');
const { getOpenPorts, getAgents } = require('../../utilities/wazuh');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ports')
        .setDescription('Show open ports on a Wazuh agent')
        .addStringOption(opt =>
            opt.setName('agent')
                .setDescription('Agent name to check')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(opt =>
            opt.setName('protocol')
                .setDescription('Filter by protocol')
                .setRequired(false)
                .addChoices(
                    { name: 'TCP',  value: 'tcp'  },
                    { name: 'UDP',  value: 'udp'  },
                    { name: 'Both', value: 'both' }
                )
        ),

    async autocomplete(interaction) {
        try {
            const focused = interaction.options.getFocused().toLowerCase();
            const agents = await getAgents();
            const choices = agents
                .filter(a => a.id !== '000' && a.name.toLowerCase().includes(focused))
                .map(a => ({ name: `${a.name} (${a.status})`, value: a.name }))
                .slice(0, 25);
            await interaction.respond(choices);
        } catch {
            await interaction.respond([]);
        }
    },

    async execute(interaction) {
        await interaction.deferReply();

        const agentName = interaction.options.getString('agent');
        const protocol  = interaction.options.getString('protocol') ?? 'both';
        const ports     = await getOpenPorts(agentName, protocol);

        if (!ports.length) {
            return await interaction.editReply(`✅ No open ports found on \`${agentName}\``);
        }

        let msg = `**Open Ports on \`${agentName}\`${protocol !== 'both' ? ` (${protocol.toUpperCase()})` : ''}:**\n`;
        msg += `\`\`\`\n`;
        msg += `${'Port'.padEnd(8)}${'Protocol'.padEnd(10)}${'State'.padEnd(12)}Process\n`;
        msg += `${'─'.repeat(45)}\n`;
        ports.slice(0, 20).forEach(p => {
            const port    = String(p.local?.port ?? 'N/A').padEnd(8);
            const proto   = (p.protocol ?? 'N/A').padEnd(10);
            const state   = (p.state ?? 'N/A').padEnd(12);
            const process = p.process ?? 'N/A';
            msg += `${port}${proto}${state}${process}\n`;
        });
        msg += `\`\`\``;
        if (ports.length > 20) msg += `\n...and ${ports.length - 20} more.`;

        await interaction.editReply(msg);
    }
};
