const discord = require('discord.js');
const Util = require('discord.js');

const {
    prefix,
    token,
    googleAPIkey,
    riotAPIkey,
} = require('./config.json');

const ytdl = require('ytdl-core');
const Youtube = require('simple-youtube-api');
const request = require('request');

const client = new discord.Client();
const youtube = new Youtube(googleAPIkey);
let queue = new Map();

let func = {};

func.searchLeagueProfile = (query, cb) => {
    request(`https://br1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(query)}?api_key=${riotAPIkey}`, (err, res, body) => {
        let json = JSON.parse(body);
        cb(json.id);
    });
}
func.getLeagueRank = (id, cb) => {
    request(`https://br1.api.riotgames.com/lol/league/v4/entries/by-summoner/${id}?api_key=${riotAPIkey}`, (err, res, body) => {
        let json = JSON.parse(body);
        cb(json[0]);
    });
}

func.play = (guild, song) => {
    const serverQueue = queue.get(guild.id);

    if(!song){
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }

    const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
        .on('end', reason => {
            if(reason === 'Stream is not generating quickly enough.') console.log('Musica acabou');
            else console.log(reason);
            serverQueue.songs.shift();
            func.play(guild, serverQueue.songs[0]);
        })
        .on('error', error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`pepeJAM Tocando agora: **${song.title}**`);
}
func.puxarVideo = async function (video, message, voiceChannel, playlist = false) {
    const serverQueue = queue.get(message.guild.id);
    console.log(video);
    const song = {
        id: video.id,
        title: Util.escapeMarkdown(video.title),
        url: `https://www.youtube.com/watch?v=${video.id}`
    };
    if(!serverQueue){
        const queueConstruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true
        };
        queue.set(message.guild.id, queueConstruct);

        queueConstruct.songs.push(song);

        try {
            var connection = await voiceChannel.join();
            queueConstruct.connection = connection;
            func.play(message.guild, queueConstruct.songs[0]);
        } catch (error) {
            console.error(`Nao foi possivel conectar vChannel. ${error}`);
            queue.delete(message.guild.id);
            return message.channel.send(`Nao foi possivel conectar ${error}`);
        }
    } else {
        serverQueue.songs.push(song);
        console.log(serverQueue.songs);
        if(playlist) return undefined;
        return message.channel.send(`**${song.title}** foi adicionada a fila pepeOK`);
    }
    return undefined;
}

client.on('ready', (event) => console.log('Conectado'));

client.on('error', console.error);

client.on('disconnect', () => console.log('Desconectado. Tentando reconexao...'));

client.on('reconnecting', () => console.log('Reconectando...'));

client.on('message', async message => {
    const member = message.member;
    const mess = message.content.toLowerCase();
    const comando = message.content.split(' ')[0].replace(prefix, '');
    const args = message.content.split(' ');
    const searchString = args.slice(1).join(' ');
    const serverQueue = queue.get(message.guild.id);
    const fila = '';

    switch(comando.toLowerCase()) {
        case 'play':
            const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
            const voiceChannel = member.voiceChannel;
            if(!voiceChannel) return message.channel.send('Just connect to a voice channel 4Head');
            const permicoes = voiceChannel.permissionsFor(message.client.user);
            if(!permicoes.has('CONNECT')){
                return message.channel.send('Sem permissao pra conectar no voice Channel');
            }
            if(!permicoes.has('SPEAK')){
                return message.channel.send('Sem permissao pra falar no voice Channel');
            }
        
            if(url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)){
                const playlist = await youtube.getPlaylist(url);
                const videos = await playlist.getVideos();
                for (const video of Object.values(videos)) {
                    const video2 = await youtube.getVideoByID(video.id);
                    await func.puxarVideo(video2, message, voiceChannel, true);
                }
                return message.channel.send(`Playlist: **${playlist.title}** foi adicionada a fila`);
            } else {
                try {
                    var video = await youtube.getVideo(url);
                } catch (error) {
                    try {
                        var videos = await youtube.searchVideos(searchString, 1);
                        var video = await youtube.getVideoByID(videos[0].id);
                    } catch (err) {
                        console.error(err);
                        return message.channel.send('Nao achei nda');
                    }
                }
            }
            return func.puxarVideo(video, message, voiceChannel);

        case 'skip':
            if(!message.member.voiceChannel) return message.channel.send('ur not connected to any voice channel');
            if(!serverQueue) return message.channel.send('Nada na fila');
            message.channel.send('Skipou a musica')
            serverQueue.connection.dispatcher.end('skipou');
            return undefined;

        case 'queue':
            if(!serverQueue) return message.channel.send('Nada na fila');
            return message.channel.send(`
        **Fila**
        ${serverQueue.songs.map(song => `**>** ${song.title}`).join('\n')}
        **Tocando agora:** ${serverQueue.songs[0].title}
                `);

        case 'pepega':
            message.reply('Eu n sou Pepega :point_up_2: ele é');

        case 'stop':
            if(!message.member.voiceChannel) return message.channel.send('ur not connected to any voice channel');
            if(!serverQueue) return message.channel.send('Nada na fila');
            serverQueue.songs = [];
            serverQueue.connection.dispatcher.end('Parou a musica');
            return undefined;

        case 'np':
            if(!message.member.voiceChannel) return message.channel.send('ur not connected to any voice channel');
            if(!serverQueue) return message.channel.send('Nada na fila');
            return message.channel.send(`pepeJAM Tocando agora: **${serverQueue.songs[0].title}**`);

        case 'vol':
            if(!message.member.voiceChannel) return message.channel.send('ur not connected to any voice channel');
            if(!args[1]) return message.channel.send(`O volume atual é: **${serverQueue.volume}**`);
            serverQueue.volume = args[1];
            serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
            return message.channel.send(`Volume now is: **${args[1]}**`);

        case 'perfil': // testando apenas
            if(message.author.bot) return undefined;
            func.searchLeagueProfile(searchString, (id) => {
                func.getLeagueRank(id, (objeto) => {
                    message.channel.send(`
Summoner: ${objeto.summonerName}
rank: ${objeto.tier} ${objeto.rank}
winrate: ${(100 * objeto.wins) / (objeto.wins + objeto.losses)}% wins: ${objeto.wins} / losses: ${objeto.losses}
Fila: ${objeto.name}
LP: ${objeto.leaguePoints}
`);
                });
            });
            
            
    }
});


client.login(token);

