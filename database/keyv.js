 //code for keyv initialization and to be used in index.js and other commandsconst Keyv = require('keyv');
const path =  require('path')
const Keyv = require('keyv').default;
const KeyvSqlite = require('@keyv/sqlite').default;
const dbPath = path.join(__dirname, '..', 'shieldbot.sqlite');

//multiple table set up through namespaces
const createStore = (namespace) => //we will create a new table for each type of key we want to store
  new Keyv({
    namespace,
    store: new KeyvSqlite({ uri: `sqlite://${dbPath}` })
});

/*
//error handling
keyv.on('error', err => {
    console.error('Keyv error:', err);
});
*/

module.exports = {
  uses: createStore('uses'), //test uses table for databasetest.js
  //threats: createStore('threats')
};

/* old single table set up
//create "store" == "table"
const keyv = new Keyv({ //this function creates a new table to the database specified
    store: new KeyvSqlite({ uri: `sqlite://${dbPath}` })
});

//module.exports = keyv; //keyv is the table name*/