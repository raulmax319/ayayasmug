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
const leaguePatch = '9.14.1';
let queue = new Map();

let func = {};

func.searchLeagueProfile = (query, cb) => {
    request(`https://br1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(query)}?api_key=${riotAPIkey}`, (err, res, body) => {
        let json = JSON.parse(body);
        cb(json);
    });
}
func.getLeagueRank = (id, cb) => {
    request(`https://br1.api.riotgames.com/lol/league/v4/entries/by-summoner/${id}?api_key=${riotAPIkey}`, (err, res, body) => {
        let json = JSON.parse(body);
        cb(json);
    });
}
func.getChampionList = (cb) => {
    request(`http://ddragon.leagueoflegends.com/cdn/${leaguePatch}/data/en_US/champion.json`, (err, res, body) => {
        let json = JSON.parse(body);
        cb(json.data);
    });
}
func.allChampMasteries = (id, cb) => {
    request(`https://br1.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-summoner/${id}?api_key=${riotAPIkey}`, (err, res, body) => {
        let json = JSON.parse(body);
        cb(json);
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
            if(reason === 'Stream is not generating quickly enough.') console.log('song ended');
            else console.log(reason);
            serverQueue.songs.shift();
            func.play(guild, serverQueue.songs[0]);
        })
        .on('error', error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`pepeJAM Playing now: **${song.title}** pepeJAMMER`);
}
func.addToQueue = async function (video, message, voiceChannel, playlist = false) {
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
            console.error(`Could not connect to the vChannel ${error}`);
            queue.delete(message.guild.id);
            return message.channel.send(`Could not connect to the vChannel ${error}`);
        }
    } else {
        serverQueue.songs.push(song);
        console.log(serverQueue.songs);
        if(playlist) return undefined;
        return message.channel.send(`**${song.title}** has been added to the queue pepeOK`);
    }
    return undefined;
}

client.on('ready', (event) => console.log('Connected'));

client.on('error', console.error);

client.on('disconnect', () => console.log('Disconnected. trying reconnection...'));

client.on('reconnecting', () => console.log('Reconnecting...'));

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
                return message.channel.send('No permission to connect to the Voice Channel');
            }
            if(!permicoes.has('SPEAK')){
                return message.channel.send('No permission to speak in the Voice Channel');
            }
        
            if(url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)){
                const playlist = await youtube.getPlaylist(url);
                const videos = await playlist.getVideos();
                for (const video of Object.values(videos)) {
                    const video_ = await youtube.getVideoByID(video.id);
                    await func.addToQueue(video_, message, voiceChannel, true);
                }
                return message.channel.send(`Playlist: **${playlist.title}** has been added to the queue pepeOK`);
            } else {
                try {
                    var video = await youtube.getVideo(url);
                } catch (error) {
                    try {
                        var videos = await youtube.searchVideos(searchString, 1);
                        var video = await youtube.getVideoByID(videos[0].id);
                    } catch (err) {
                        console.error(err);
                        return message.channel.send('Found nothing but leaves :leaves:');
                    }
                }
            }
            return func.addToQueue(video, message, voiceChannel);
            

        case 'skip':
            if(!message.member.voiceChannel) return message.channel.send('Just connect to a voice channel 4Head');
            if(!serverQueue) return message.channel.send('The queue is empty');
            message.channel.send('Song skipped')
            serverQueue.connection.dispatcher.end(`skipped ${serverQueue.songs[0].title}`);
            return undefined;

        case 'queue':
            if(!serverQueue) return message.channel.send('The queue is empty');
            return message.channel.send(`
        **Queue**
        ${serverQueue.songs.map(song => `**>** ${song.title}`).join('\n')}
        **Playing now:** ${serverQueue.songs[0].title}
                `);

        case 'pepega':
            message.reply('I\'m not Pepega :point_down: he is');

        case 'stop':
            if(!message.member.voiceChannel) return message.channel.send('Just connect to a voice channel 4Head');
            if(!serverQueue) return message.channel.send('The queue is empty');
            serverQueue.songs = [];
            serverQueue.connection.dispatcher.end('stopped the song');
            return undefined;

        case 'np':
            if(!message.member.voiceChannel) return message.channel.send('Just connect to a voice channel 4Head');
            if(!serverQueue) return message.channel.send('The queue is empty');
            return message.channel.send(`pepeJAM Playing now: **${serverQueue.songs[0].title}** pepeJAMMER`);

        case 'vol':
            if(!message.member.voiceChannel) return message.channel.send('Just connect to a voice channel 4Head');
            if(!args[1]) return message.channel.send(`Volume: **${serverQueue.volume}**`);
            serverQueue.volume = args[1];
            serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
            return message.channel.send(`Volume now is: **${args[1]}**`);

        case 'lolprofile': // testando apenas
            if(message.author.bot) return undefined;
            func.searchLeagueProfile(searchString, (profileInfo) => {
                console.log(profileInfo.id);
                const icons = `http://ddragon.leagueoflegends.com/cdn/${leaguePatch}/img/profileicon/${profileInfo.profileIconId}.png `;
                func.getLeagueRank(profileInfo.id, (leagueInfo) => {
                    func.allChampMasteries(profileInfo.id, (masteries) => {
                        func.getChampionList((list) => {
                            for(var key in list.data){
                                if(masteries[0].championId == key){
                                    console.log(key);
                                }
                            }

                            let fields = [{
                                name: 'Masteries',
                                value: `1. ${masteries[0].championId}: ${masteries[0].championPoints}
                                        2. ${masteries[1].championId}: ${masteries[1].championPoints}
                                        3. ${masteries[2].championId}: ${masteries[2].championPoints}`,
                                inline: true
                            },
                            {
                                name: 'Level',
                                value: profileInfo.summonerLevel,
                                inline: true
                            }];
                            
                            if(leagueInfo.length == 1){
                                if(leagueInfo[0].queueType === 'RANKED_TFT'){
                                var tft = {
                                        tier: leagueInfo[0].tier,
                                        rank: leagueInfo[0].rank,
                                        lp: leagueInfo[0].leaguePoints,
                                        wins: leagueInfo[0].wins,
                                        losses: leagueInfo[0].losses
                                    };
                                }
                                if(leagueInfo[0].queueType === 'RANKED_SOLO_5x5'){
                                var solo = {
                                        tier: leagueInfo[0].tier,
                                        rank: leagueInfo[0].rank,
                                        lp: leagueInfo[0].leaguePoints,
                                        wins: leagueInfo[0].wins,
                                        losses: leagueInfo[0].losses
                                    };
                                }
                                if(leagueInfo[0].queueType === 'RANKED_FLEX_SR'){
                                    var flex = {
                                        tier: leagueInfo[0].tier,
                                        rank: leagueInfo[0].rank,
                                        lp: leagueInfo[0].leaguePoints,
                                        wins: leagueInfo[0].wins,
                                        losses: leagueInfo[0].losses
                                    };
                                }
                            }

                            message.channel.send('', new discord.RichEmbed()
                            .setColor('#01feb9')
                            .setTitle(`Perfil: ${profileInfo.name} :eyes:`)
                            .addField(fields[0].name, fields[0].value, true)
                            .addField(fields[1].name, fields[1].value, true)
                            .setThumbnail(icons)
                            .addField('\nRanked Stats:', `
                            **Solo/duo:** ${solo.tier} ${solo.rank} | W: ${solo.wins} / L: ${solo.losses} / wr: ${(100 * solo.wins) / (solo.wins + solo.losses)}% **${solo.lp}LP**
                            **Flex:** :leaves:
                            **Ranked 3x3:** :leaves:
                            **TFT:** :leaves:
                            `)
                        );
                        });
                    });
                });
            });
        }
    });


client.login(token);

