import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { handleInteraction } from './events';

import {config} from "dotenv";
config();




export const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [
        Partials.Channel,
        Partials.GuildMember,
    ]
});

client.on('ready', () => {
    console.log('Bot is ready');
});

client.on('interactionCreate', async i => handleInteraction(i));


client.login(process.env["TOKEN"]);