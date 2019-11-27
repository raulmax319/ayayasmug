//const { Client, Util, RichEmbed } = require('discord.js');

//const client = new Client();

module.exports = {
    color: () => {
        let hex = `0x${'0123456789abcdef'.split('').map(function (v, i, a) {
            return i > 5 ? null : a[Math.floor(Math.random() * 16)];
        }).join('')}`;
        return hex;
    },
//    findEmoji: (emote) => {
//        return client.emojis.find(emoji => emoji.name === `${emote}`);
//    }
}