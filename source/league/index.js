const { Client, Util, RichEmbed } = require('discord.js');
const axios = require('axios');
const keys = require('../keys');
const constants = require('./constants');
const functions = require('../functions');

async function version() {
    const res = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
    return res.data[0];
}
async function profileByName(server, query) {
    const res = await axios.get(`https://${server}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(query)}?api_key=${keys.riotAPIkey}`);
    return res.data;
}
async function leaguesByID(server, id) {
    const res = await axios.get(`https://${server}.api.riotgames.com/lol/league/v4/entries/by-summoner/${id}?api_key=${keys.riotAPIkey}`);
    return res.data;
}
async function masteries(server, id) {
    const res = await axios.get(`https://${server}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-summoner/${id}?api_key=${keys.riotAPIkey}`);
    return res.data;
}
async function championList(version) {
    const res = await axios.get(`http://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`);
    return res.data.data;
}
async function runeList(version) {
    const res = await axios.get(`http://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/runesReforged.json`);
    return res.data;
}
async function spellList(version) {
    const res = await axios.get(`http://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/summoner.json`);
    return res.data.data;
}
async function findMatch(server, id) {
    const res = await axios.get(`https://${server}.api.riotgames.com/lol/spectator/v4/active-games/by-summoner/${id}?api_key=${keys.riotAPIkey}`);
    return res.data;
}
function championById(masteryKey, championObj) {
    for (const key in championObj) {
        const newObj = championObj[key];
        for (const key2 in newObj) {
            if (newObj.key == masteryKey) {
                return newObj.name;
            }
        }
    }
}
function findSpellById(obj, spellId) {
    for (const key in obj) {
        const newObj = obj[key];
        for (const key2 in newObj) {
            //console.log(newObj.key);
            //console.log(spellId);
            if (spellId == newObj.key) {
                //console.log(newObj.name);
                return newObj.name;
            }
        }
    }
}
function sortTeamSide(player, teamId) {
    let team = [];
    for (let i = 0; i < player.participants.length; i++) {
        if (player.participants[i].teamId == teamId) {
            team[i] = player.participants[i];
        }
    }
    /*
    this loop is essentially for the red team (team id 200), since participants is an array,
    when we call this function with a teamId of 200 the return will be an array with length 10
    and the first 5 indexes would be undefined since it's from the team id 100 (blue team)
    so we need to shift all the undefined indexes to get our array the way we want it
    */
    if(team.length > 5) {
        for(i = 0; i < player.participants.length - 1; i++) {
            if (team[i] == undefined) team.shift();
        }
    }
    return team;
}
function sortRunePerks(runes, perkId, keyStoneId, subPerkId) {
    let perks = {
        keyStone: '',
        subPerk: ''
    };
    for (let i = 0; i < runes.length; i++) {
        if (runes[i].id == subPerkId) {
            perks.subPerk = runes[i].name;
        }
    }
    for (let i = 0; i < runes.length; i++) {
        if (runes[i].id == perkId) {
            for (let j = 0; j < runes[i].slots[0].runes.length; j++) {
                if (keyStoneId == runes[i].slots[0].runes[j].id) {
                    perks.keyStone = runes[i].slots[0].runes[j].name;
                }
            }
        }
    }
    perks.keyStone = perks.keyStone.match(/[^A-Za-z]/) ? perks.keyStone.replace(/[^A-Za-z0-9]/g, '') : perks.keyStone;
    perks.subPerk = perks.subPerk.match(/[^A-Za-z]/) ? perks.subPerk.replace(/[^A-Za-z0-9]/g, '') : perks.subPerk;


    return perks;
}


module.exports = {
    showProfile: async (args, location, member, textChannel) => {
        try {
            //just for autonomous league patching version when doing requests from the api
            var leagueVer = await version();
            console.log(leagueVer);
            const channel = {
                member: member,
                textChannel: textChannel
            }

            let server = 'br1';
            let profileName;

            if (location.length > 2) {
                //if the person doesn't type the location after the command the location will be 'br' by default
                profileName = args;
                //console.log(profileName);
                location = 'br';
            } else {
                //if there is a location after the command we need to slice it so we get the profile name
                profileName = args.split(' ').slice(1).join(' ');
                //console.log(profileName);
                server = constants.serverList(location);
                console.log(server);
            }

            location = (location == 'na') ? 'us' : location;
            console.log(location);

            if (!location && !profileName) return channel.textChannel.reply('You need to specify a location and a profile name to search.');
            if (!profileName) return channel.textChannel.reply('You need to specify a profile name in the search.');

            try {
                var profile = await profileByName(server, profileName);
                var ranks = await leaguesByID(server, profile.id);
                var mastery = await masteries(server, profile.id);
                var champions = await championList(leagueVer);

                const icons = `http://ddragon.leagueoflegends.com/cdn/${leagueVer}/img/profileicon/${profile.profileIconId}.png `;

                let mastery1 = await championById(mastery[0].championId.toString(), champions);
                let mastery2 = await championById(mastery[1].championId.toString(), champions);
                let mastery3 = await championById(mastery[2].championId.toString(), champions);

                mastery1 = mastery1.match(/[^A-Za-z]/) ? mastery1.replace(/[^A-Za-z0-9]/g, '') : mastery1;
                mastery2 = mastery2.match(/[^A-Za-z]/) ? mastery2.replace(/[^A-Za-z0-9]/g, '') : mastery2;
                mastery3 = mastery3.match(/[^A-Za-z]/) ? mastery3.replace(/[^A-Za-z0-9]/g, '') : mastery3;

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

                //we're getting our rank data by the queue type here using this for loop to go through the array we got from the request
                function getLeague(objArr, queueType) {
                    for (let i = 0; i < objArr.length; i++) {
                        if (objArr[i].queueType === queueType) return objArr[i];
                    }
                }

                if (!getLeague(ranks, 'RANKED_SOLO_5x5'));
                else {
                    solo = getLeague(ranks, 'RANKED_SOLO_5x5');
                    solo.wr = function () { return (100 * this.wins) / (this.wins + this.losses); };
                    solo.tier = functions.findEmoji(solo.tier);
                    fields[2].value.solo = `${solo.tier} ${solo.rank} | **${solo.leaguePoints}LP** / ${solo.wins}W ${solo.losses}L ${Math.round(solo.wr())}%`;
                }
                if (!getLeague(ranks, 'RANKED_TFT'));
                else {
                    tft = getLeague(ranks, 'RANKED_TFT');
                    tft.wr = function () { return (100 * this.wins) / (this.wins + this.losses); };
                    tft.tier = functions.findEmoji(tft.tier);
                    fields[2].value.tft = `${tft.tier} ${tft.rank} | **${tft.leaguePoints}LP** ${tft.wins}W ${tft.losses}L ${Math.round(tft.wr())}%`;
                }
                if (!getLeague(ranks, 'RANKED_FLEX_TT'));
                else {
                    flex3x3 = getLeague(ranks, 'RANKED_FLEX_TT');
                    flex3x3.wr = function () { return (100 * this.wins) / (this.wins + this.losses); };
                    flex3x3.tier = functions.findEmoji(flex3x3.tier);
                    fields[2].value.flex3x3 = `${flex3x3.tier} ${flex3x3.rank} | **${flex3x3.leaguePoints}LP** / ${flex3x3.wins}W ${flex3x3.losses}L ${Math.round(flex3x3.wr())}%`;
                }
                if (!getLeague(ranks, 'RANKED_FLEX_SR'));
                else {
                    flexSR = getLeague(ranks, 'RANKED_FLEX_SR');
                    flexSR.wr = function () { return (100 * this.wins) / (this.wins + this.losses); };
                    flexSR.tier = functions.findEmoji(flexSR.tier);
                    fields[2].value.flexSR = `${flexSR.tier} ${flexSR.rank} | **${flexSR.leaguePoints}LP** / ${flexSR.wins}W ${flexSR.losses}L ${Math.round(flexSR.wr())}%`;
                }

                channel.textChannel.send('', new RichEmbed()
                    .setColor(functions.color())
                    .setTitle(`Perfil: ${profile.name} :flag_${location}:`)
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

            } catch (error) {
                console.error(error);
            }
            return undefined;
        } catch (err) {
            console.log(err);
        }
        return undefined;
    },
    getMatch: async (args, location, member, textChannel) => {
        const channel = {
            member: member,
            textChannel: textChannel
        }

        let server = 'br1';
        let profileName;

        if (location.length > 2) {
            profileName = location;
            //console.log(profileName);
            location = 'br';
        } else {
            profileName = args.split(' ').slice(1).join(' ');
            //console.log(profileName);
            server = constants.serverList(location);
            //console.log(server);
        }

        location = (location == 'na') ? 'us' : location;
        //console.log(location);

        if (!location && !profileName) return channel.textChannel.reply('You need to specify a location and a profile name to search.');
        if (!profileName) return channel.textChannel.reply('You need to specify a profile name in the search.');

        try {
            var leagueVer = await version();
            var profile = await profileByName(server, profileName);
            var champions = await championList(leagueVer);
            var runes = await runeList(leagueVer);
            var spells = await spellList(leagueVer);
            var game = await findMatch(server, profile.id);

            if (game.status) return channel.textChannel.send('Summoner is not in a match');

            const teams = { blue: sortTeamSide(game, 100), red: sortTeamSide(game, 200) };
            const relevantData = {
                team: {
                    blue: [{
                        spell1: findSpellById(spells, teams.blue[0].spell1Id),
                        spell2: findSpellById(spells, teams.blue[0].spell2Id),
                        champion: championById(teams.blue[0].championId, champions),
                        name: teams.blue[0].summonerName,
                        perks: sortRunePerks(runes, teams.blue[0].perks.perkStyle, teams.blue[0].perks.perkIds[0], teams.blue[0].perks.perkSubStyle)
                    },
                    {
                        spell1: findSpellById(spells, teams.blue[1].spell1Id),
                        spell2: findSpellById(spells, teams.blue[1].spell2Id),
                        champion: championById(teams.blue[1].championId, champions),
                        name: teams.blue[1].summonerName,
                        perks: sortRunePerks(runes, teams.blue[1].perks.perkStyle, teams.blue[1].perks.perkIds[0], teams.blue[1].perks.perkSubStyle)
                    },
                    {
                        spell1: findSpellById(spells, teams.blue[2].spell1Id),
                        spell2: findSpellById(spells, teams.blue[2].spell2Id),
                        champion: championById(teams.blue[2].championId, champions),
                        name: teams.blue[2].summonerName,
                        perks: sortRunePerks(runes, teams.blue[2].perks.perkStyle, teams.blue[2].perks.perkIds[0], teams.blue[2].perks.perkSubStyle)
                    },
                    {
                        spell1: findSpellById(spells, teams.blue[3].spell1Id),
                        spell2: findSpellById(spells, teams.blue[3].spell2Id),
                        champion: championById(teams.blue[3].championId, champions),
                        name: teams.blue[3].summonerName,
                        perks: sortRunePerks(runes, teams.blue[3].perks.perkStyle, teams.blue[3].perks.perkIds[0], teams.blue[3].perks.perkSubStyle)
                    },
                    {
                        spell1: findSpellById(spells, teams.blue[4].spell1Id),
                        spell2: findSpellById(spells, teams.blue[4].spell2Id),
                        champion: championById(teams.blue[4].championId, champions),
                        name: teams.blue[4].summonerName,
                        perks: sortRunePerks(runes, teams.blue[4].perks.perkStyle, teams.blue[4].perks.perkIds[0], teams.blue[4].perks.perkSubStyle)
                    }],
                    red: [{
                        spell1: findSpellById(spells, teams.red[0].spell1Id),
                        spell2: findSpellById(spells, teams.red[0].spell2Id),
                        champion: championById(teams.red[0].championId, champions),
                        name: teams.red[0].summonerName,
                        perks: sortRunePerks(runes, teams.red[0].perks.perkStyle, teams.red[0].perks.perkIds[0], teams.red[0].perks.perkSubStyle)
                    },
                    {
                        spell1: findSpellById(spells, teams.red[1].spell1Id),
                        spell2: findSpellById(spells, teams.red[1].spell2Id),
                        champion: championById(teams.red[1].championId, champions),
                        name: teams.red[1].summonerName,
                        perks: sortRunePerks(runes, teams.red[1].perks.perkStyle, teams.red[1].perks.perkIds[0], teams.red[1].perks.perkSubStyle)
                    },
                    {
                        spell1: findSpellById(spells, teams.red[2].spell1Id),
                        spell2: findSpellById(spells, teams.red[2].spell2Id),
                        champion: championById(teams.red[2].championId, champions),
                        name: teams.red[2].summonerName,
                        perks: sortRunePerks(runes, teams.red[2].perks.perkStyle, teams.red[2].perks.perkIds[0], teams.red[2].perks.perkSubStyle)
                    },
                    {
                        spell1: findSpellById(spells, teams.red[3].spell1Id),
                        spell2: findSpellById(spells, teams.red[3].spell2Id),
                        champion: championById(teams.red[3].championId, champions),
                        name: teams.red[3].summonerName,
                        perks: sortRunePerks(runes, teams.red[3].perks.perkStyle, teams.red[3].perks.perkIds[0], teams.red[3].perks.perkSubStyle)
                    },
                    {
                        spell1: findSpellById(spells, teams.red[4].spell1Id),
                        spell2: findSpellById(spells, teams.red[4].spell2Id),
                        champion: championById(teams.red[4].championId, champions),
                        name: teams.red[4].summonerName,
                        perks: sortRunePerks(runes, teams.red[4].perks.perkStyle, teams.red[4].perks.perkIds[0], teams.red[4].perks.perkSubStyle)
                    }]
                }
            }
//ugly but i needed this because of character limitations on the message
            return channel.textChannel.send('', new RichEmbed()
            .setColor(functions.color())
            .setTitle(`${constants.queues(game.gameQueueConfigId)} | ${constants.maps(game.mapId)} | T I M E R`)
            .addField('Blue Team',
`
${functions.findEmoji(relevantData.team.blue[0].spell1)} ${functions.findEmoji(relevantData.team.blue[0].spell2)}
${functions.findEmoji(relevantData.team.blue[0].champion)} **${relevantData.team.blue[0].name}**
${functions.findEmoji(relevantData.team.blue[0].perks.keyStone)} ${functions.findEmoji(relevantData.team.blue[0].perks.subPerk)}
_
${functions.findEmoji(relevantData.team.blue[1].spell1)} ${functions.findEmoji(relevantData.team.blue[1].spell2)}
${functions.findEmoji(relevantData.team.blue[1].champion)} **${relevantData.team.blue[1].name}**
${functions.findEmoji(relevantData.team.blue[1].perks.keyStone)} ${functions.findEmoji(relevantData.team.blue[1].perks.subPerk)}
_
${functions.findEmoji(relevantData.team.blue[2].spell1)} ${functions.findEmoji(relevantData.team.blue[2].spell2)}
${functions.findEmoji(relevantData.team.blue[2].champion)} **${relevantData.team.blue[2].name}**
${functions.findEmoji(relevantData.team.blue[2].perks.keyStone)} ${functions.findEmoji(relevantData.team.blue[2].perks.subPerk)}
_
${functions.findEmoji(relevantData.team.blue[3].spell1)} ${functions.findEmoji(relevantData.team.blue[3].spell2)}
${functions.findEmoji(relevantData.team.blue[3].champion)} **${relevantData.team.blue[3].name}**
${functions.findEmoji(relevantData.team.blue[3].perks.keyStone)} ${functions.findEmoji(relevantData.team.blue[3].perks.subPerk)}
_
${functions.findEmoji(relevantData.team.blue[4].spell1)} ${functions.findEmoji(relevantData.team.blue[4].spell2)}
${functions.findEmoji(relevantData.team.blue[4].champion)} **${relevantData.team.blue[4].name}**
${functions.findEmoji(relevantData.team.blue[4].perks.keyStone)} ${functions.findEmoji(relevantData.team.blue[4].perks.subPerk)}
`, true)
            .addField('Red Team',
`
${functions.findEmoji(relevantData.team.red[0].spell1)} ${functions.findEmoji(relevantData.team.red[0].spell2)}
${functions.findEmoji(relevantData.team.red[0].champion)} **${relevantData.team.red[0].name}**
${functions.findEmoji(relevantData.team.red[0].perks.keyStone)} ${functions.findEmoji(relevantData.team.red[0].perks.subPerk)}
_
${functions.findEmoji(relevantData.team.red[1].spell1)} ${functions.findEmoji(relevantData.team.red[1].spell2)}
${functions.findEmoji(relevantData.team.red[1].champion)} **${relevantData.team.red[1].name}**
${functions.findEmoji(relevantData.team.red[1].perks.keyStone)} ${functions.findEmoji(relevantData.team.red[1].perks.subPerk)}
_
${functions.findEmoji(relevantData.team.red[2].spell1)} ${functions.findEmoji(relevantData.team.red[2].spell2)}
${functions.findEmoji(relevantData.team.red[2].champion)} **${relevantData.team.red[2].name}**
${functions.findEmoji(relevantData.team.red[2].perks.keyStone)} ${functions.findEmoji(relevantData.team.red[2].perks.subPerk)}
_
${functions.findEmoji(relevantData.team.red[3].spell1)} ${functions.findEmoji(relevantData.team.red[3].spell2)}
${functions.findEmoji(relevantData.team.red[3].champion)} **${relevantData.team.red[3].name}**
${functions.findEmoji(relevantData.team.red[3].perks.keyStone)} ${functions.findEmoji(relevantData.team.red[3].perks.subPerk)}
_
${functions.findEmoji(relevantData.team.red[4].spell1)} ${functions.findEmoji(relevantData.team.red[4].spell2)}
${functions.findEmoji(relevantData.team.red[4].champion)} **${relevantData.team.red[4].name}**
${functions.findEmoji(relevantData.team.red[4].perks.keyStone)} ${functions.findEmoji(relevantData.team.red[4].perks.subPerk)}
`, true));
        } catch (err) {
            console.log(err);
        }
    }
}
