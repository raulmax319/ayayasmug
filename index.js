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
let embed = new discord.RichEmbed();
const leaguePatch = '9.14.1';

const colors = {
    red: '#ff0000',
    greenish: '#01feb9',
    blueish: '#4287f5',
    black: '#000000',
    yellow: '#ffd700',
    grayish: '#bababa'
}

const serverList = {
    'na': 'na1',
    'br': 'br1',
    'euw': 'euw1',
    'eune': 'eun1',
    'lan': 'lan1',
    'las': 'las1',
    'tr': 'tr1',
    'ru': 'ru1',
    'oce': 'oc1',
    'jp': 'jp1',
    'kr': 'kr1'
}

let f = {};

f.searchLeagueProfile = (server, query, cb) => {
    request(`https://${server}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(query)}?api_key=${riotAPIkey}`, (err, res, body) => {
        let json = JSON.parse(body);
        cb(json);
    });
}
f.getLeagueRank = (server, id, cb) => {
    request(`https://${server}.api.riotgames.com/lol/league/v4/entries/by-summoner/${id}?api_key=${riotAPIkey}`, (err, res, body) => {
        let json = JSON.parse(body);
        cb(json);
    });
}
f.getChampionList = (cb) => {
    request(`http://ddragon.leagueoflegends.com/cdn/${leaguePatch}/data/en_US/champion.json`, (err, res, body) => {
        let json = JSON.parse(body);
        cb(json.data);
    });
}
f.allChampMasteries = (server, id, cb) => {
    request(`https://${server}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-summoner/${id}?api_key=${riotAPIkey}`, (err, res, body) => {
        let json = JSON.parse(body);
        cb(json);
    });
}
f.getLocation = (query, obj) => {
    for (const property in obj) {
        if (obj.hasOwnProperty(query)) return obj[query];
    }
}
f.play = (guild, song) => {
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
            f.play(guild, serverQueue.songs[0]);
        })
        .on('error', error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send('', embed
    .setColor(colors.blueish)
    .setDescription(`:white_check_mark: pepeJAM Playing now: **${song.title}** pepeJAMMER`)
    );
}
f.addToQueue = async (video, message, voiceChannel, playlist = false) => {
    const serverQueue = queue.get(message.guild.id);
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
            f.play(message.guild, queueConstruct.songs[0]);
        } catch (error) {
            console.error(`Could not connect to the vChannel ${error}`);
            queue.delete(message.guild.id);
            return message.channel.send(`Could not connect to the vChannel ${error}`);
        }
    } else {
        serverQueue.songs.push(song);
        if(playlist) return undefined;
        return message.channel.send('', embed
        .setColor(colors.blueish)
        .setDescription(`:musical_note: **${song.title}** has been added to the queue.`)
        );
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

    switch(comando) {
        case 'play':
            const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
            const voiceChannel = member.voiceChannel;
            if(!voiceChannel) return textChannel.send('', embed
            .setColor(colors.grayish)
            .setDescription(':x: You need to connect to a voice channel first.')
            );
            const permicoes = voiceChannel.permissionsFor(message.client.user);
            if(!permicoes.has('CONNECT')){
                return textChannel.send('', embed
                .setColor(colors.red)
                .setDescription(':no_entry_sign: No permission to connect to the Voice Channel')
                );
            }
            if(!permicoes.has('SPEAK')){
                return textChannel.send('', embed
                .setColor(colors.red)
                .setDescription(':no_entry_sign: No permission to speak in the Voice Channel')
                );
            }
        
            if(url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)){
                const playlist = await youtube.getPlaylist(url);
                const videos = await playlist.getVideos();
                for (const video of Object.values(videos)) {
                    const video_ = await youtube.getVideoByID(video.id);
                    await f.addToQueue(video_, message, voiceChannel, true);
                }
                return textChannel.send('', embed
                .setDescription(`:white_check_mark: Playlist: **${playlist.title}** has been added to the queue pepeOK`)
                );
            } else {
                try {
                    var video = await youtube.getVideo(url);
                } catch (error) {
                    try {
                        var videos = await youtube.searchVideos(searchString, 1);
                        var video = await youtube.getVideoByID(videos[0].id);
                    } catch (err) {
                        console.error(err);
                        return textChannel.send('', embed
                        .setColor(colors.black)
                        .setDescription('Found nothing but leaves :leaves:')
                        );
                    }
                }
            }
            return f.addToQueue(video, message, voiceChannel);
            

        case 'skip':
            if(!message.member.voiceChannel) return textChannel.send('', embed
            .setColor(colors.red)
            .setDescription(':x: You need to connect to a voice channel first.')
            );
            if(!serverQueue) return textChannel.send('The queue is empty');
            textChannel.send('', embed
            .setColor(colors.yellow)
            .setDescription('Song skipped :track_next:'));
            serverQueue.connection.dispatcher.end(`skipped ${serverQueue.songs[0].title}`);
            return undefined;

        case 'queue':
            if(!serverQueue) return textChannel.send('', embed
            .setColor(colors.grayish)
            .setDescription(':crab: The queue is empty :crab:')
            );
            return textChannel.send('', embed
            .setColor(colors.blueish)
            .setTitle('Queue')
            .setDescription(`
            ${serverQueue.songs.map(song => `**:black_small_square: ** ${song.title}`).join('\n')}
            **Playing now:** ${serverQueue.songs[0].title}
            `)
            );

        case 'pepega':
            message.reply('I\'m not Pepega :point_down: he is');
            return undefined;

        case 'stop':
            if(!message.member.voiceChannel) return textChannel.send('', embed
            .setColor(colors.red)
            .setDescription(':x: You need to connect to a voice channel first.')
            );
            if(!serverQueue) return textChannel.send('', embed
            .setColor(colors.grayish)
            .setDescription(':crab: The queue is empty :crab:')
            );
            serverQueue.songs = [];
            serverQueue.connection.dispatcher.end('stopped the song and left the channel');
            return textChannel.send('', embed
            .setColor(colors.red)
            .setDescription(':stop_button: Stopped the song, leaving the voice Channel now...')
            );

        case 'np':
            if(!message.member.voiceChannel) return textChannel.send('', embed
            .setColor(colors.red)
            .setDescription(':x: You need to connect to a voice channel first.')
            );
            if(!serverQueue) return textChannel.send('', embed
            .setColor(colors.grayish)
            .setDescription(':crab: The queue is empty :crab:')
            );
            return textChannel.send('', embed
            .setColor(colors.yellow)
            .setDescription(`pepeJAM Playing now: **${serverQueue.songs[0].title}** :headphones:`)
            );

        case 'vol':
            if(!message.member.voiceChannel) return textChannel.send('', embed
            .setColor(colors.red)
            .setDescription(':x: You need to connect to a voice channel first.')
            );
            if(!args[1]) return textChannel.send(`Volume: **${serverQueue.volume}**`);
            serverQueue.volume = args[1];
            serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
            return textChannel.send(`Volume now is: **${args[1]}**`);

        case 'lolprofile': // testando apenas
            let locationString = args.slice(1, 2).join(' ');
            const profileString = args.slice(2).join(' ');

            const serverString = f.getLocation(locationString, serverList);
            locationString = (locationString == 'na') ? 'us' : locationString;
            console.log(locationString);
            console.log(profileString);
            console.log(serverString);
            
            if(message.author.bot) return undefined;
            if(!locationString && !profileString) return textChannel.reply('You need to specify a location and a profile name to search.');
            if(!locationString) return textChannel.reply('You need to specify a location in the search.');
            if(!profileString) return textChannel.reply('You need to specify a profile name in the search.');
            
            f.searchLeagueProfile(serverString, profileString, (profileInfo) => {
                console.log(profileInfo.id);
                f.getLeagueRank(serverString, profileInfo.id, (leagueInfo) => {
                    f.allChampMasteries(serverString, profileInfo.id, (masteries) => {
                        f.getChampionList(async (list) => {

                            const icons = `http://ddragon.leagueoflegends.com/cdn/${leaguePatch}/img/profileicon/${profileInfo.profileIconId}.png `;
                            
                            
                            const objToMap = (obj => {
                                const mapp = new Map();
                                Object.keys(obj).forEach(k => {
                                    mapp.set(k, obj[k])
                                })
                                return mapp;
                            });
                            let listMap = await objToMap(list);
                            
                            
                            const getKey = (map, searchString) => {
                                for(const [key, value] of map.entries()) {
                                    if(value.key == searchString) return key;
                                }
                            }

                            //hardcoded because i want only the 3 first values, the rest doesnt matter mayb i'll change it later idk yea yknow
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
                                rank: '',
                                leaguePoints: '- ',
                                wins: 0,
                                losses: 0,
                                wr: () => { return 0}
                            };
                            var flex3x3 = {
                                tier: ':leaves:',
                                rank: '',
                                leaguePoints: '- ',
                                wins: 0,
                                losses: 0,
                                wr: () => { return 0}
                            };
                            var solo = {
                                tier: ':leaves:',
                                rank: '',
                                leaguePoints: '- ',
                                wins: 0,
                                losses: 0,
                                wr: () => { return 0}
                            };
                            var flexSR = {
                                tier: ':leaves:',
                                rank: '',
                                leaguePoints: '- ',
                                wins: 0,
                                losses: 0,
                                wr: () => { return 0}
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
                                solo.wr = function () { return (100 * this.wins) / (this.wins + this.losses); };
                                emotes.emoteRankSolo = client.emojis.find(emoji => emoji.name === `${solo.tier}`)
                            }
                            if(!getLeague(leagueList, 'RANKED_TFT'));
                            else {
                                tft = getLeague(leagueList, 'RANKED_TFT');
                                tft.wr = function () { return (100 * this.wins) / (this.wins + this.losses); };
                                emotes.emoteRankTft = client.emojis.find(emoji => emoji.name === `${tft.tier}`)
                            }
                            if(!getLeague(leagueList, 'RANKED_FLEX_TT'));
                            else {
                                flex3x3 = getLeague(leagueList, 'RANKED_FLEX_TT');
                                flex3x3.wr = function () { return (100 * this.wins) / (this.wins + this.losses); };
                                emotes.emoteRankFlex3 = client.emojis.find(emoji => emoji.name === `${flex3x3.tier}`)
                            }
                            if(!getLeague(leagueList, 'RANKED_FLEX_SR'));
                            else {
                                flexSR = getLeague(leagueList, 'RANKED_FLEX_SR');
                                flexSR.wr = function () { return (100 * this.wins) / (this.wins + this.losses); };
                                emotes.emoteRankFlexSR = client.emojis.find(emoji => emoji.name === `${flexSR.tier}`)
                            }

                            textChannel.send('', new discord.RichEmbed()
                            .setColor(colors.greenish)
                            .setTitle(`Perfil: ${profileInfo.name} :flag_${locationString}:`)
                            .addField(fields[0].name, fields[0].value, true)
                            .addField(fields[1].name, fields[1].value, true)
                            .setThumbnail(icons)
                            .addField('Ranked Stats:', `
                            **Solo/duo:** ${emotes.emoteRankSolo} ${solo.rank} | **${solo.leaguePoints}LP** / ${solo.wins}W ${solo.losses}L ${Math.round(solo.wr())}%
                            **Flex:** ${emotes.emoteRankFlexSR} ${flexSR.rank} | **${flexSR.leaguePoints}LP** / ${flexSR.wins}W ${flexSR.losses}L ${Math.round(flexSR.wr())}%
                            **Ranked 3x3:** ${emotes.emoteRankFlex3} ${flex3x3.rank} | **${flex3x3.leaguePoints}LP** / ${flex3x3.wins}W ${flex3x3.losses}L ${Math.round(flex3x3.wr())}%
                            **TFT:** ${emotes.emoteRankTft} ${tft.rank} | **${tft.leaguePoints}LP** ${tft.wins}W ${tft.losses}L ${Math.round(tft.wr())}%
                            `, false)
                            );
                        });
                    });
                });
            });
        }
    });


client.login(token);

