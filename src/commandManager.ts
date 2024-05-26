import { VoiceConnection, joinVoiceChannel } from "@discordjs/voice";
import { Collection, CommandInteraction, GuildMember, REST, Routes, SlashCommandBuilder } from "discord.js";
import twClient, { twiml } from "twilio";

type cacheData = {
    interaction: CommandInteraction;
    connection: VoiceConnection;
}
export const cache = new Collection<string, cacheData>();

export const makeCallCmd = new SlashCommandBuilder()
    .setName("makecall")
    .setDescription("Make a call to a a number")
    .addNumberOption(opt => opt
        .setName("number")
        .setDescription("The number to call")
        .setRequired(true));

// Register command
new REST({ version: "10" }).setToken(process.env["BOTTOKEN"]!)
      .put(
        Routes.applicationCommands(process.env["CLIENTID"]!),
        {
          body: [makeCallCmd.toJSON()]
        }
      );

const twilioClient = twClient(process.env["TWILIO_SID"], process.env["TWILIO_KEY"]);
export async function handleCallCommand(interaction: CommandInteraction) {
    const number = interaction.options.get("number", true).value as number;
    const member = interaction.member as GuildMember | null;
    const serviceNumber = process.env["TWILIO_NUMBER"];
    if(!serviceNumber)
        return await interaction.reply({content: "Service number not set up", ephemeral: true});

    // Check if user is already in a voice channel
    if(!member?.voice.channel)
        return await interaction.reply({content: "You must be in a voice channel to use this command", ephemeral: true});

    // Have the bot join the voice channel and make the call
    const connection = joinVoiceChannel({
        channelId: member.voice.channel.id,
        guildId: member.guild.id,
        adapterCreator: member.guild.voiceAdapterCreator
    });
    await interaction.reply({content: `Calling ${number}...`, ephemeral: true});

    // Request the call and save the cache
    
    const VoiceRes = new twiml
        .VoiceResponse()
        .start()
        .stream({
            name: "stream",
            url: `ws://${process.env["BASE_URL"]}/twilio/ws`
        });

    const callReq = await twilioClient.calls.create({
        twiml: VoiceRes.toString(),
        to: number.toString(),
        from: serviceNumber,
        statusCallback: `http://${process.env["CALLBACK_URL"]}/twilio/callback`,
        statusCallbackMethod: "POST",
        statusCallbackEvent: ["answered", "completed"],
    });
    cache.set(callReq.sid, {
        interaction,
        connection
    });
}