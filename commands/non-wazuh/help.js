const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    InteractionType
} = require('discord.js');

// Command definitions: label, customId, emoji, description
const commands = [
    { label: '/about', customId: 'cmd_about', emoji: '🛡️', description: 'Displays information about S.H.I.E.L.D-Bot and its purpose.' },
    { label: '/complaints', customId: 'cmd_complaints', emoji: '📝', description: 'Opens a form to submit complaints and suggestions.' },
    { label: '/agents', customId: 'cmd_agents', emoji: '🕵️', description: 'List all agents.' },
    { label: '/alerts', customId: 'cmd_alerts', emoji: '🚨', description: 'Recent alerts with level filter.' },
    { label: '/status', customId: 'cmd_status', emoji: '📡', description: 'Manager service status.' },
    { label: '/agent', customId: 'cmd_agent', emoji: '👤', description: 'Detailed agent info.' },
    { label: '/toprules', customId: 'cmd_toprules', emoji: '📊', description: 'Most triggered rules.' },
    { label: '/vulns', customId: 'cmd_vulns', emoji: '🔍', description: 'Vulnerability scanning.' },
    { label: '/vt', customId: 'cmd_vt', emoji: '🦠', description: 'VirusTotal integration to test malware in URLs, hashes, and files.' },
];

// Build rows of up to 5 buttons each (Discord limit)
function buildButtonRows(commands) {
    const rows = [];
    for (let i = 0; i < commands.length; i += 5) {
        const chunk = commands.slice(i, i + 5);
        const row = new ActionRowBuilder().addComponents(
            chunk.map(cmd =>
                new ButtonBuilder()
                    .setCustomId(cmd.customId)
                    .setLabel(cmd.label)
                    .setEmoji(cmd.emoji)
                    .setStyle(ButtonStyle.Secondary)
            )
        );
        rows.push(row);
    }
    return rows;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('View all available SHIELD bot commands'),

    async execute(interaction) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x2b2d31)
            .setTitle('🛡️ S.H.I.E.L.D-Bot Help Menu')
            .setDescription(
                '**Welcome to the Help command of S.H.I.E.L.D-Bot<3**\n' +
                'Here you can find all available commands. **Click a button** to run it directly!\n\u200b'
            )
            .addFields(
                commands.map(cmd => ({
                    name: `${cmd.emoji} ${cmd.label}`,
                    value: cmd.description,
                    inline: true,
                }))
            )
            .setFooter({ text: 'S.H.I.E.L.D-Bot • Security & Monitoring System' });

        const rows = buildButtonRows(commands);

        await interaction.reply({
            embeds: [helpEmbed],
            components: rows,
            flags: MessageFlags.Ephemeral,
        });
    },

    // ─────────────────────────────────────────────
    // Button interaction handler
    // Call this from your main interactionCreate event
    // ─────────────────────────────────────────────
    async handleButton(interaction) {
        if (!interaction.isButton()) return;

        const commandMap = {
            cmd_about: 'about',
            cmd_complaints: 'complaints',
            cmd_agents: 'agents',
            cmd_alerts: 'alerts',
            cmd_status: 'status',
            cmd_agent: 'agent',
            cmd_toprules: 'toprules',
            cmd_vulns: 'vulns',
            cmd_vt: 'vt',
        };

        const commandName = commandMap[interaction.customId];
        if (!commandName) return;

        const command = interaction.client.commands.get(commandName);
        if (!command) {
            await interaction.reply({
                content: `❌ Command \`/${commandName}\` not found.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        try {
            // Defer so we have time to execute
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing /${commandName} via button:`, error);
            await interaction.editReply({
                content: `❌ Failed to run \`/${commandName}\`. Please try again.`,
            });
        }
    },
};