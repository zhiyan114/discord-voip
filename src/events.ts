import { Interaction } from "discord.js";
import { handleCallCommand, makeCallCmd } from "./commandManager";


export function handleInteraction(event: Interaction) {
    if(event.isCommand())
        if(event.commandName === makeCallCmd.name)
            handleCallCommand(event);
}