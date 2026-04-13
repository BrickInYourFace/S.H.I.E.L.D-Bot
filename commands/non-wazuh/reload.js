const { SlashCommandBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Reloads a command without restarting the bot.')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('The command to reload.')
                .setRequired(true)
                .setAutocomplete(true)),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        const commands = [...interaction.client.commands.values()];
        const choices = commands
            .filter(c => c.data.name.includes(focused))
            .map(c => ({ name: c.data.name, value: c.data.name }))
            .slice(0, 25);
        await interaction.respond(choices);
    },

    async execute(interaction) {
        const commandName = interaction.options.getString('command', true).toLowerCase();
        const command = interaction.client.commands.get(commandName);

        if (!command) {
            return interaction.reply({ content: `❌ No command found with name \`${commandName}\`!`, ephemeral: true });
        }

        // Search for the command file across all subfolders
        const commandsPath = path.join(__dirname, '..');
        let commandFilePath = null;

        const folders = fs.readdirSync(commandsPath);
        for (const folder of folders) {
            const folderPath = path.join(commandsPath, folder);
            if (!fs.statSync(folderPath).isDirectory()) continue;

            const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
            for (const file of files) {
                if (file === `${commandName}.js`) {
                    commandFilePath = path.join(folderPath, file);
                    break;
                }
            }
            if (commandFilePath) break;
        }

        if (!commandFilePath) {
            return interaction.reply({ content: `❌ Could not find file for command \`${commandName}\`!`, ephemeral: true });
        }

        // Delete cache and reload
        delete require.cache[require.resolve(commandFilePath)];

        try {
            const newCommand = require(commandFilePath);
            interaction.client.commands.set(newCommand.data.name, newCommand);
            await interaction.reply({ content: `✅ Command \`${newCommand.data.name}\` was reloaded!`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: `❌ Error reloading \`${commandName}\`:\n\`${error.message}\``, ephemeral: true });
        }
    },
};