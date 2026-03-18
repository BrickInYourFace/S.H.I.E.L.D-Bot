const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, LabelBuilder, TextDisplayBuilder, MessageFlags} = require('discord.js');
const ComplaintsDataBase = require('../../database/keyv');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('complaints')
        .setDescription('Complaints and Suggestions form'),
    async execute(interaction) {
        const modal = new ModalBuilder()
            .setCustomId("complaints")
            .setTitle("Complaints and Suggestions");
        
        //defining a complaints text input component:
        const complaintsInput = new TextInputBuilder()
            .setCustomId("complaintsInput")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Write your complaint here.")
            .setRequired(true);
        
        //then definiting a label for the complaints input
        const complaintsLabel = new LabelBuilder()
            .setLabel("complaints about S.H.I.E.L.D-Bot?")
            .setTextInputComponent(complaintsInput);

        //defining a suggestions text input component:
        const suggestionsInput = new TextInputBuilder()
            .setCustomId("suggestionsInput")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("Write your complaint here.");
        
        //then definiting a label for the suggestions input
        const suggestionsLabel = new LabelBuilder()
            .setLabel("suggestions about S.H.I.E.L.D-Bot?")
            .setTextInputComponent(suggestionsInput);

        const modalIntroduction = new TextDisplayBuilder().setContent(
			'**Welcome to the Complaints and Suggestions Module of S.H.I.E.L.D-Bot!**\nHere your complaints and suggestions will be heard and taken note of, any problems or new ideas you might have are to be put here.',
		);
        
        //now add label components to the modal:
        modal
            .addTextDisplayComponents(modalIntroduction)
            .addLabelComponents(complaintsLabel, suggestionsLabel)
            
        
        await interaction.showModal(modal)
    },
    //handling modals
	async modalHandler(interaction) {
        if (interaction.customId === "complaints") {
            const complaintOutput = interaction.fields.getTextInputValue("complaintsInput");
            const suggestionOutput = interaction.fields.getTextInputValue("suggestionsInput");
            const entry={complaint:`${complaintOutput}`,suggestion:`${suggestionOutput}`}
            const userIdKey = interaction.user.id;
            const count = (await ComplaintsDataBase.uses.get(userIdKey)) ?? 0;
            const key=`${userIdKey}-${count+1}`
            await ComplaintsDataBase.uses.set(key,entry)
            await interaction.reply({
                content: `Your submission was received, ${interaction.user}!`,
                flag: MessageFlags.Ephemeral
            });

            console.log("Complaint:", complaintOutput);
            console.log("Suggestion:", suggestionOutput);
        }
    }
};