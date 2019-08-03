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
const leaguePatch = '9.14.1';

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
    const textChannel = message.channel
    const mess = message.content.toLowerCase();
    const comando = mess.split(' ')[0].replace(prefix, '');
    const args = mess.split(' ');
    const searchString = args.slice(1).join(' ');
    const serverQueue = queue.get(message.guild.id);
    const fila = '';

    switch(comando) {
        case 'play':
            const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
            const voiceChannel = member.voiceChannel;
            if(!voiceChannel) return textChannel.send('Just connect to a voice channel 4Head');
            const permicoes = voiceChannel.permissionsFor(message.client.user);
            if(!permicoes.has('CONNECT')){
                return textChannel.send('No permission to connect to the Voice Channel');
            }
            if(!permicoes.has('SPEAK')){
                return textChannel.send('No permission to speak in the Voice Channel');
            }
        
            if(url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)){
                const playlist = await youtube.getPlaylist(url);
                const videos = await playlist.getVideos();
                console.log(playlist);
                for (const video of Object.values(videos)) {
                    const video_ = await youtube.getVideoByID(video.id);
                    await func.addToQueue(video_, message, voiceChannel, true);
                }
                return textChannel.send(`Playlist: **${playlist.title}** has been added to the queue pepeOK`);
            } else {
                try {
                    var video = await youtube.getVideo(url);
                } catch (error) {
                    try {
                        var videos = await youtube.searchVideos(searchString, 1);
                        var video = await youtube.getVideoByID(videos[0].id);
                    } catch (err) {
                        console.error(err);
                        return textChannel.send('Found nothing but leaves :leaves:');
                    }
                }
            }
            return func.addToQueue(video, message, voiceChannel);
            

        case 'skip':
            if(!message.member.voiceChannel) return textChannel.send('Just connect to a voice channel 4Head');
            if(!serverQueue) return textChannel.send('The queue is empty');
            textChannel.send('Song skipped')
            serverQueue.connection.dispatcher.end(`skipped ${serverQueue.songs[0].title}`);
            return undefined;

        case 'queue':
            if(!serverQueue) return textChannel.send('The queue is empty');
            return textChannel.send(`
        **Queue**
        ${serverQueue.songs.map(song => `**>** ${song.title}`).join('\n')}
        **Playing now:** ${serverQueue.songs[0].title}
                `);

        case 'pepega':
            message.reply('I\'m not Pepega :point_down: he is');
            return undefined;

        case 'stop':
            if(!message.member.voiceChannel) return textChannel.send('Just connect to a voice channel 4Head');
            if(!serverQueue) return textChannel.send('The queue is empty');
            serverQueue.songs = [];
            serverQueue.connection.dispatcher.end('stopped the song');
            return undefined;

        case 'np':
            if(!message.member.voiceChannel) return textChannel.send('Just connect to a voice channel 4Head');
            if(!serverQueue) return textChannel.send('The queue is empty');
            return textChannel.send(`pepeJAM Playing now: **${serverQueue.songs[0].title}** pepeJAMMER`);

        case 'vol':
            if(!message.member.voiceChannel) return textChannel.send('Just connect to a voice channel 4Head');
            if(!args[1]) return textChannel.send(`Volume: **${serverQueue.volume}**`);
            serverQueue.volume = args[1];
            serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
            return textChannel.send(`Volume now is: **${args[1]}**`);

        case 'lolprofile': // testando apenas
            if(message.author.bot) return undefined;
            func.searchLeagueProfile(searchString, (profileInfo) => {
                console.log(profileInfo.id);
                func.getLeagueRank(profileInfo.id, (leagueInfo) => {
                    func.allChampMasteries(profileInfo.id, (masteries) => {
                        func.getChampionList(async (list) => {

                            const icons = `http://ddragon.leagueoflegends.com/cdn/${leaguePatch}/img/profileicon/${profileInfo.profileIconId}.png `;
                            
                            //transforma o objeto json de champions em map
                            const objToMap = (obj => {
                                const mapp = new Map();
                                Object.keys(obj).forEach(k => {
                                    mapp.set(k, obj[k])
                                })
                                return mapp;
                            });
                            let listMap = await objToMap(list);
                            
                            //procura nos valores dos objetos mapeados o id e retorna o valor da key correspondente a esse id
                            const getKey = (map, searchString) => {
                                for(const [key, value] of map.entries()) {
                                    if(value.key == searchString) return key;
                                }
                            }

                            //hardcoded por que so quero os 3 primeiros valores, o resto nao importa por agora depois vou mudar quem sabe talvez
                            let champString1 = getKey(listMap, masteries[0].championId);
                            let champString2 = getKey(listMap, masteries[1].championId);
                            let champString3 = getKey(listMap, masteries[2].championId);
                            const emotes = { 
                                emoteChamp1: client.emojis.find(emoji => emoji.name === `${champString1}`),
                                emoteChamp2: client.emojis.find(emoji => emoji.name === `${champString2}`),
                                emoteChamp3: client.emojis.find(emoji => emoji.name === `${champString3}`),
                                emoteMastery1: client.emojis.find(emoji => emoji.name === `mastery_${masteries[0].championLevel}`),
                                emoteMastery2: client.emojis.find(emoji => emoji.name === `mastery_${masteries[1].championLevel}`),
                                emoteMastery3: client.emojis.find(emoji => emoji.name === `mastery_${masteries[2].championLevel}`),
                                emoteRankFlex3: ':leaves:',
                                emoteRankFlexSR: ':leaves:',
                                emoteRankSolo: ':leaves:',
                                emoteRankTft: ':leaves:',
                            }

                            let fields = [{
                                name: 'Masteries',
                                value: `${emotes.emoteChamp1}  ${emotes.emoteMastery1} ${masteries[0].championPoints}
                                        ${emotes.emoteChamp2}  ${emotes.emoteMastery2} ${masteries[1].championPoints}
                                        ${emotes.emoteChamp3}  ${emotes.emoteMastery3} ${masteries[2].championPoints}`,
                                inline: true
                            },
                            {
                                name: 'Level',
                                value: profileInfo.summonerLevel,
                                inline: true
                            }];

                            var tft = {
                                tier: ':leaves:',
                                rank: ':leaves:',
                                leaguePoints: ':leaves:',
                                wins: 0,
                                losses: 1, //NaN se 0, nao existe 0/0
                                wr: (100 * this.wins) / (this.wins + this.losses) //undefined ou NaN preguiça de apagar
                            };
                            var flex3x3 = {
                                tier: ':leaves:',
                                rank: ':leaves:',
                                leaguePoints: ':leaves:',
                                wins: 0,
                                losses: 1,
                                wr: (100 * this.wins) / (this.wins + this.losses)
                            };
                            var solo = {
                                tier: ':leaves:',
                                rank: ':leaves:',
                                leaguePoints: ':leaves:',
                                wins: 0,
                                losses: 1,
                                wr: (100 * this.wins) / (this.wins + this.losses)
                            };
                            var flexSR = {
                                tier: ':leaves:',
                                rank: ':leaves:',
                                leaguePoints: ':leaves:',
                                wins: 0,
                                losses: 1,
                                wr: (100 * this.wins) / (this.wins + this.losses)
                            };

                            //tentar outra maneira mais tarde
                            const leagueList = await objToMap(leagueInfo);
                            //console.log(leagueList);

                            const getLeague = (map, values) => {
                                for(const [key, value] of map.entries()){
                                    if(value.queueType == values) return value;
                                }
                            }
                            if(!getLeague(leagueList, 'RANKED_SOLO_5x5'));
                            else {
                                solo = getLeague(leagueList, 'RANKED_SOLO_5x5');
                                emotes.emoteRankSolo = client.emojis.find(emoji => emoji.name === `${solo.tier}`)
                            }
                            if(!getLeague(leagueList, 'RANKED_TFT'));
                            else {
                                tft = getLeague(leagueList, 'RANKED_TFT');
                                emotes.emoteRankTft = client.emojis.find(emoji => emoji.name === `${tft.tier}`)
                            }
                            if(!getLeague(leagueList, 'RANKED_FLEX_TT'));
                            else {
                                flex3x3 = getLeague(leagueList, 'RANKED_FLEX_TT');
                                emotes.emoteRankFlex3 = client.emojis.find(emoji => emoji.name === `${flex3x3.tier}`)
                            }
                            if(!getLeague(leagueList, 'RANKED_FLEX_SR'));
                            else {
                                flexSR = getLeague(leagueList, 'RANKED_FLEX_SR');
                                emotes.emoteRankFlexSR = client.emojis.find(emoji => emoji.name === `${flexSR.tier}`)
                            }

                            textChannel.send('', new discord.RichEmbed()
                            .setColor('#01feb9')
                            .setTitle(`Perfil: ${profileInfo.name} :eyes:`)
                            .addField(fields[0].name, fields[0].value, true)
                            .addField(fields[1].name, fields[1].value, true)
                            .setThumbnail(icons)
                            .addField('Ranked Stats:', `
                            **Solo/duo:** ${emotes.emoteRankSolo} ${solo.rank} | W: ${solo.wins} / L: ${solo.losses} / wr: ${Math.round((100 * solo.wins) / (solo.wins + solo.losses))}% **${solo.leaguePoints}LP**
                            **Flex:** ${emotes.emoteRankFlexSR} ${flexSR.rank} | W: ${flexSR.wins} / L: ${flexSR.losses} / wr: ${Math.round((100 * flexSR.wins) / (flexSR.wins + flexSR.losses))}% **${flexSR.leaguePoints}LP**
                            **Ranked 3x3:** ${emotes.emoteRankFlex3} ${flex3x3.rank} | W: ${flex3x3.wins} / L: ${flex3x3.losses} / wr: ${Math.round((100 * flex3x3.wins) / (flex3x3.wins + flex3x3.losses))}% **${flex3x3.leaguePoints}LP**
                            **TFT:** ${emotes.emoteRankTft} ${tft.rank} | W: ${tft.wins} / L: ${tft.losses} / wr: ${Math.round((100 * tft.wins) / (tft.wins + tft.losses))}% **${tft.leaguePoints}LP**
                            `, false)
                            );
                        });
                    });
                });
            });
        }
    });


client.login(token);

