const { Client, Util, RichEmbed } = require('discord.js');
const axios = require('axios');
const keys = require('./keys');
const constants = require('../league/constants');
const functions = require('./functions');

module.exports = {
    profileByName: async (server, query) => {
        const res = await axios.get(`https://${server}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(query)}?api_key=${keys.riotAPIkey}`);
        return res.data;
    },
    leaguesByID: async (server, id) => {
        const res = await axios.get(`https://${server}.api.riotgames.com/lol/league/v4/entries/by-summoner/${id}?api_key=${keys.riotAPIkey}`);
        return res.data;
    },
    masteries: async (server, id) => {
        const res = await axios.get(`https://${server}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-summoner/${id}?api_key=${keys.riotAPIkey}`);
        return res.data;
    },
    championList: async () => {
        const res = await axios.get(`http://ddragon.leagueoflegends.com/cdn/${constants.version()}/data/en_US/champion.json`);
        return res.data;
    },
    runes: async () => {
        const res = await axios.get(`http://ddragon.leagueoflegends.com/cdn/${constants.version()}/data/en_US/runesReforged.json`);
        return res.data;
    },
    spells: async () => {
        const res = await axios.get(`http://ddragon.leagueoflegends.com/cdn/${constants.version()}/data/en_US/summoner.json`);
        return res.data;
    },
    match: async (server, id) => {
        const res = await axios.get(`https://${server}.api.riotgames.com/lol/spectator/v4/active-games/by-summoner/${id}?api_key=${keys.riotAPIkey}`);
        return res.data;
    },
    showProfile: async (args, location, member, textChannel) => {
        const channel = {
            member: member,
            textChannel: textChannel
        }

        let server = 'br1';
        let profileName;

        if(location.length > 2) {
            profileName = location;
            console.log(profileName);
            location = 'br';
        } else {
            profileName = args[1];
            console.log(profileName);
            server = constants.serverList(location);
            console.log(server);
        }

        location = (location == 'na') ? 'us' : location;
        console.log(location);

        if(!location && !profileName) return channel.textChannel.reply('You need to specify a location and a profile name to search.');
        if(!profileName) return channel.textChannel.reply('You need to specify a profile name in the search.');
        
        try {
            console.log(this);
            var profile = await this.profileByName(server, profileName);
            var ranks = await this.leaguesByID(server, profile.id);
            var mastery = await this.masteries(server, profile.id);
            var champions = await this.championList().data;

            const icons = `http://ddragon.leagueoflegends.com/cdn/${constants.version()}/img/profileicon/${profile.profileIconId}.png `;

            function handleMasteries(masteryKey, championObj) {
                var championName;
                for(const key in championObj) {
                    const newObj = championObj[key];
                    for(const key2 in newObj) {
                        if(newObj.key === masteryKey) {
                            championName = newObj.name;
                        }
                    }
                }
                return championName;
            }

            let mastery1 = handleMasteries(mastery[0].championId, champions);
            let mastery2 = handleMasteries(mastery[1].championId, champions);
            let mastery3 = handleMasteries(mastery[2].championId, champions);

            mastery1 = mastery1.match(/[^A-Za-z]/) ? mastery1.replace(/[^A-Za-z0-9]/g, '') : '';
            mastery2 = mastery2.match(/[^A-Za-z]/) ? mastery2.replace(/[^A-Za-z0-9]/g, '') : '';
            mastery3 = mastery3.match(/[^A-Za-z]/) ? mastery3.replace(/[^A-Za-z0-9]/g, '') : '';

            let fields = [{
                name: 'Masteries',
                value: `
                ${functions.findEmoji(mastery1)} ${functions.findEmoji(`mastery_${mastery[0].championLevel}`)} ${mastery[0].championPoints}
                ${functions.findEmoji(mastery2)} ${functions.findEmoji(`mastery_${mastery[1].championLevel}`)} ${mastery[1].championPoints}
                ${functions.findEmoji(mastery3)} ${functions.findEmoji(`mastery_${mastery[2].championLevel}`)} ${mastery[2].championPoints}`,
                inline: true
            },
            {
                name: 'Level',
                value: profile.summonerLevel,
                inline: true
            },
            {
                name: 'Ranked Stats',
                value: {
                    solo: `${functions.findEmoji('UNRANKED')}`,
                    flex3x3: `${functions.findEmoji('UNRANKED')}`,
                    flexSR: `${functions.findEmoji('UNRANKED')}`,
                    tft: `${functions.findEmoji('UNRANKED')}`
                },
                inline: false
            }];

            let solo = {};
            let flex3x3 = {};
            let flexSR = {};
            let tft = {};

            function getLeague(objArr, queueType) {
                for(let i = 0; i < objArr.length; i++) {
                    for(const key in obj[i]) {
                        if(obj.queueType === queueType) return obj;
                    }
                }
            }

            if(!getLeague(ranks, 'RANKED_SOLO_5x5'));
            else {
                solo = getLeague(ranks, 'RANKED_SOLO_5x5');
                solo.wr = function () { return (100 * this.wins) / (this.wins + this.losses); };
                solo.tier = functions.findEmoji(solo.tier);
                fields[2].value.solo = `${solo.tier} ${solo.rank} | **${solo.leaguePoints}LP** / ${solo.wins}W ${solo.losses}L ${Math.round(solo.wr())}%`;
            }
            if(!getLeague(ranks, 'RANKED_TFT'));
            else {
                tft = getLeague(ranks, 'RANKED_TFT');
                tft.wr = function () { return (100 * this.wins) / (this.wins + this.losses); };
                tft.tier = functions.findEmoji(tft.tier);
                fields[2].value.tft = `${tft.tier} ${tft.rank} | **${tft.leaguePoints}LP** ${tft.wins}W ${tft.losses}L ${Math.round(tft.wr())}%`;
            }
            if(!getLeague(ranks, 'RANKED_FLEX_TT'));
            else {
                flex3x3 = getLeague(ranks, 'RANKED_FLEX_TT');
                flex3x3.wr = function () { return (100 * this.wins) / (this.wins + this.losses); };
                flex3x3.tier = functions.findEmoji(flex3x3.tier);
                fields[2].value.flex3x3 = `${flex3x3.tier} ${flex3x3.rank} | **${flex3x3.leaguePoints}LP** / ${flex3x3.wins}W ${flex3x3.losses}L ${Math.round(flex3x3.wr())}%`;
            }
            if(!getLeague(ranks, 'RANKED_FLEX_SR'));
            else {
                flexSR = getLeague(ranks, 'RANKED_FLEX_SR');
                flexSR.wr = function () { return (100 * this.wins) / (this.wins + this.losses); };
                flexSR.tier = functions.findEmoji(flexSR.tier);
                fields[2].value.flexSR = `${flexSR.tier} ${flexSR.rank} | **${flexSR.leaguePoints}LP** / ${flexSR.wins}W ${flexSR.losses}L ${Math.round(flexSR.wr())}%`;
            }

            channel.textChannel.send('', new RichEmbed()
            .setColor(functions.color())
            .setTitle(`Perfil: ${profileInfo.name} :flag_${locationString}:`)
            .addField(fields[0].name, fields[0].value, true)
            .addField(fields[1].name, fields[1].value, true)
            .setThumbnail(icons)
            .addField(fields[2].name, `
            **Solo/duo:** ${fields[2].value.solo}
            **Ranked 3x3:** ${fields[2].value.flex3x3}
            **Flex:** ${fields[2].value.flexSR}
            **TFT:** ${fields[2].value.tft}
            `, false)
            );

        } catch(error) {
            console.error(error);
            return channel.textChannel.reply(`User not found ${error}`);
        }
        
        return undefined;
    }
}