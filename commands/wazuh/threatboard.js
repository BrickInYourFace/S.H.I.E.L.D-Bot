 const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
        const { getAgents, getAlertCountsPerAgent } = require('../../utilities/wazuh');
         const path = require('path');
        
         // Danger score: weight critical alerts heavily, high alerts moderately
         function dangerScore(counts) {
             return counts.critical * 10 + counts.high * 2 + counts.total * 0.1;
         }
        
        function dangerLabel(counts) {
            if (counts.critical >= 10) return '🔴 Critical';
            if (counts.critical >= 1)  return '🟠 High';
            if (counts.high >= 5)      return '🟡 Medium';
            if (counts.total > 0)      return '🔵 Low';
            return '🟢 Clean';
        }
       
        // Try to match an agent hostname to a guild member's display name or username
        function findMember(members, agentName) {
            const name = agentName.toLowerCase();
            return members.find(m =>
                m.displayName.toLowerCase().includes(name) ||
                m.user.username.toLowerCase().includes(name) ||
                name.includes(m.displayName.toLowerCase()) ||
                name.includes(m.user.username.toLowerCase())
            ) ?? null;
        }
       
        module.exports = {
            data: new SlashCommandBuilder()
                .setName('threatboard')
                .setDescription('Rank all Wazuh agents by alert danger and match to Discord members')
          ,
       
            async execute(interaction) {
                await interaction.deferReply();
       
                try {
                    const [agents, alertCounts] = await Promise.all([
      getAgents(),
      getAlertCountsPerAgent()
  ]);
  const memberCollection = interaction.guild.members.cache;
       
                    const members = [...memberCollection.values()].filter(m => !m.user.bot);
       
                   // Build a lookup map: agentName -> alert counts
                    const countMap = new Map(alertCounts.map(c => [c.agentName.toLowerCase(), c]));
       
                    // Merge agent list with alert counts
                    const rows = agents
                        .filter(a => a.id !== '000') // skip the Wazuh manager itself
                        .map(agent => {
                            const counts = countMap.get(agent.name.toLowerCase()) ?? {
                                agentName: agent.name,
                                total: 0,
                                critical: 0,
                                high: 0,
                                maxLevel: 0
                            };
                            const member = findMember(members, agent.name);
                            return { agent, counts, member };
                        })
                        .sort((a, b) => dangerScore(b.counts) - dangerScore(a.counts));
       
                    const file = new AttachmentBuilder(
                        path.join(__dirname, '../../S.H.I.E.L.D-Bot-deep-in-thought.png')
                    );
       
                    const medals = ['🥇', '🥈', '🥉'];
       
                    const fields = rows.map((row, i) => {
                        const { agent, counts, member } = row;
                        const rank = medals[i] ?? `${i + 1}.`;
                        const userTag = member ? `<@${member.id}>` : `\`${agent.name}\` *(no Discord
          match)*`;
                        const status = agent.status === 'active' ? '✅ Online' : '❌ Offline';
                        const label = dangerLabel(counts);
       
                        return {
                            name: `${rank} ${agent.name}`,
                            value: [
                                `**User:** ${userTag}`,
                                `**Status:** ${status}`,
                                `**Danger:** ${label}`,
                                `**Critical Alerts:** \`${counts.critical}\`  |  **High:** \`${counts
          .high}\`  |  **Total:** \`${counts.total}\``,
                            ].join('\n'),
                            inline: false
                        };
                    });
       
                    const topRow = rows[0];
                    const worstName = topRow ? topRow.agent.name : 'N/A';
                    const worstUser = topRow?.member ? `<@${topRow.member.id}>` : `\`${worstName}\``;
       
                    const embed = new EmbedBuilder()
                        .setTitle('🛡️ S.H.I.E.L.D Threat Board')
                        .setDescription(`Agents ranked by alert severity. Most at risk: ${worstUser}`
          )
                        .setColor(topRow && topRow.counts.critical > 0 ? 0xFF0000 : 0x800080)
                        .addFields(fields)
                        .setThumbnail('attachment://S.H.I.E.L.D-Bot-deep-in-thought.png')
                       .setFooter({ text: `${rows.length} agent(s) scanned • ${members.length} Disco
          rd member(s)` })
                       .setTimestamp();
      
                   await interaction.editReply({ embeds: [embed], files: [file] });
      
               } catch (err) {
                   await interaction.editReply({
                       content: `❌ Error building threat board: ${err.message}`
                   });
               }
           }
       };
