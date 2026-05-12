<<<<<<< Updated upstream
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
=======
const { SlashCommandBuilder, EmbedBuilder, MessageFlags, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
// FIXED: Removed invalid `require('react')` — this is a Discord bot, not a React app
>>>>>>> Stashed changes

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('View all available SHIELD bot commands'),

    async execute(interaction) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x2b2d31)
<<<<<<< Updated upstream
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
=======
            .setTitle('S.H.I.E.L.D-Bot Help Menu')
            .setDescription(
                '**Welcome to the Help command of S.H.I.E.L.D-Bot<3**\n' +
                'Here you can find all available commands and their purposes.\n' +
                'Click a button below to run a command directly!'
            )
            .addFields(
                { name: '/about', value: 'Displays information about S.H.I.E.L.D-Bot and its purpose.' },
                { name: '/complaints', value: 'Opens a form to submit complaints and suggestions.' },
                { name: '/agents', value: 'List all agents.' },
                { name: '/alerts', value: 'Recent alerts with level filter.' },
                { name: '/status', value: 'Manager service status.' },
                { name: '/agent', value: 'Detailed agent info.' },
                { name: '/toprules', value: 'Most triggered rules.' },
                { name: '/vulns', value: 'Vulnerability scanning.' },
                { name: '/vt', value: 'VirusTotal integration for URLs, hashes, and files.' }
            )
            .setFooter({ text: 'S.H.I.E.L.D-Bot • Security & Monitoring System' });
>>>>>>> Stashed changes

        // FIXED: `.setDisabled()` takes a boolean, not a label string — use `.setLabel()` instead
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('cmd_about').setLabel('/about').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('cmd_complaints').setLabel('/complaints').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('cmd_agents').setLabel('/agents').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('cmd_alerts').setLabel('/alerts').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('cmd_status').setLabel('/status').setStyle(ButtonStyle.Primary),
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('cmd_agent').setLabel('/agent').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('cmd_toprules').setLabel('/toprules').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('cmd_vulns').setLabel('/vulns').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('cmd_vt').setLabel('/vt').setStyle(ButtonStyle.Secondary),
        );

        // FIXED: `Components` → `components` (lowercase), and store the reply as `response`
        const response = await interaction.reply({
            embeds: [helpEmbed],
<<<<<<< Updated upstream
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
=======
            components: [row1, row2],
            flags: MessageFlags.Ephemeral
        });

        const collectorFilter = i => i.user.id === interaction.user.id;

        try {
            // FIXED: `response.resource.message` → `response` directly (interaction.reply() returns an InteractionResponse)
            const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });

            // Trigger the matching slash command
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

            const commandName = commandMap[confirmation.customId];
            const command = interaction.client.commands.get(commandName);

            if (!command) {
                await confirmation.update({ content: `Command \`/${commandName}\` not found.`, components: [] });
                return;
            }

            // Defer the update so we can hand off to the command
            await confirmation.update({ content: `Running \`/${commandName}\`...`, components: [] });
            await command.execute(confirmation);

        } catch {
            // FIXED: `interaction.editReply` is correct here for a timed-out collector
            await interaction.editReply({ content: 'No command selected within 1 minute. Cancelled.', components: [] });
>>>>>>> Stashed changes
        }
    },
};