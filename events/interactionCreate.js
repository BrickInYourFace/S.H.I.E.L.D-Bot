const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {

        // Handle autocomplete
        if (interaction.isAutocomplete()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command?.autocomplete) return;
            try {
                if (interaction.responded) return;
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Autocomplete timeout')), 4500)
                );
                await Promise.race([
                    command.autocomplete(interaction),
                    timeoutPromise
                ]);
            } catch (err) {
                if (err.message === 'Autocomplete timeout') {
                    console.warn(`⚠️ Autocomplete timed out for ${interaction.commandName}`);
                } else if (err.code === 10062) {
                    console.warn(`⚠️ Autocomplete interaction expired for ${interaction.commandName}`);
                } else {
                    console.error('Autocomplete error:', err);
                }
            }
            return;
        }
        //  leen testing help command with button 
        if (interaction.isButton()) {
            const commandMap = {
                cmd_about: 'about',
                cmd_complaints: 'complaints',
                cmd_agents: 'agents',
                cmd_alerts: 'alerts',
                cmd_status: 'status',
                cmd_agent: 'agent',
                cmd_toprules: 'toprules',
                cmd_vulns: 'vulns',
            };
            const commandName = commandMap[interaction.customId];
            if (!commandName) return;

            const command = interaction.client.commands.get(commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Button error for /${commandName}:`, error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: '❌ Something went wrong.', ephemeral: true });
                } else {
                    await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true });
                }
            }
            return; // ← important, stops it falling into the slash command handler below
        }
        ///------------------------------------------

        // ✅ Handle modal submissions — must be BEFORE the isChatInputCommand() return
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'complaints') {
                const complaints = interaction.client.commands.get('complaints');
                if (complaints?.modalHandler) {
                    await complaints.modalHandler(interaction);
                }
            }
            return;
        }

        // Handle slash commands
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;

        const { cooldowns } = interaction.client;
        if (!cooldowns.has(command.data.name)) {
            cooldowns.set(command.data.name, new Map());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(command.data.name);
        const defaultCooldown = 3;
        const cooldownAmount = (command.cooldown ?? defaultCooldown) * 1000;

        if (timestamps.has(interaction.user.id)) {
            const expiration = timestamps.get(interaction.user.id) + cooldownAmount;
            if (now < expiration) {
                const remaining = ((expiration - now) / 1000).toFixed(1);
                return interaction.reply({
                    content: `⏳ Please wait ${remaining}s before using \`${command.data.name}\` again.`,
                    ephemeral: true
                });
            }
        }

        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            const msg = { content: '❌ There was an error executing this command.', ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(msg);
            } else {
                await interaction.reply(msg);
            }
        }
    }
};