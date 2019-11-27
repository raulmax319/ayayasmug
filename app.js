const keys = require('./source/keys');
const league = require('./source/league/index');
const yt = require('./source/youtube/youtube');
const f = require('./source/functions');
const queue = require('./source/youtube/queue');

f.findEmoji = (emote) => {
    return client.emojis.find(emoji => emoji.name === `${emote}`);
}

const { Client, Util, RichEmbed } = require('discord.js');
const Youtube = require('simple-youtube-api');
const youtube = new Youtube(keys.googleAPIkey);

const client = new Client();
let embed = new RichEmbed();

client.on('ready', (event) => console.log('Connected'));

client.on('error', console.error);

client.on('disconnect', () => console.log('Disconnected. Trying reconnection...'));

client.on('reconnecting', () => console.log('Reconnecting...'));

client.on('message', async message => {
    const member = message.member;
    const textChannel = message.channel;
    const comando = message.content.split(' ')[0].replace(prefix, '').toLowerCase();
    const args = message.content.split(' ');
    const args2 = args.slice(1).join(' ');
    const serverQueue = queue.get(message.guild.id);
    const location = args.slice(1, 2).join(' ');

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
                    await yt.addToQueue(video_, message, voiceChannel, true);
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
            return yt.addToQueue(video, message, voiceChannel);
            

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

        case 'lolprofile':
            if(message.author.bot) return undefined;

            try {
                league.showProfile(args2, location, member, textChannel);
            } catch(err) {
                console.error(err);
            }
            return undefined;

        case 'lolmatch': 
            if(message.author.bot) return undefined;

            try {
                league.getMatch(args2, location, member, textChannel);
            } catch(err) {
                console.error(err);
            }
            return undefined;
        }
    });
client.login(keys.token);

