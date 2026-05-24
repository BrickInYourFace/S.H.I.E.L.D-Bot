const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getOpenPorts, getAgents } = require('../../utilities/wazuh');

const PORTS_PER_PAGE = 10;

function buildEmbed(agentName, protocol, ports, page, totalPages) {
    const start = page * PORTS_PER_PAGE;
    const slice = ports.slice(start, start + PORTS_PER_PAGE);

    const rows = slice.map(p => {
        const port    = String(p.local?.port ?? 'N/A').padEnd(8);
        const proto   = (p.protocol ?? 'N/A').padEnd(10);
        const state   = (p.state ?? 'N/A').padEnd(12);
        const process = p.process ?? 'N/A';
        return `${port}${proto}${state}${process}`;
    }).join('\n');

    return {
        color: 0x5865F2,
        title: `🔌 Open Ports — \`${agentName}\`${protocol !== 'both' ? ` (${protocol.toUpperCase()})` : ''}`,
        description: `\`\`\`\n${'Port'.padEnd(8)}${'Protocol'.padEnd(10)}${'State'.padEnd(12)}Process\n${'─'.repeat(45)}\n${rows}\n\`\`\``,
        footer: { text: `Page ${page + 1} of ${totalPages} • ${ports.length} total ports • Wazuh SIEM` },
        timestamp: new Date().toISOString()
    };
}

function buildButtons(page, totalPages) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ports_first')
            .setLabel('⏮')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId('ports_prev')
            .setLabel('◀')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId('ports_page')
            .setLabel(`${page + 1} / ${totalPages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId('ports_next')
            .setLabel('▶')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === totalPages - 1),
        new ButtonBuilder()
            .setCustomId('ports_last')
            .setLabel('⏭')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === totalPages - 1),
    );
}

// ✅ Error embed for when Wazuh/Tailscale is unreachable
function buildErrorEmbed() {
    return {
        color: 0xff0000,
        title: '⚠️ Wazuh Server Unavailable',
        description: 'The Wazuh server is currently **offline or unreachable**. Please try again later or contact your administrator.',
        footer: { text: 'S.H.I.E.L.D BOT • Wazuh Integration' },
        timestamp: new Date().toISOString()
    };
}

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
            // ✅ Silently return empty list when Tailscale is disconnected
            await interaction.respond([]).catch(() => {});
        }
    },

    async execute(interaction) {
        await interaction.deferReply();

        const agentName = interaction.options.getString('agent');
        const protocol  = interaction.options.getString('protocol') ?? 'both';

        let ports;
        try {
            ports = await getOpenPorts(agentName, protocol);
        } catch (err) {
            // ✅ Show error embed instead of plain text
            return await interaction.editReply({ embeds: [buildErrorEmbed()] });
        }

        if (!ports.length) {
            return await interaction.editReply(`✅ No open ports found on \`${agentName}\``);
        }

        const totalPages = Math.ceil(ports.length / PORTS_PER_PAGE);
        let page = 0;

        const message = await interaction.editReply({
            embeds: [buildEmbed(agentName, protocol, ports, page, totalPages)],
            components: totalPages > 1 ? [buildButtons(page, totalPages)] : []
        });

        if (totalPages === 1) return;

        const collector = message.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 5 * 60 * 1000
        });

        collector.on('collect', async i => {
            if      (i.customId === 'ports_first') page = 0;
            else if (i.customId === 'ports_prev')  page = Math.max(0, page - 1);
            else if (i.customId === 'ports_next')  page = Math.min(totalPages - 1, page + 1);
            else if (i.customId === 'ports_last')  page = totalPages - 1;

            await i.update({
                embeds: [buildEmbed(agentName, protocol, ports, page, totalPages)],
                components: [buildButtons(page, totalPages)]
            });
        });

        collector.on('end', async () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ports_first').setLabel('⏮').setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('ports_prev').setLabel('◀').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('ports_page').setLabel(`${page + 1} / ${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('ports_next').setLabel('▶').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('ports_last').setLabel('⏭').setStyle(ButtonStyle.Secondary).setDisabled(true),
            );
            await interaction.editReply({ components: [disabledRow] }).catch(() => {});
        });
    }
};