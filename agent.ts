import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import path from "path";
import fs from "fs";
import { goToPlayer } from "./tools/followPlayer";
import { mineBlockTool } from "./tools/mineBlock";
import { placeItems } from "./tools/placeItem";
import {Observation} from  "./observation";
import { exec } from "child_process";
import { executeCustomAction } from "./tools/executeCustomAction";
import { craftItem } from "./tools/craftItem";


// Assicurati che il bot sia correttamente esportato da index.ts
// Tool e modello
const adderSchema = z.object({
    a: z.number(),
    b: z.number(),
  });
  
  const adderTool = tool(
    async (input): Promise<string> => {
      const sum = input.a + input.b;
      return `The sum of ${input.a} and ${input.b} is ${sum}`;
    },
    {
      name: "adder",
      description: "Adds two numbers together",
      schema: adderSchema,
    }
  );

const agentTools = [adderTool, goToPlayer, mineBlockTool, placeItems, executeCustomAction, craftItem];
const agentModel = new ChatOpenAI({model:"gpt-4o", temperature:0.7});
const agentCheckpointer = new MemorySaver();

const agent = createReactAgent({
    tools: agentTools,
    llm: agentModel,
    checkpointer: agentCheckpointer,
});


export async function askAgentImage(base64Image: any, prompt: string) {
    // Path e conversione immagine
    const bot = require("./index").bot;

    // Recupero coordinate del player
    const player = bot.entity.position;
    const playerCoordinates = {
        x: player.x,
        y: player.y,
        z: player.z,
    };

    // Aggiunta delle coordinate al prompt
    prompt += " Current player coordinates: " + JSON.stringify(playerCoordinates);

    // Osservazione dello stato del gioco
    const obs = new Observation(bot);
    console.log("Observation of the game status: " + obs.toString() + "\n");

    // Messaggi
    const systemMessage = new SystemMessage({
        content: [
            {
                type: "text",
                text: "You are a Minecraft bot that can perform various tasks. You think that you are an actual Player. You can use the tools available to you to accomplish these tasks.",
            },
        ],
    });

    const systemMessageWithObservation = new SystemMessage({
        content: [
            {
                type: "text",
                text: "Observation of the game status: " + obs.toString() + "\n",
            },
        ],
    });

    const message = new HumanMessage({
        content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: base64Image } },
        ],
    });

    // Invocazione dell'agente
    const response = await agent.invoke(
        {
            messages: [systemMessage, systemMessageWithObservation, message],
        },
        { configurable: { thread_id: 42 } }
    );

    const llmresponse = response.messages[response.messages.length - 1].content;
    return llmresponse;
}

export async function askAgent(imagePath: any, prompt: string) {
  
    const bot = require("./index").bot;
    
    //retrieve the current user coordinates
    const player = bot.entity.position;
    const playerCoordinates = {
        x: player.x,
        y: player.y,
        z: player.z,
        };

    //add the coordinates to the prompt
    prompt = prompt + " current player coordinates:" + JSON.stringify(playerCoordinates);

    const obs = new Observation(bot);
    
    const message = new HumanMessage({
        content: [
          { type: "text", text: prompt }
        ],
      });

    const systemMessage = new SystemMessage({
      content: [
        { type: "text", text: "You are a Minecraft bot that can perform various tasks. You think that you are an actual Player. You can use the tools available to you to accomplish these tasks." }
      ],
    });

    console.log("Observation of the game status: " + obs.toString() + "\n");
    //system message with the observation
    const systemMessageWithObservation = new SystemMessage({
      content: [
        { type: "text", text: "Observation of the game status: " + obs.toString() + "\n"}
      ],
    });

    const response = await agent.invoke({
      messages: [systemMessage, systemMessageWithObservation, message],
      
    },
    {configurable: {thread_id: 42}});

    const llmresponse = response.messages[response.messages.length - 1].content;
    return llmresponse;
}