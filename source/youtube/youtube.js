const { Client, Util, RichEmbed } = require('discord.js');
const ytdl = require('ytdl-core');
const keys = require('../keys');
const queue = require('./queue');
const f = require('../functions');
const embed = new RichEmbed();

function play(guild, song) {
        const serverQueue = queue.get(guild.id);
    
        if(!song){
            serverQueue.voiceChannel.leave();
            queue.delete(guild.id);
            return;
        }
    
        const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
            .on('end', reason => {
                if(reason === 'Stream is not generating quickly enough.') console.log('song ended');
                else console.log(reason);
                serverQueue.songs.shift();
                play(guild, serverQueue.songs[0]);
            })
            .on('error', error => console.error(error));
        dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
        serverQueue.textChannel.send('', embed
        .setColor(f.color())
        .setDescription(`:white_check_mark: pepeJAM Playing now: **${song.title}** pepeJAMMER`)
        );
}

module.exports = {
    addToQueue: async function (video, message, voiceChannel, playlist = false) {
        const serverQueue = queue.get(message.guild.id);
        const song = {
            id: video.id,
            title: Util.escapeMarkdown(video.title),
            url: `https://www.youtube.com/watch?v=${video.id}`
        };
        if(!serverQueue){
            const newQueue = {
                textChannel: message.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                volume: 5,
                playing: true
            };
            queue.set(message.guild.id, newQueue);
    
            newQueue.songs.push(song);
    
            try {
                var connection = await voiceChannel.join();
                newQueue.connection = connection;
                play(message.guild, newQueue.songs[0]);
            } catch (error) {
                console.error(`Could not connect to the vChannel ${error}`);
                queue.delete(message.guild.id);
                return message.channel.send(`Could not connect to the vChannel ${error}`);
            }
        } else {
            serverQueue.songs.push(song);
            if(playlist) return undefined;
            return message.channel.send('', embed
            .setColor(f.color())
            .setDescription(`:musical_note: **${song.title}** has been added to the queue.`)
            );
        }
        return undefined;
    }
}
