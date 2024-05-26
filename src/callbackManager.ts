import Express, { urlencoded } from 'express';
import { cache } from './commandManager';
import { twiml, validateRequest, webhook } from 'twilio';
import { createAudioPlayer, createAudioResource } from '@discordjs/voice';
import http from 'http';
import Websocket from 'ws';
import { Duplex } from 'stream';
import { client } from '.';

const webserver = Express();
const server = http.createServer(webserver);
const wsServer = new Websocket.Server({server, path: '/twilio/ws'});


const audioPlayer = createAudioPlayer();
let stream: Duplex | undefined;

// Websocket handler
wsServer.on('connection', (ws, req)=> {
    // Verify the request is from twilio
    // const url = req.headers.origin + req.url!;
    // const params = req.url?.split('?')[1] as string;
    // const signature = req.headers['x-twilio-signature'];

    // if(!validateRequest(process.env["TWILIO_AUTH_TOKEN"]!, signature as string, url))
    //     return ws.close(1008, "Unauthorized");

    stream = Websocket.createWebSocketStream(ws);

})

// Callback handler
webserver.post('/twilio/callback', urlencoded(), webhook(), async (req,res)=>{
    // General Data
    const sid = req.body.CallSid;
    const data = cache.get(sid);
    if(!validateRequest(process.env["TWILIO_AUTH_TOKEN"]!, req.headers['x-twilio-signature'] as string, `https://${req.headers.host}${req.url}`, req.body))
        return res.status(403).send("Unauthorized");
    if(!data)
        return res.status(404).send("Call not found");

    switch(req.body.CallStatus) {
        case "in-progress": {
            // Handle answered call event

            // Setup discord's voice stream
            if(!stream)
                return res.status(500).send("Websocket not connected");
            
            const audioStream = createAudioResource(stream);
            data.connection.receiver.subscribe(client.user!.id).on("Data", chunk => stream?.write(chunk));
            audioPlayer.play(audioStream);

            // // Pipe the stream to discord's voice connection
            // VoiceStream.stream().stream;
            return res.status(200).send("Response Handled");
        }
            
        case "completed": {
            await data.interaction.followUp({content: "Call has ended", ephemeral: true});
            data.connection.destroy();
            return res.status(200).send("Response Handled");
        }

        case "busy": {
            await data.interaction.followUp({content: "Nobody on the other line picked up your call", ephemeral: true});
            data.connection.destroy();
            return res.status(200).send("Response Handled");
        }

        case "failed": {
            await data.interaction.followUp({content: "The call has failed", ephemeral: true});
            data.connection.destroy();
            return res.status(200).send("Response Handled");
        }

        case "no-answer": {
            await data.interaction.followUp({content: "The user you dialed did not answer your call", ephemeral: true});
            data.connection.destroy();
            return res.status(200).send("Response Handled");
        }

        default:
            return res.status(400).send("Call Status Not Handled");
    }
})

server.listen(3000,()=>console.log("WEB SERVER IS RUNNING ON PORT 3000"))