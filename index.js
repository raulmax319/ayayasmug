const leagueConstants = require('./league/constants');
const keys = require('./source/keys');
const league = require('./source/league');
//const yt = require('./source/youtube/youtube');
const f = require('./source/functions');

const { Client, Util, RichEmbed } = require('discord.js');
//const Youtube = require('simple-youtube-api');
//const youtube = new Youtube(keys.googleAPIkey);
//const ytdl = require('ytdl-core');

const token = keys.token;

const client = new Client();
let embed = new RichEmbed();

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
    console.log(args);
    const args2 = args.slice(1).join(' ');
    //const serverQueue = queue.get(message.guild.id);
    let location = args.slice(1, 2).join(' '); // na if na
    const locationString = location;
    let profileString = '';
    let serverString = 'br1';

    if(!args[0].startsWith(prefix)) return undefined;
    switch(comando) {
        /*case 'play':
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
            return message.reply(`I\'m not ${f.findEmoji('Pepega')} :point_down: he is`);

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
        
        case 'volume':
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
*/
        case 'lolprofile':
            if(message.author.bot) return undefined;
            console.log(typeof(league));
            try {
                league.showProfile(args2, location, member, textChannel);
            } catch(err) {
                console.error(err);
            }
            return undefined;

        case 'lolmatch': 
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
            f.searchLeagueProfile(serverString, profileString, (profileInfo) => {
                f.getChampionList((championList) => {
                    f.leagueRunes((runes) => {
                        f.summonerSpells((summonerSpells) => {
                            f.findMatch(serverString, profileInfo.id, async matchData => {
                                console.log(serverString);
                                console.log(profileInfo.id);
                                console.log(matchData);
                                if (!matchData.gameId) return textChannel.send('> Summoner is not in a match');

                                    //just some functions mayb i will change it later mayb maybe
                                    const objToMap = (obj => {
                                        const mapp = new Map();
                                        Object.keys(obj).forEach(k => {
                                            mapp.set(k, obj[k])
                                        })
                                        return mapp;
                                    });
                                    getKey = (map, searchString) => {
                                        for(const [key, value] of map.entries()) {
                                            if(value.key == searchString) return value.name;
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
                                            if (runeId == perk.runes[i].id) return perk.runes[i].key; // recent changed from name emote purpose
                                        }
                                    }
                                    perkName = (rune) => { //nice func
                                        return rune.key; 
                                    }

                                    championList = await objToMap(championList);
                                    summonerSpells = await objToMap(summonerSpells);

                                    let teams = {
                                        blue: await findBlueTeam(matchData.participants, 100),
                                        red: await findRedTeam(matchData.participants, 200)
                                    }
                                    return textChannel.send('', new RichEmbed()
                                    .setColor(f.color())
                                    .setTitle(`${leagueConstants.queues(matchData.gameQueueConfigId)} | ${leagueConstants.maps(matchData.mapId)} | N O  T I M E R`)
                                    .addField('Blue Team', `
                                    ${f.findEmoji(getKey(championList, teams.blue[4].championId).split('\'').join('').split(' ').join(''))} ${f.findEmoji(getSpellName(summonerSpells, teams.blue[4].spell1Id).split(' ').join('').split('!').join(''))} ${f.findEmoji(getSpellName(summonerSpells, teams.blue[4].spell2Id).split(' ').join('').split('!').join(''))} ${f.findEmoji(findPerkKey(teams.blue[4].perks.perkIds[0], findPerk(teams.blue[4].perks.perkStyle, runes)))} ${f.findEmoji(perkName(findSubPerk(teams.blue[4].perks.perkSubStyle, runes)))}
                                    ${f.findEmoji(getKey(championList, teams.blue[1].championId).split('\'').join('').split(' ').join(''))} ${f.findEmoji(getSpellName(summonerSpells, teams.blue[1].spell1Id).split(' ').join('').split('!').join(''))} ${f.findEmoji(getSpellName(summonerSpells, teams.blue[1].spell2Id).split(' ').join('').split('!').join(''))} ${f.findEmoji(findPerkKey(teams.blue[1].perks.perkIds[0], findPerk(teams.blue[1].perks.perkStyle, runes)))} ${f.findEmoji(perkName(findSubPerk(teams.blue[1].perks.perkSubStyle, runes)))}
                                    ${f.findEmoji(getKey(championList, teams.blue[0].championId).split('\'').join('').split(' ').join(''))} ${f.findEmoji(getSpellName(summonerSpells, teams.blue[0].spell1Id).split(' ').join('').split('!').join(''))} ${f.findEmoji(getSpellName(summonerSpells, teams.blue[0].spell2Id).split(' ').join('').split('!').join(''))} ${f.findEmoji(findPerkKey(teams.blue[0].perks.perkIds[0], findPerk(teams.blue[0].perks.perkStyle, runes)))} ${f.findEmoji(perkName(findSubPerk(teams.blue[0].perks.perkSubStyle, runes)))}
                                    ${f.findEmoji(getKey(championList, teams.blue[2].championId).split('\'').join('').split(' ').join(''))} ${f.findEmoji(getSpellName(summonerSpells, teams.blue[2].spell1Id).split(' ').join('').split('!').join(''))} ${f.findEmoji(getSpellName(summonerSpells, teams.blue[2].spell2Id).split(' ').join('').split('!').join(''))} ${f.findEmoji(findPerkKey(teams.blue[2].perks.perkIds[0], findPerk(teams.blue[2].perks.perkStyle, runes)))} ${f.findEmoji(perkName(findSubPerk(teams.blue[2].perks.perkSubStyle, runes)))}
                                    ${f.findEmoji(getKey(championList, teams.blue[3].championId).split('\'').join('').split(' ').join(''))} ${f.findEmoji(getSpellName(summonerSpells, teams.blue[3].spell1Id).split(' ').join('').split('!').join(''))} ${f.findEmoji(getSpellName(summonerSpells, teams.blue[3].spell2Id).split(' ').join('').split('!').join(''))} ${f.findEmoji(findPerkKey(teams.blue[3].perks.perkIds[0], findPerk(teams.blue[3].perks.perkStyle, runes)))} ${f.findEmoji(perkName(findSubPerk(teams.blue[3].perks.perkSubStyle, runes)))}
                                    `, false)
                                    .addField('Red Team', `
                                    ${f.findEmoji(getKey(championList, teams.red[4].championId).split('\'').join('').split(' ').join(''))} ${f.findEmoji(getSpellName(summonerSpells, teams.red[4].spell1Id).split(' ').join('').split('!').join(''))} ${f.findEmoji(getSpellName(summonerSpells, teams.red[4].spell2Id).split(' ').join('').split('!').join(''))} ${f.findEmoji(findPerkKey(teams.red[4].perks.perkIds[0], findPerk(teams.red[4].perks.perkStyle, runes)))} ${f.findEmoji(perkName(findSubPerk(teams.red[4].perks.perkSubStyle, runes)))}
                                    ${f.findEmoji(getKey(championList, teams.red[1].championId).split('\'').join('').split(' ').join(''))} ${f.findEmoji(getSpellName(summonerSpells, teams.red[1].spell1Id).split(' ').join('').split('!').join(''))} ${f.findEmoji(getSpellName(summonerSpells, teams.red[1].spell2Id).split(' ').join('').split('!').join(''))} ${f.findEmoji(findPerkKey(teams.red[1].perks.perkIds[0], findPerk(teams.red[1].perks.perkStyle, runes)))} ${f.findEmoji(perkName(findSubPerk(teams.red[1].perks.perkSubStyle, runes)))}
                                    ${f.findEmoji(getKey(championList, teams.red[0].championId).split('\'').join('').split(' ').join(''))} ${f.findEmoji(getSpellName(summonerSpells, teams.red[0].spell1Id).split(' ').join('').split('!').join(''))} ${f.findEmoji(getSpellName(summonerSpells, teams.red[0].spell2Id).split(' ').join('').split('!').join(''))} ${f.findEmoji(findPerkKey(teams.red[0].perks.perkIds[0], findPerk(teams.red[0].perks.perkStyle, runes)))} ${f.findEmoji(perkName(findSubPerk(teams.red[0].perks.perkSubStyle, runes)))}
                                    ${f.findEmoji(getKey(championList, teams.red[2].championId).split('\'').join('').split(' ').join(''))} ${f.findEmoji(getSpellName(summonerSpells, teams.red[2].spell1Id).split(' ').join('').split('!').join(''))} ${f.findEmoji(getSpellName(summonerSpells, teams.red[2].spell2Id).split(' ').join('').split('!').join(''))} ${f.findEmoji(findPerkKey(teams.red[2].perks.perkIds[0], findPerk(teams.red[2].perks.perkStyle, runes)))} ${f.findEmoji(perkName(findSubPerk(teams.red[2].perks.perkSubStyle, runes)))}
                                    ${f.findEmoji(getKey(championList, teams.red[3].championId).split('\'').join('').split(' ').join(''))} ${f.findEmoji(getSpellName(summonerSpells, teams.red[3].spell1Id).split(' ').join('').split('!').join(''))} ${f.findEmoji(getSpellName(summonerSpells, teams.red[3].spell2Id).split(' ').join('').split('!').join(''))} ${f.findEmoji(findPerkKey(teams.red[3].perks.perkIds[0], findPerk(teams.red[3].perks.perkStyle, runes)))} ${f.findEmoji(perkName(findSubPerk(teams.red[3].perks.perkSubStyle, runes)))}
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

