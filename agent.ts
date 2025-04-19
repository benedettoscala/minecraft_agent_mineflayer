import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage, SystemMessage, trimMessages } from "@langchain/core/messages";
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

interface Message {
  content: string | { [key: string]: any };
}

function dummyTokenCounter(messages: Message[]): number {
  return messages.reduce((count: number, msg: Message) => {
      return count + (typeof msg.content === "string" ? msg.content.length : JSON.stringify(msg.content).length);
  }, 0);
}

export async function askAgentImage(base64Image: any, prompt: string) {
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

  // Caricamento messaggio di sistema
  const textSystemMessage = fs.readFileSync(path.join(__dirname, "../systemMessage.json"), "utf8");
  const systemMessageJson = JSON.parse(textSystemMessage);

  const systemMessage = new SystemMessage({
      content: [
          {
              type: "text",
              text: systemMessageJson.content,
          },
      ],
  });

  const humanMessageWithObservation = new HumanMessage({
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

  // Trim dei messaggi per rispettare eventuali limiti di token
  const trimmedMessages = await trimMessages({
      maxTokens: 10000, // o il limite specifico del tuo modello
      tokenCounter: new ChatOpenAI({ model: "gpt-4o" }),
      strategy: "last", // tieni i messaggi più recenti
      includeSystem: true,
  }).invoke([systemMessage, humanMessageWithObservation, message]);

  // Invocazione dell'agente
  const response = await agent.invoke(
      {
          messages: trimmedMessages,
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


    //load a json file with the system message
    const textSystemMessage = fs.readFileSync(path.join(__dirname, "systemMessage.json"), "utf8");
    const systemMessageJson = JSON.parse(textSystemMessage);

    const systemMessage = new SystemMessage({
      content: [
        { type: "text", text: systemMessageJson.content },
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