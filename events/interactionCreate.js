const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { isWazuhDown } = require('../utilities/wazuh');

// ── Wazuh-aware error reply helper ─────────────────────────────────────────────
// Detects whether the error is a Wazuh connectivity issue and replies accordingly.
async function handleError(interaction, error, context = '') {
    if (context) console.error(`Error in ${context}:`, error);
    else console.error(error);

    const embed = isWazuhDown(error)
        ? {
            color: 0xff4500,
            title: '🔴 Wazuh Server Unavailable',
            description: 'The Wazuh server is currently **offline or unreachable**.\nPlease try again later or contact your administrator.',
            footer: { text: 'S.H.I.E.L.D BOT • Wazuh Integration' },
            timestamp: new Date().toISOString()
        }
        : {
            color: 0xff0000,
            title: '❌ Something went wrong',
            description: `\`${error.message}\``,
            footer: { text: 'S.H.I.E.L.D BOT' },
            timestamp: new Date().toISOString()
        };

    const payload = { embeds: [embed], ephemeral: true };

    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(payload);
        } else {
            await interaction.reply(payload);
        }
    } catch (replyErr) {
        console.error('Failed to send error reply:', replyErr);
    }
}

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
                } else if (isWazuhDown(err)) {
                    console.warn(`⚠️ Wazuh server down during autocomplete for ${interaction.commandName}`);
                    // Autocomplete can't show embeds — return empty list silently
                    try { await interaction.respond([]); } catch (_) {}
                } else {
                    console.error('Autocomplete error:', err);
                    try { await interaction.respond([]); } catch (_) {}
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

                modal.addComponents(new ActionRowBuilder().addComponents(cveInput));
                await interaction.showModal(modal);
                return;
            }

            // Alerts button → call fetchAlerts directly
            if (interaction.customId === 'cmd_alerts') {
                const command = interaction.client.commands.get('alerts');
                if (!command) return;
                try {
                    await command.fetchAlerts(interaction);
                } catch (error) {
                    await handleError(interaction, error, '/alerts button');
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

                modal.addComponents(new ActionRowBuilder().addComponents(agentInput));
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
                    .setPlaceholder('e.g. https://example.com')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(typeInput),
                    new ActionRowBuilder().addComponents(targetInput),
                );
                await interaction.showModal(modal);
                return;
            }

            // Toprules button → call directly with defaults
            if (interaction.customId === 'cmd_toprules') {
                const command = interaction.client.commands.get('toprules');
                if (!command) return;
                try {
                    interaction.options = { getInteger: () => 5 };
                    await interaction.deferReply({ ephemeral: true });
                    interaction.deferReply = () => Promise.resolve();
                    await command.execute(interaction);
                } catch (error) {
                    await handleError(interaction, error, '/toprules button');
                }
                return;
            }

            // Hunt button → open modal
            if (interaction.customId === 'cmd_hunt') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_hunt')
                    .setTitle('Threat Hunt');

                const queryInput = new TextInputBuilder()
                    .setCustomId('hunt_query_input')
                    .setLabel('Search Query')
                    .setPlaceholder('e.g. 192.168.1.100 or administrator or powershell')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(queryInput));
                await interaction.showModal(modal);
                return;
            }

            // Ports button → open modal
            if (interaction.customId === 'cmd_ports') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_ports')
                    .setTitle('Open Ports Lookup');

                const agentInput = new TextInputBuilder()
                    .setCustomId('ports_agent_input')
                    .setLabel('Agent Name')
                    .setPlaceholder('e.g. ubuntu-server')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const protocolInput = new TextInputBuilder()
                    .setCustomId('ports_protocol_input')
                    .setLabel('Protocol (tcp / udp / both)')
                    .setPlaceholder('both')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(agentInput),
                    new ActionRowBuilder().addComponents(protocolInput),
                );
                await interaction.showModal(modal);
                return;
            }

            // Search button → open modal
            if (interaction.customId === 'cmd_search') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_search')
                    .setTitle('Search by Rule ID');

                const ruleInput = new TextInputBuilder()
                    .setCustomId('search_rule_input')
                    .setLabel('Rule ID')
                    .setPlaceholder('e.g. 5710')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const limitInput = new TextInputBuilder()
                    .setCustomId('search_limit_input')
                    .setLabel('Limit (1-10, default 5)')
                    .setPlaceholder('5')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(ruleInput),
                    new ActionRowBuilder().addComponents(limitInput),
                );
                await interaction.showModal(modal);
                return;
            }

            // Vulnerabilities button → open modal
            if (interaction.customId === 'cmd_vulns') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_vulns')
                    .setTitle('Vulnerability Scan');

                const agentInput = new TextInputBuilder()
                    .setCustomId('vulns_agent_input')
                    .setLabel('Agent Name')
                    .setPlaceholder('e.g. ubuntu-server')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const severityInput = new TextInputBuilder()
                    .setCustomId('vulns_severity_input')
                    .setLabel('Severity (Critical / High / Medium / Low)')
                    .setPlaceholder('leave empty for all')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(agentInput),
                    new ActionRowBuilder().addComponents(severityInput),
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
            };

            const commandName = commandMap[interaction.customId];
            if (!commandName) return;

            const command = interaction.client.commands.get(commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                await handleError(interaction, error, `/${commandName} button`);
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
                    await interaction.deferReply({ ephemeral: true });
                    interaction.reply = (opts) => interaction.editReply(opts);
                    await command.execute(interaction);
                } catch (error) {
                    await handleError(interaction, error, 'modal_cve');
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
                    await interaction.deferReply({ ephemeral: true });
                    interaction.deferReply = () => Promise.resolve();
                    await command.execute(interaction);
                } catch (error) {
                    await handleError(interaction, error, 'modal_agent');
                }
            }

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
                    await handleError(interaction, error, 'modal_vt');
                }
            }

            if (interaction.customId === 'modal_hunt') {
                const query = interaction.fields.getTextInputValue('hunt_query_input').trim();
                const command = interaction.client.commands.get('hunt');
                if (!command) return;
                try {
                    interaction.options = {
                        getString: (key) => key === 'query' ? query : null,
                        getInteger: () => 5,
                    };
                    await interaction.deferReply({ ephemeral: true });
                    interaction.deferReply = () => Promise.resolve();
                    await command.execute(interaction);
                } catch (error) {
                    await handleError(interaction, error, 'modal_hunt');
                }
            }

            if (interaction.customId === 'modal_ports') {
                const agentName = interaction.fields.getTextInputValue('ports_agent_input').trim();
                const protocol = interaction.fields.getTextInputValue('ports_protocol_input').trim().toLowerCase() || 'both';
                const command = interaction.client.commands.get('ports');
                if (!command) return;
                try {
                    interaction.options = {
                        getString: (key) => {
                            if (key === 'agent') return agentName;
                            if (key === 'protocol') return protocol;
                            return null;
                        },
                    };
                    await interaction.deferReply({ ephemeral: true });
                    interaction.deferReply = () => Promise.resolve();
                    await command.execute(interaction);
                } catch (error) {
                    await handleError(interaction, error, 'modal_ports');
                }
            }

            if (interaction.customId === 'modal_search') {
                const ruleId = interaction.fields.getTextInputValue('search_rule_input').trim();
                const limitRaw = interaction.fields.getTextInputValue('search_limit_input').trim();
                const limit = parseInt(limitRaw) || 5;
                const command = interaction.client.commands.get('search');
                if (!command) return;
                try {
                    interaction.options = {
                        getString: (key) => key === 'rule_id' ? ruleId : null,
                        getInteger: (key) => key === 'limit' ? limit : null,
                    };
                    await interaction.deferReply({ ephemeral: true });
                    interaction.deferReply = () => Promise.resolve();
                    await command.execute(interaction);
                } catch (error) {
                    await handleError(interaction, error, 'modal_search');
                }
            }

            if (interaction.customId === 'modal_vulns') {
                const agentName = interaction.fields.getTextInputValue('vulns_agent_input').trim();
                const severityRaw = interaction.fields.getTextInputValue('vulns_severity_input').trim();
                const validSevs = ['Critical', 'High', 'Medium', 'Low'];
                const severity = validSevs.find(s => s.toLowerCase() === severityRaw.toLowerCase()) ?? null;
                const command = interaction.client.commands.get('vulnerabilities');
                if (!command) return;
                try {
                    interaction.options = {
                        getString: (key) => {
                            if (key === 'agent') return agentName;
                            if (key === 'severity') return severity;
                            return null;
                        },
                    };
                    await interaction.deferReply({ ephemeral: true });
                    interaction.deferReply = () => Promise.resolve();
                    await command.execute(interaction);
                } catch (error) {
                    await handleError(interaction, error, 'modal_vulns');
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
            await handleError(interaction, error, `/${interaction.commandName} slash command`);
        }
    }
};