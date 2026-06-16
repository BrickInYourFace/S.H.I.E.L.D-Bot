const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
} = require('discord.js');

const commands = [
    { label: '/about', customId: 'cmd_about', emoji: '🛡️', description: 'Displays information about S.H.I.E.L.D-Bot and its purpose.' },
    { label: '/complaints', customId: 'cmd_complaints', emoji: '📝', description: 'Opens a form to submit complaints and suggestions.', },
    { label: '/agents', customId: 'cmd_agents', emoji: '🕵️', description: 'List all agents.' },
    { label: '/status', customId: 'cmd_status', emoji: '📡', description: 'Manager service status.' },
    { label: '/agent', customId: 'cmd_agent', emoji: '👤', description: 'Detailed agent info.' },
    { label: '/cve', customId: 'cmd_cve', emoji: '🛑', description: 'Search for a CVE by ID.' },
    { label: '/virustotal URL', customId: 'cmd_vt', emoji: '🦠', description: 'Scan using VirusTotal.' },
    { label: '/toprules', customId: 'cmd_toprules', emoji: '📊', description: 'Show the most frequently triggered Wazuh rules.' },
    { label: '/hunt', customId: 'cmd_hunt', emoji: '🏹', description: 'Search alerts by keyword, IP, or username.' },
    { label: '/port', customId: 'cmd_ports', emoji: '🔌', description: 'Show open ports on a Wazuh agent.' },
    { label: '/search', customId: 'cmd_search', emoji: '🔎', description: 'Fetch all alerts triggered by a specific Wazuh rule ID.' },
    { label: '/vulnerabilities', customId: 'cmd_vulns', emoji: '🛡️', description: 'Show vulnerabilities detected on an agent.' },




];
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

    cooldown: 0, // no cooldown — buttons expire on their own after 15 minutes

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
            .setFooter({ text: 'S.H.I.E.L.D-Bot • Buttons expire in 15 minutes' });

        await interaction.reply({
            embeds: [helpEmbed],
            components: buildButtonRows(commands), // .slice(0, 12)button number in help cmd 
            flags: MessageFlags.Ephemeral,
        });

        // Disable all buttons after 15 minutes
        setTimeout(async () => {
            const disabledRows = buildButtonRows(commands).map(row => {
                row.components.forEach(btn => btn.setDisabled(true));
                return row;
            });

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
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
                        .setFooter({ text: 'S.H.I.E.L.D-Bot • Buttons have expired — run /help again' }),
                ],
                components: disabledRows,
            }).catch(() => { }); // silently ignore if message was dismissed
        }, 15 * 60 * 1000);
    },
};