require('dotenv').config();
const { validateEnv } = require('./utilities/validateEnv');
validateEnv();

const fs   = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { token } = require('./config');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.cooldowns = new Collection();
client.commands  = new Collection();

// ── Command loading ────────────────────────────────────────────────────────────
const foldersPath   = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command  = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.warn(`[WARNING] ${filePath} is missing "data" or "execute".`);
        }
    }
}

// ── Event loading ──────────────────────────────────────────────────────────────
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event    = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// ── Global crash guards ────────────────────────────────────────────────────────
// These catch any error that slips through all try/catch blocks and would
// otherwise kill the process entirely (which is what was causing the bot shutdown).

process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 Unhandled Promise Rejection:', reason);
    // Do NOT call process.exit() — let the bot keep running
});

process.on('uncaughtException', (err) => {
    console.error('🔥 Uncaught Exception:', err);
    // Do NOT call process.exit() — let the bot keep running
});

// Discord.js client-level error (e.g. websocket issues) — does not crash the bot
// but good to log explicitly
client.on('error', (err) => {
    console.error('🔥 Discord client error:', err);
});

// ── Login ──────────────────────────────────────────────────────────────────────
client.login(token);