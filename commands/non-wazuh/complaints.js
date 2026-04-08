const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const ComplaintsDataBase = require('../../database/keyv');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('complaints')
        .setDescription('Complaints and Suggestions form'),

    async execute(interaction) {
        const modal = new ModalBuilder()
            .setCustomId("complaints")
            .setTitle("Complaints and Suggestions");

        const complaintsInput = new TextInputBuilder()
            .setCustomId("complaintsInput")
            .setLabel("Complaints about S.H.I.E.L.D-Bot?")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Write your complaint here.")
            .setRequired(true);

        const suggestionsInput = new TextInputBuilder()
            .setCustomId("suggestionsInput")
            .setLabel("Suggestions about S.H.I.E.L.D-Bot?")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("Write your suggestion here.")
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(complaintsInput),
            new ActionRowBuilder().addComponents(suggestionsInput)
        );

        await interaction.showModal(modal);
    },

    async modalHandler(interaction) {
        if (interaction.customId === "complaints") {
            const complaintOutput = interaction.fields.getTextInputValue("complaintsInput");
            // suggestionsInput is optional, so guard against empty value
            const suggestionOutput = interaction.fields.getTextInputValue("suggestionsInput") || null;

            const userIdKey = interaction.user.id;
            const count = (await ComplaintsDataBase.complaints.get(userIdKey)) ?? 0;
            const newCount = count + 1;

            const key = `${userIdKey}-${newCount}`;
            const entry = { complaint: complaintOutput, suggestion: suggestionOutput };

            // Save the entry AND update the count
            await ComplaintsDataBase.complaints.set(key, entry);
            await ComplaintsDataBase.complaints.set(userIdKey, newCount); // ✅ increment counter

            await interaction.reply({
                content: `Your submission was received, ${interaction.user}!`,
                flags: MessageFlags.Ephemeral // ✅ plural
            });

            console.log("Complaint:", complaintOutput);
            console.log("Suggestion:", suggestionOutput);
        }
    }
};