function validateEnv() {
    const required = [
        'DISCORD_TOKEN',
        'CLIENT_ID',
        'GUILD_ID',
        'ALERT_CHANNEL_ID',
        'ALERT_MENTION_ID',
        'WAZUH_IP',
        'WAZUH_USER',
        'WAZUH_PASS',
        'WAZUH_INDEXER_USER',
        'WAZUH_INDEXER_PASS',
        'VT_API_KEY'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(key => console.error(`   - ${key}`));
        console.error('\n📄 Please copy .env.example to .env and fill in the values.');
        process.exit(1);
    }

    console.log('✅ Environment variables validated successfully');
}

module.exports = { validateEnv };