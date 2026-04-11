# S.H.I.E.L.D Bot — Wazuh Discord Bot

## Setup Instructions

## Prerequisites
- [Node.js 16+](https://nodejs.org/en/download)
- A Discord bot token ([guide](https://discord.com/developers/applications))
- A Wazuh server (v4.8+) reachable from the bot machine via Tailscale, static LAN IP, or public IP
- Ports 55000 and 9200 open and accessible on the Wazuh server
- A VirusTotal API key (free at [virustotal.com](https://www.virustotal.com))

### Installation
1. Clone the repository (git clone https://github.com/brickinyourface/S.H.I.E.L.D-Bot, cd S.H.I.E.L.D-Bot (or whatever directory you want))
2. Run the script (setup.bat)
3. Open the `.env` file and fill in your values (notepad .env)
4. Start the bot (start.bat)

---

## Environment Variables

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Your Discord bot token |
| `CLIENT_ID` | Your Discord application ID |
| `GUILD_ID` | Your Discord server ID |
| `ALERT_CHANNEL_ID` | Channel ID for Wazuh alert notifications |
| `ALERT_MENTION_ID` | Your Discord user ID to mention on alerts |
| `WAZUH_IP` | Your Wazuh server Tailscale IP |
| `WAZUH_USER` | Wazuh API user (default: wazuh-wui) |
| `WAZUH_PASS` | Wazuh API password |
| `WAZUH_INDEXER_USER` | Wazuh indexer user (default: admin) |
| `WAZUH_INDEXER_PASS` | Wazuh indexer password |
| `VT_API_KEY` | VirusTotal API key |
| `POLLER_LEVEL` | Minimum alert level for notifications (default: 10) |
| `POLLER_INTERVAL` | Polling interval in seconds (default: 30) |

---

## Commands

| Command | Description |
|---|---|
| `/agents` | List all Wazuh agents and their status |
| `/alerts` | Recent security alerts with level filter |
| `/agent` | Detailed info about a specific agent |
| `/status` | Wazuh manager service status |
| `/toprules` | Most frequently triggered rules |
| `/vulnerabilities` | Vulnerabilities detected on an agent |
| `/ports` | Open ports on an agent |
| `/hunt` | Search alerts by keyword, IP, or username |
| `/virustotal url` | Scan a URL with VirusTotal |
| `/virustotal hash` | Scan a file hash with VirusTotal |
| `/virustotal file` | Scan a file attachment with VirusTotal |


---

## Auto Notifications
The bot automatically posts to your alert channel when:
- 🚨 New Wazuh alert above your configured level is detected
- 📊 Daily security summary posted every 24 hours