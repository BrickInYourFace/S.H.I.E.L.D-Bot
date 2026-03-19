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
                    name: ' /databasetest',
                    value: 'Tests the database connection and  system integrity.',
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