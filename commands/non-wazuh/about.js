const { EmbedBuilder, SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');

// 1. Create the attachment. 
// Ensure 'shieldbot-img.png' is in your project folder!
const wallpaper = new AttachmentBuilder('./shieldbot-img.png', { name: 'banner.png' });

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName("about")
        .setDescription("About SHIELD-BOT"),

    async execute(interaction) {
        const aboutEmbed = new EmbedBuilder()
            .setAuthor({ name: 'Developed By The S.H.I.E.L.D Team' })
            .setTitle('🛡️ About S.H.I.E.L.D-BOT')
            .setDescription('Security Highlights for Information & Events Logging Discord-Bot.')
            .setColor('#6B52ED')
            // This puts the image at the bottom of the embed content
            .setImage('attachment://banner.png')
            .addFields(
                {
                    name: '🛡️ OverView',
                    value: 'An innovative integration between the **Wazuh SIEM platform** and Discord. It provides a customized Security Information & Events Management solution for real-time monitoring.'
                },
                {
                    name: '🚀 Core Capabilities',
                    value: '• Real-time security alerts on Mobile/Desktop.\n' +
                        '• Admin configuration via **Slash Commands**.\n' +
                        '• 24/7 fully operational deployment.'
                },
                {
                    name: '🎓 Developer Information',
                    value: '**Lead Developer:** Leen Madadha\n' +
                        '**Institution:** Mutah University\n' +
                        '**Project Status:** Senior Project (Final Phase)'
                }
            )
            .setFooter({ text: 'S.H.I.E.L.D-Bot | Senior Project 2026' })
            .setTimestamp();

        await interaction.reply({
            embeds: [aboutEmbed],
            files: [wallpaper] // You MUST include the file here for the attachment link to work
        });
    },
};