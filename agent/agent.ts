import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage, SystemMessage, trimMessages } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import path from "path";
import fs from "fs";
import { goToPlayer } from "../tools/followPlayer";
import { mineBlockTool } from "../tools/mineBlock";
import { placeItems } from "../tools/placeItem";
import { Observation } from "./observation";
import { executeCustomAction } from "../tools/executeCustomAction";
import { craftItem } from "../tools/craftItem";
import { killMob } from "../tools/killmob";
import { smeltItem } from "../tools/smeltItem";
import app from "./customAgent";

// Define tool: example adder
const adderSchema = z.object({ a: z.number(), b: z.number() });
const adderTool = tool(async (input) => {
    const sum = input.a + input.b;
    return `The sum of ${input.a} and ${input.b} is ${sum}`;
}, {
    name: "adder",
    description: "Adds two numbers together",
    schema: adderSchema,
});

// LLM agent
const agentTools = [adderTool, goToPlayer, mineBlockTool, placeItems, craftItem, killMob, smeltItem, executeCustomAction];
const agentModel = new ChatOpenAI({ model: "gpt-4o", temperature: 0.7 });
const agentCheckpointer = new MemorySaver();

const agent = createReactAgent({
    tools: agentTools,
    llm: agentModel,
    checkpointer: agentCheckpointer,
});

// Shared helper
function getSystemMessages(obs: Observation, basePrompt: string): [SystemMessage, HumanMessage] {
    const systemText = fs.readFileSync(path.join(__dirname, "../../agent/systemMessage.json"), "utf8");
    const systemContent = JSON.parse(systemText).content;

    const systemMessage = new SystemMessage({
        content: [{ type: "text", text: systemContent }],
    });

    const obsMessage = new HumanMessage({
        content: [{ type: "text", text: `Observation of the game status: ${obs.toString()}\n` }],
    });

    return [systemMessage, obsMessage];
}

// Lock state
let isImageAgentRunning = false;

// Main function with lock
export async function askAgentImage(base64Image: string, prompt: string) {
    if (isImageAgentRunning) {
        return "Image agent is currently processing another request. Please wait...";
    }

    isImageAgentRunning = true;

    try {
        const bot = require("../index").bot;
        const player = bot.entity.position;
        const playerCoordinates = { x: player.x, y: player.y, z: player.z };
        prompt += " Current player coordinates: " + JSON.stringify(playerCoordinates);

        const obs = new Observation(bot);
        console.log("Observation of the game status: " + obs.toString() + "\n");

        const [systemMessage, obsMessage] = getSystemMessages(obs, prompt);

        const message = new HumanMessage({
            content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: base64Image } },
            ],
        });

        const trimmedMessages = await trimMessages({
            maxTokens: 10000,
            tokenCounter: agentModel,
            strategy: "last",
            includeSystem: true,
        }).invoke([systemMessage, obsMessage, message]);

        const response = await app.invoke({ messages: trimmedMessages }, { configurable: { thread_id: 42 } });
        return response.messages[response.messages.length - 1].content;
    } catch (err) {
        console.error("Error in askAgentImage:", err);
        return "There was an error processing your request.";
    } finally {
        isImageAgentRunning = false;
    }
}

// Simpler askAgent version
export async function askAgent(_imagePath: string, prompt: string) {
  const bot = require("../index").bot;
  const player = bot.entity.position;
  const playerCoordinates = { x: player.x, y: player.y, z: player.z };
  prompt += " Current player coordinates: " + JSON.stringify(playerCoordinates);

  const obs = new Observation(bot);
  console.log("Observation of the game status: " + obs.toString() + "\n");

  const [systemMessage, obsMessage] = getSystemMessages(obs, prompt);

  const userMessage = new HumanMessage({
      content: [{ type: "text", text: prompt }],
  });

  const trimmedMessages = await trimMessages({
      maxTokens: 10000,
      tokenCounter: agentModel,
      strategy: "last",
      includeSystem: true,
  }).invoke([systemMessage, obsMessage, userMessage]);

  const response = await app.invoke(
      { messages: trimmedMessages },
      { configurable: { thread_id: 42 } }
  );

  return response.messages[response.messages.length - 1].content;
}
