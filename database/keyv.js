 //code for keyv initialization and to be used in index.js and other commandsconst Keyv = require('keyv');
const path =  require('path')
const Keyv = require('keyv').default;
const KeyvSqlite = require('@keyv/sqlite').default;
const dbPath = path.join(__dirname, '..', 'shieldbot.sqlite');
const keyv = new Keyv({
    store: new KeyvSqlite({ uri: `sqlite://${dbPath}` })
});

keyv.on('error', err => {
    console.error('Keyv error:', err);
});

module.exports = keyv;