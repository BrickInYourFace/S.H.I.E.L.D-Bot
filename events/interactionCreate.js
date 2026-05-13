const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {

        // ── Autocomplete ────────────────────────────────────────────────
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

        // ── Button handler ──────────────────────────────────────────────
        if (interaction.isButton()) {
            // CVE button → open modal
            if (interaction.customId === 'cmd_cve') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_cve')
                    .setTitle('Search CVE');

                const cveInput = new TextInputBuilder()
                    .setCustomId('cve_id_input')
                    .setLabel('Enter CVE ID')
                    .setPlaceholder('e.g. CVE-2021-44228')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(cveInput)
                );

                await interaction.showModal(modal);
                return;
            }

            // Alerts button → call fetchAlerts directly (has no options)
            if (interaction.customId === 'cmd_alerts') {
                const command = interaction.client.commands.get('alerts');
                if (!command) return;
                try {
                    await command.fetchAlerts(interaction);
                } catch (error) {
                    console.error('Button error for /alerts:', error);
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: '❌ Something went wrong.', ephemeral: true });
                    } else {
                        await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true });
                    }
                }

                return;
            }

            // Agent button → open modal
            if (interaction.customId === 'cmd_agent') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_agent')
                    .setTitle('Agent Lookup');

                const agentInput = new TextInputBuilder()
                    .setCustomId('agent_name_input')
                    .setLabel('Enter Agent Name')
                    .setPlaceholder('e.g. ubuntu-server')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(agentInput)
                );

                await interaction.showModal(modal);
                return;
            }
            // VT button → open modal
            if (interaction.customId === 'cmd_vt') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_vt')
                    .setTitle('VirusTotal URL Scan');

                const typeInput = new TextInputBuilder()
                    .setCustomId('vt_type_input')
                    .setLabel('Scan Type (url)')
                    .setPlaceholder('url')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const targetInput = new TextInputBuilder()
                    .setCustomId('vt_target_input')
                    .setLabel('Target (URL)')
                    .setPlaceholder('e.g. https://example.com ')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(typeInput),
                    new ActionRowBuilder().addComponents(targetInput),
                );

                await interaction.showModal(modal);
                return;
            }
            // All other buttons → run their matching command
            const commandMap = {
                cmd_about: 'about',
                cmd_complaints: 'complaints',
                cmd_agents: 'agents',
                cmd_status: 'status',
                cmd_agent: 'agent',


                //  cmd_toprules: 'toprules',
                // cmd_vulns: 'vulns',
                // cmd_vt excluded — handled above
                // cmd_alerts excluded — handled above
                // cmd_cve excluded — handled above via modal
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
            return;
        }

        // ── Modal submit handler ────────────────────────────────────────
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'complaints') {
                const complaints = interaction.client.commands.get('complaints');
                if (complaints?.modalHandler) {
                    await complaints.modalHandler(interaction);
                }
            }
            if (interaction.customId === 'modal_cve') {
                const cveId = interaction.fields.getTextInputValue('cve_id_input');
                const command = interaction.client.commands.get('cve');
                if (!command) return;

                try {
                    interaction.options = {
                        getString: (key) => key === 'id' ? cveId : null,
                    };
                    // Defer first so cve.js's interaction.reply() becomes a no-op effectively
                    await interaction.deferReply({ ephemeral: true });
                    // Now override reply to editReply since we already deferred
                    interaction.reply = (opts) => interaction.editReply(opts);
                    await command.execute(interaction);
                } catch (error) {
                    console.error('Modal CVE error:', error);
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: '❌ Something went wrong.', ephemeral: true });
                    } else {
                        await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true });
                    }
                }
            }

            if (interaction.customId === 'modal_agent') {
                const agentName = interaction.fields.getTextInputValue('agent_name_input');
                const command = interaction.client.commands.get('agent');
                if (!command) return;

                try {
                    interaction.options = {
                        getString: (key) => key === 'name' ? agentName : null,
                    };
                    // agent.js calls deferReply() then editReply()
                    // so we defer first and override deferReply to avoid double-defer
                    await interaction.deferReply({ ephemeral: true });
                    interaction.deferReply = () => Promise.resolve(); // no-op so agent.js's deferReply is skipped
                    await command.execute(interaction);
                } catch (error) {
                    console.error('Modal agent error:', error);
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: '❌ Something went wrong.', ephemeral: true });
                    } else {
                        await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true });
                    }
                }
            }
            /*  if (interaction.customId === 'modal_vt_url') {
                  // Only one input needed: the URL to scan
                  const urlTarget = interaction.fields.getTextInputValue('vt_url_input').trim();
                  const command = interaction.client.commands.get('virustotal');
  
                  if (!command) return;
  
                  try {
                      // Hardcode the options to mimic a "url" subcommand
                      interaction.options = {
                          getSubcommand: () => 'url',
                          getString: (key) => {
                              // Usually the parameter in the command is named 'url' or 'target'
                              if (key === 'url' || key === 'target') return urlTarget;
                              return null;
                          },
                          // Attachment not needed for URL scan
                          getAttachment: () => null,
                      };
  
                      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  
                      // Prevent double-deferring in the actual command file
                      interaction.deferReply = () => Promise.resolve();
  
                      await command.execute(interaction);
                  } catch (error) {
                      console.error('Modal URL Scan Error:', error);
                      const errorMsg = { content: '❌ Failed to initiate URL scan.', flags: MessageFlags.Ephemeral };
  
                      if (interaction.replied || interaction.deferred) {
                          await interaction.followUp(errorMsg);
                      } else {
                          await interaction.reply(errorMsg);
                      }
                  }
              }*/

            if (interaction.customId === 'modal_vt') {
                const scanType = interaction.fields.getTextInputValue('vt_type_input').toLowerCase().trim();
                const target = interaction.fields.getTextInputValue('vt_target_input').trim();
                const command = interaction.client.commands.get('virustotal');
                if (!command) return;

                try {
                    interaction.options = {
                        getSubcommand: () => scanType === 'hash' ? 'hash' : scanType === 'file' ? 'file' : 'url',
                        getString: (key) => (key === 'target' || key === 'hash') ? target : null,
                        getAttachment: () => ({ url: target, name: 'scanned-file', size: 0 }),
                    };
                    await interaction.deferReply({ ephemeral: true });
                    interaction.deferReply = () => Promise.resolve();
                    await command.execute(interaction);
                } catch (error) {
                    console.error('Modal VT error:', error);
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: '❌ Something went wrong.', ephemeral: true });
                    } else {
                        await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true });
                    }
                }
            }
            return;
        }

        // ── Slash command handler ───────────────────────────────────────
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