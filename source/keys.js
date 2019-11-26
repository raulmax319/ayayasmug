let keys =  {
    prefix,
    token,
    googleAPIkey,
    riotAPIkey,
} = require('../config.json');

keys.token = process.env.token;
keys.googleAPIkey = process.env.googleAPIkey;
keys.riotAPIkey = process.env.riotAPIkey;

module.exports = keys;