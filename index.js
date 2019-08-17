const { Client, Util, RichEmbed } = require('discord.js');

let {
    prefix,
    token,
    googleAPIkey,
    riotAPIkey,
} = require('./config.json');

token = process.env.token;
googleAPIkey = process.env.googleAPIkey;
riotAPIkey = process.env.riotAPIkey;

const ytdl = require('ytdl-core');
const Youtube = require('simple-youtube-api');
const request = require('request');

const client = new Client();
const youtube = new Youtube(googleAPIkey);
const leagueConstants = require('./league/game_constants');
const leaguePatch = '9.14.1';
let queue = new Map();
let embed = new RichEmbed();

const f = {};

//random hex for the color thingies
f.color = () => {
    let hex = `0x${'0123456789abcdef'.split('').map(function (v, i, a) {
        return i>5 ? null : a[Math.floor(Math.random() * 16)] }).join('')}`;
        return hex;
}
//league profile and matches requests and things
f.searchLeagueProfile = async (server, query, cb) => {
    await request(`https://${server}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(query)}?api_key=${riotAPIkey}`, (err, res, body) => {
        try {
            let json = JSON.parse(body);
            cb(json);
        } catch (error) {
            cb(console.error(err));
        }
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
f.leagueRunes = (cb) => {
    request(`http://ddragon.leagueoflegends.com/cdn/${leaguePatch}/data/en_US/runesReforged.json`, (err, res, body) => {
        let json = JSON.parse(body);
        cb(json);
    });
}
f.summonerSpells = (cb) => {
    request(`http://ddragon.leagueoflegends.com/cdn/${leaguePatch}/data/en_US/summoner.json`, (err, res, body) => {
        let json = JSON.parse(body);
        cb(json.data);
    });
}
f.findMatch = (server, id, cb) => {
    request(`https://${server}.api.riotgames.com/lol/spectator/v4/active-games/by-summoner/${id}?api_key=${riotAPIkey}`, (err, res, body) => {
        let json = JSON.parse(body);
        cb(json);
    });
}
f.findEmoji = (emote) => {
    return client.emojis.find(emoji => emoji.name === `${emote}`);
}
//youtube player things
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
    .setColor(f.color())
    .setDescription(`:white_check_mark: pepeJAM Playing now: **${song.title}** pepeJAMMER`)
    );
}
f.addToQueue = async function (video, message, voiceChannel, playlist = false) {
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
            f.play(message.guild, newQueue.songs[0]);
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

client.on('ready', (event) => console.log('Connected'));

client.on('error', console.error);

client.on('disconnect', () => console.log('Disconnected. Trying reconnection...'));

client.on('reconnecting', () => console.log('Reconnecting...'));

client.on('message', async message => {
    const member = message.member;
    const textChannel = message.channel
    const mess = message.content.toLowerCase();
    const comando = mess.split(' ')[0].replace(prefix, '');
    const args = message.content.split(' ');
    const searchString = args.slice(1).join(' ');
    const serverQueue = queue.get(message.guild.id);
    let locationString = args.slice(1, 2).join(' ');
    let profileString = '';
    let serverString = 'br1';

    if(!args[0].startsWith(prefix)) return undefined;
    switch(comando) {
        case 'play':
            const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
            const voiceChannel = member.voiceChannel;
            console.log(url);
            if(!voiceChannel) return textChannel.send('', embed
            .setColor(f.color())
            .setDescription(':x: You need to connect to a voice channel first.')
            );
            //checking if the bot has permissions to do stuff
            const permicoes = voiceChannel.permissionsFor(message.client.user);
            if(!permicoes.has('CONNECT')){
                return textChannel.send('', embed
                .setColor(f.color())
                .setDescription(':no_entry_sign: No permission to connect to the Voice Channel')
                );
            }
            if(!permicoes.has('SPEAK')){
                return textChannel.send('', embed
                .setColor(f.color())
                .setDescription(':no_entry_sign: No permission to speak in the Voice Channel')
                );
            }
        
            if(url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)){
                const playlist = await youtube.getPlaylist(url);
                const videos = await playlist.getVideos();
                for (const video of Object.values(videos)) {
                    const video_ = await youtube.getVideoByID(video.id);
                    console.log(`${video.title} was added to the queue.`);
                    await f.addToQueue(video_, message, voiceChannel, true);
                }
                return textChannel.send('', new RichEmbed()
                .setThumbnail(playlist.thumbnails.default.url)
                .setDescription(`:white_check_mark: Playlist: **${playlist.title}** has been added to the queue ${f.findEmoji('pepeOK')}`)
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
                        return message.reply('Found nothing but leaves :leaves:');
                    }
                }
            }
            return f.addToQueue(video, message, voiceChannel);
            

        case 'skip':
            if(!message.member.voiceChannel) return textChannel.send('', embed
            .setColor(f.color())
            .setDescription(':x: You need to connect to a voice channel first.')
            );
            if(!serverQueue) return textChannel.send('The queue is empty');
            console.log(serverQueue.songs[0]);
            textChannel.send('', new RichEmbed()
            .setColor(f.color())
            .setDescription('Song skipped :track_next:'));
            serverQueue.connection.dispatcher.end(`${serverQueue.songs[0].title} skipped`);
            return undefined;

        case 'queue':
            if(!serverQueue) return textChannel.send('', embed
            .setColor(f.color())
            .setDescription(':crab: The queue is empty :crab:')
            );
            let titles = `\`${1}\`. [${serverQueue.songs[1].title}](#)` + '\n\n';
            for (let i = 1; i < 10; ++i) {
                titles = titles + `\`${i + 1}\`. [${serverQueue.songs[i + 1].title}]()` + '\n\n';
            }

            return textChannel.send('', new RichEmbed()
            .setColor(f.color())
            .setTitle('Queue')
            .addField(`__Playing now__`, `[${serverQueue.songs[0].title}](#)` + '\n\n')
            .addField('__Queued songs__',
            `${titles}
            ${serverQueue.songs.length} items queued.`)
            );

        case 'pepega':
            message.reply(`I\'m not ${f.findEmoji('Pepega')} :point_down: he is`);
            return undefined;

        case 'stop':
            if(!message.member.voiceChannel) return textChannel.send('', embed
            .setColor(f.color())
            .setDescription(':x: You need to connect to a voice channel first.')
            );
            if(!serverQueue) return textChannel.send('', embed
            .setColor(f.color())
            .setDescription(':crab: The queue is empty :crab:')
            );
            serverQueue.songs = [];
            serverQueue.connection.dispatcher.end('stopped the song and left the channel');
            return textChannel.send('', embed
            .setColor(f.color())
            .setDescription(':stop_button: Stopped the song, leaving the voice Channel now...')
            );

        case 'np':
            if(!message.member.voiceChannel) return textChannel.send('', embed
            .setColor(f.color())
            .setDescription(':x: You need to connect to a voice channel first.')
            );
            if(!serverQueue) return textChannel.send('', embed
            .setColor(f.color())
            .setDescription(':crab: The queue is empty :crab:')
            );
            return textChannel.send('', embed
            .setColor(f.color())
            .setDescription(`${f.findEmoji('jervisAYAYA')} Playing now: **${serverQueue.songs[0].title}** :headphones:`)
            );

        case 'vol':
            let sound = ':sound:';
            if(!message.member.voiceChannel) return textChannel.send('', embed
            .setColor(f.color())
            .setDescription(':x: You need to connect to a voice channel first.')
            );
            if(!serverQueue) return message.reply('No point in changing the volume if there\'s nothing playing :blush:');
            if(args[1] > 5) sound = ':loud_sound:';
            if(args[1] == 0) sound = ':mute:';
            if (args[1] > 0 && args[1] < 3) sound = ':speaker:';
            if(!args[1]) return textChannel.send('', embed
            .setColor(f.color())
            .setDescription(`Volume: **${serverQueue.volume}** ${sound}`)
            );
            serverQueue.volume = args[1];
            serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
            return textChannel.send('', embed
            .setColor(f.color())
            .setDescription(`Volume now is: **${args[1]}** ${sound}`)
            );

        case 'lolprofile': // testando apenas
            //queue types
            let solo = {};
            let flex3x3 = {};
            let flexSR = {};
            let tft = {};

            if(locationString.length > 2) {
                profileString = searchString;
                locationString = 'br';
            } else {
                profileString = args.slice(2).join(' ');
                serverString = leagueConstants.serverList(locationString);
            }
            
            locationString = (locationString == 'na') ? 'us' : locationString;
            console.log(locationString);
            console.log(profileString);
            console.log(serverString);
            
            if(message.author.bot) return undefined;
            if(!locationString && !profileString) return textChannel.reply('You need to specify a location and a profile name to search.');
            if(!profileString) return textChannel.reply('You need to specify a profile name in the search.');
            
            //searching the profile by the username inside the message
            f.searchLeagueProfile(serverString, profileString, (profileInfo) => {
                if (!profileInfo.id) return textChannel.send('> Couldn\'t find summoner. Maybe it\'s a new account...')
                console.log(profileInfo.id);
                //getting ranks for all queues of the profile by the user id
                f.getLeagueRank(serverString, profileInfo.id, (leagueInfo) => {
                    //requesting all masteries but we only want the 3 firsts
                    f.allChampMasteries(serverString, profileInfo.id, (masteries) => {
                        //all champs file
                        f.getChampionList(async championList => {

                            const icons = `http://ddragon.leagueoflegends.com/cdn/${leaguePatch}/img/profileicon/${profileInfo.profileIconId}.png `;
                            
                            
                            const objToMap = (obj => {
                                const mapp = new Map();
                                Object.keys(obj).forEach(k => {
                                    mapp.set(k, obj[k])
                                })
                                return mapp;
                            });
                            championList = await objToMap(championList);
                            
                            
                            getKey = (map, searchString) => {
                                for(const [key, value] of map.entries()) {
                                    if(value.key == searchString) return key;
                                }
                            }

                                let champ1 = getKey(championList, masteries[0].championId);
                                let champ2 = getKey(championList, masteries[1].championId);
                                let champ3 = getKey(championList, masteries[2].championId);

                            let fields = [{
                                name: 'Masteries',
                                value: `
                                ${f.findEmoji(champ1)} ${f.findEmoji(`mastery_${masteries[0].championLevel}`)} ${masteries[0].championPoints}
                                ${f.findEmoji(champ2)} ${f.findEmoji(`mastery_${masteries[1].championLevel}`)} ${masteries[1].championPoints}
                                ${f.findEmoji(champ3)} ${f.findEmoji(`mastery_${masteries[2].championLevel}`)} ${masteries[2].championPoints}`,
                                inline: true
                            },
                            {
                                name: 'Level',
                                value: profileInfo.summonerLevel,
                                inline: true
                            },
                            {
                                name: 'Ranked Stats',
                                value: {
                                    solo: `${f.findEmoji('UNRANKED')}`,
                                    flex3x3: `${f.findEmoji('UNRANKED')}`,
                                    flexSR: `${f.findEmoji('UNRANKED')}`,
                                    tft: `${f.findEmoji('UNRANKED')}`
                                },
                                inline: false
                            }];

                            //achei mais facil assim
                            leagueInfo = await objToMap(leagueInfo);
                            //console.log(leagueInfo);

                            const getLeague = (map, values) => {
                                for(const [key, value] of map.entries()){
                                    if(value.queueType == values) return value;
                                }
                            }

                            if(!getLeague(leagueInfo, 'RANKED_SOLO_5x5'));
                            else {
                                solo = getLeague(leagueInfo, 'RANKED_SOLO_5x5');
                                solo.wr = function () { return (100 * this.wins) / (this.wins + this.losses); };
                                solo.tier = f.findEmoji(solo.tier);
                                fields[2].value.solo = `${solo.tier} ${solo.rank} | **${solo.leaguePoints}LP** / ${solo.wins}W ${solo.losses}L ${Math.round(solo.wr())}%`;
                            }
                            if(!getLeague(leagueInfo, 'RANKED_TFT'));
                            else {
                                tft = getLeague(leagueInfo, 'RANKED_TFT');
                                tft.wr = function () { return (100 * this.wins) / (this.wins + this.losses); };
                                tft.tier = f.findEmoji(tft.tier);
                                fields[2].value.tft = `${tft.tier} ${tft.rank} | **${tft.leaguePoints}LP** ${tft.wins}W ${tft.losses}L ${Math.round(tft.wr())}%`;
                            }
                            if(!getLeague(leagueInfo, 'RANKED_FLEX_TT'));
                            else {
                                flex3x3 = getLeague(leagueInfo, 'RANKED_FLEX_TT');
                                flex3x3.wr = function () { return (100 * this.wins) / (this.wins + this.losses); };
                                flex3x3.tier = f.findEmoji(flex3x3.tier);
                                fields[2].value.flex3x3 = `${flex3x3.tier} ${flex3x3.rank} | **${flex3x3.leaguePoints}LP** / ${flex3x3.wins}W ${flex3x3.losses}L ${Math.round(flex3x3.wr())}%`;
                            }
                            if(!getLeague(leagueInfo, 'RANKED_FLEX_SR'));
                            else {
                                flexSR = getLeague(leagueInfo, 'RANKED_FLEX_SR');
                                flexSR.wr = function () { return (100 * this.wins) / (this.wins + this.losses); };
                                flexSR.tier = f.findEmoji(flexSR.tier);
                                fields[2].value.flexSR = `${flexSR.tier} ${flexSR.rank} | **${flexSR.leaguePoints}LP** / ${flexSR.wins}W ${flexSR.losses}L ${Math.round(flexSR.wr())}%`;
                            }

                            textChannel.send('', new RichEmbed()
                            .setColor(f.color())
                            .setTitle(`Perfil: ${profileInfo.name} :flag_${locationString}:`)
                            .addField(fields[0].name, fields[0].value, true)
                            .addField(fields[1].name, fields[1].value, true)
                            .setThumbnail(icons)
                            .addField(fields[2].name, `
                            **Solo/duo:** ${fields[2].value.solo}
                            **Flex:** ${fields[2].value.flexSR}
                            **Ranked 3x3:** ${fields[2].value.flex3x3}
                            **TFT:** ${fields[2].value.tft}
                            `, false)
                            );
                        });
                    });
                });
            });
            return undefined;

        case 'lolmatch': //muito feio isso meu deus
            if(locationString.length > 2) {
                profileString = searchString;
                locationString = 'br';
            } else {
                profileString = args.slice(2).join(' ');
                serverString = leagueConstants.serverList(locationString);
            }

            if(message.author.bot) return undefined;
            if(!locationString && !profileString) return textChannel.reply('You need to specify a location and a profile name to search.');
            if(!profileString) return textChannel.reply('You need to specify a profile name in the search.');

            //first we need the account id so wee search the summoner by the profile name inside the message the same way we used on the lolprofile command
            f.searchLeagueProfile(serverString, profileString, (profileInfo) => {
            //now we need the champion list again because all champions on the match.json file is by the id only
            f.getChampionList((championList) => {
            //we also need the runes file from the database so we are going to request it too
            f.leagueRunes((runes) => {
            //before requesting the match we need one last thing which is the summoner spells, this also is written by id in the match file so we need to find the name
            f.summonerSpells((summonerSpells) => {
            //now that we have everything in our hands we can request the match from the profile id
            f.findMatch(serverString, profileInfo.id, async matchData => {
                console.log(serverString);
                console.log(profileInfo.id);
                console.log(matchData);
                if (!matchData || matchData.status.message === 'Data not found') return textChannel.send('> Summoner is not in a match');

                //just some functions mayb i will change scope mayb maybe
                const objToMap = (obj => {
                    const mapp = new Map();
                    Object.keys(obj).forEach(k => {
                        mapp.set(k, obj[k])
                    })
                    return mapp;
                });
                getKey = (map, searchString) => {
                    for(const [key, value] of map.entries()) {
                        if(value.key == searchString) return key;
                    }
                }
                getSpellName = (map, searchString) => {
                    for(const [key, value] of map.entries()) {
                        if(value.key == searchString) return value.name;
                    }
                }
                findBlueTeam = (participants, teamId) => {
                    let team = [];
                    for (let i = 0; i < participants.length; i++) {
                        if (participants[i].teamId == teamId) {
                            team[i] = participants[i];
                        }
                    }
                    return team;
                }
                findRedTeam = (participants, teamId) => {
                    let team = [];
                    for (let i = 0; i < participants.length; i++) {
                        if (participants[i].teamId == teamId) {
                            team[i] = participants[i];
                        }
                    }
                    for (i = 0; i < participants.length - 1; i++) {
                        if (team[i] == undefined) team.shift();
                    }
                    return team;
                }
                findPerk = (perkId, runes) => {
                    for (let i = 0; i < runes.length; i++) {
                        if (runes[i].id == perkId) return runes[i].slots[0];
                    }
                }
                findSubPerk = (perkId, runes) => {
                    for (let i = 0; i < runes.length; i++) {
                        if (runes[i].id == perkId) return runes[i];
                    }
                }
                findPerkKey = (runeId, perk) => {
                    for (let i = 0; i < perk.runes.length; i++) {
                        if (runeId == perk.runes[i].id) return perk.runes[i].name;
                    }
                }
                perkName = (rune) => { //nice func
                    return rune.name; 
                }

                championList = await objToMap(championList);
                summonerSpells = await objToMap(summonerSpells);

                let teams = {
                    blue: await findBlueTeam(matchData.participants, 100),
                    red: await findRedTeam(matchData.participants, 200)
                }
                //just for testing pls dont kill me
                return textChannel.send('', new RichEmbed()
                .setColor(f.color())
                .setTitle(`${leagueConstants.queues(matchData.gameQueueConfigId)} | ${leagueConstants.maps(matchData.mapId)} | N O  T I M E R`)
                .addField('Blue Team', `
                ${f.findEmoji(getKey(championList, teams.blue[1].championId))} ${f.findEmoji(getKey(championList, teams.blue[2].championId))} ${f.findEmoji(getKey(championList, teams.blue[0].championId))} ${f.findEmoji(getKey(championList, teams.blue[3].championId))} ${f.findEmoji(getKey(championList, teams.blue[4].championId))}
                ${f.findEmoji(getSpellName(summonerSpells, teams.blue[1].spell1Id))} ${f.findEmoji(getSpellName(summonerSpells, teams.blue[1].spell2Id))} ${f.findEmoji(getSpellName(summonerSpells, teams.blue[2].spell1Id))} ${f.findEmoji(getSpellName(summonerSpells, teams.blue[2].spell2Id))} ${f.findEmoji(getSpellName(summonerSpells, teams.blue[0].spell1Id))} ${f.findEmoji(getSpellName(summonerSpells, teams.blue[0].spell2Id))} ${f.findEmoji(getSpellName(summonerSpells, teams.blue[3].spell1Id))} ${f.findEmoji(getSpellName(summonerSpells, teams.blue[3].spell2Id))} ${f.findEmoji(getSpellName(summonerSpells, teams.blue[4].spell1Id))} ${f.findEmoji(getSpellName(summonerSpells, teams.blue[4].spell2Id))}
                ${f.findEmoji(findPerkKey(teams.blue[1].perks.perkIds[0], findPerk(teams.blue[1].perks.perkStyle, runes)))} ${f.findEmoji(perkName(findSubPerk(teams.blue[1].perks.perkSubStyle, runes)))} ${f.findEmoji(findPerkKey(teams.blue[2].perks.perkIds[0], findPerk(teams.blue[2].perks.perkStyle, runes)))} ${f.findEmoji(perkName(findSubPerk(teams.blue[2].perks.perkSubStyle, runes)))} ${f.findEmoji(findPerkKey(teams.blue[4].perks.perkIds[0], findPerk(teams.blue[4].perks.perkStyle, runes)))} ${f.findEmoji(perkName(findSubPerk(teams.blue[4].perks.perkSubStyle, runes)))} ${f.findEmoji(findPerkKey(teams.blue[0].perks.perkIds[0], findPerk(teams.blue[0].perks.perkStyle, runes)))} ${f.findEmoji(perkName(findSubPerk(teams.blue[0].perks.perkSubStyle, runes)))} ${f.findEmoji(findPerkKey(teams.blue[3].perks.perkIds[0], findPerk(teams.blue[3].perks.perkStyle, runes)))} ${f.findEmoji(perkName(findSubPerk(teams.blue[3].perks.perkSubStyle, runes)))}`, false)
                .addField('Red Team', `
                ${f.findEmoji(getKey(championList, teams.red[4].championId))} ${f.findEmoji(getSpellName(summonerSpells, teams.red[4].spell1Id))} ${f.findEmoji(getSpellName(summonerSpells, teams.red[4].spell2Id))} ${f.findEmoji(findPerkKey(teams.red[4].perks.perkIds[0], findPerk(teams.red[4].perks.perkStyle, runes)))} ${f.findEmoji(perkName(findSubPerk(teams.red[4].perks.perkSubStyle, runes)))}
                ${f.findEmoji(getKey(championList, teams.red[1].championId))} ${f.findEmoji(getSpellName(summonerSpells, teams.red[1].spell1Id))} ${f.findEmoji(getSpellName(summonerSpells, teams.red[1].spell2Id))} ${f.findEmoji(findPerkKey(teams.red[1].perks.perkIds[0], findPerk(teams.red[1].perks.perkStyle, runes)))} ${f.findEmoji(perkName(findSubPerk(teams.red[1].perks.perkSubStyle, runes)))}
                ${f.findEmoji(getKey(championList, teams.red[0].championId))} ${f.findEmoji(getSpellName(summonerSpells, teams.red[0].spell1Id))} ${f.findEmoji(getSpellName(summonerSpells, teams.red[0].spell2Id))} ${f.findEmoji(findPerkKey(teams.red[0].perks.perkIds[0], findPerk(teams.red[0].perks.perkStyle, runes)))} ${f.findEmoji(perkName(findSubPerk(teams.red[0].perks.perkSubStyle, runes)))}
                ${f.findEmoji(getKey(championList, teams.red[2].championId))} ${f.findEmoji(getSpellName(summonerSpells, teams.red[2].spell1Id))} ${f.findEmoji(getSpellName(summonerSpells, teams.red[2].spell2Id))} ${f.findEmoji(findPerkKey(teams.red[2].perks.perkIds[0], findPerk(teams.red[2].perks.perkStyle, runes)))} ${f.findEmoji(perkName(findSubPerk(teams.red[2].perks.perkSubStyle, runes)))}
                ${f.findEmoji(getKey(championList, teams.red[3].championId))} ${f.findEmoji(getSpellName(summonerSpells, teams.red[3].spell1Id))} ${f.findEmoji(getSpellName(summonerSpells, teams.red[3].spell2Id))} ${f.findEmoji(findPerkKey(teams.red[3].perks.perkIds[0], findPerk(teams.red[3].perks.perkStyle, runes)))} ${f.findEmoji(perkName(findSubPerk(teams.red[3].perks.perkSubStyle, runes)))}
                `)
                );
            });
            });
            });
            });
            });
        }
    });


client.login(token);

