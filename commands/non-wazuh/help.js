const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('View all available SHIELD bot commands'),

    async execute(interaction) {

        const helpEmbed = new EmbedBuilder()
            .setColor(0x2b2d31)
            .setTitle(' S.H.I.E.L.D-Bot Help Menu')
            .setDescription(
                '**Welcome to the Help command of S.H.I.E.L.D-Bot<3**\n' +
                'Here you can find all available commands and verifies their purposes.'
            )
            .addFields(
                {
                    name: ' /about',
                    value: 'Displays information about S.H.I.E.L.D-Bot and its purpose.',
                },
                {
                    name: '/complaints',
                    value: 'Opens a form to submit complaints and suggestions.',
                },

                {
                    name: ' /agents',
                    value: 'list all agents.',
                },
                {
                    name: ' /alerts',
                    value: 'recent alerts with level filter.',
                },
                {
                    name: ' /status',
                    value: ' manager service status.',
                },
                {
                    name: ' /agent',
                    value: 'detailed agent info.',
                },
                {
                    name: ' /toprules',
                    value: ' most triggered rules.',
                },
                {
                    name: ' /vulns',
                    value: ' vulnerability scanning.',
                },
                {
                    name: ' /vt url/hash/file',
                    value: ' VirusTotal integration to test malware in urls, hashes, and files.',
                }


            )
            .setFooter({
                text: 'S.H.I.E.L.D-Bot • Security & Monitoring System'
            });

        await interaction.reply({
            embeds: [helpEmbed],
            flags: MessageFlags.Ephemeral
        });
    }
};