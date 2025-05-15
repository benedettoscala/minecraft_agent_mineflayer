// --- Full vision-enabled StateGraph for the Minecraft agent ---
// Uses a "shadow" function-calling approach for vision and ensures each
// `need_vision` tool‑call receives a proper ToolMessage reply. The helper
// `extractMessage` now flags processed <CHAT> blocks so they aren’t returned
// twice.

import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { mineBlockTool } from "../tools/mineBlock";
import { placeItems } from "../tools/placeItem";
import { goToPlayer } from "../tools/followPlayer";
import { Observation } from "./observation";
import { executeCustomAction } from "../tools/executeCustomAction";
import { craftItem } from "../tools/craftItem";
import { killMob } from "../tools/killmob";
import { smeltItem } from "../tools/smeltItem";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, MessagesAnnotation, MemorySaver } from "@langchain/langgraph";
import {
  checkItemInsideChestTool,
  depositItemIntoChestTool,
  getItemFromChestTool,
} from "../tools/useChest";
import { checkObservation } from "../tools/checkObservation";
import { makeScreenshot } from "./bot";
import { z } from "zod";
import { tool } from "@langchain/core/tools";

const needVisionShim = tool(
  async () => "<ignored>",
  {
    name: "need_vision",
    description: "Ask the bot for a screenshot. Usage: need_vision({ prompt?: string })",
    schema: z.object({ prompt: z.string().optional() }),
  }
);

const tools = [
  goToPlayer,
  mineBlockTool,
  placeItems,
  craftItem,
  killMob,
  smeltItem,
  executeCustomAction,
  checkItemInsideChestTool,
  depositItemIntoChestTool,
  getItemFromChestTool,
  checkObservation,
  needVisionShim,
];
const toolNode = new ToolNode(tools);

const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0.2 }).bindTools(tools);
const taskCreatorModel = new ChatOpenAI({ model: "gpt-4o", temperature: 0.2 });

function extractTask(messages: (AIMessage | HumanMessage)[]): string | null {
  for (const msg of messages) {
    const content = "content" in msg ? msg.content : "";
    const match = typeof content === "string" ? content.match(/<Task>([\s\S]*?)<\/Task>/) : null;
    if (match) return match[1];
  }
  return null;
}

function extractMessage(messages: (AIMessage | HumanMessage)[]): string | null {
  for (const msg of messages) {
    if (msg.additional_kwargs?.processed_chat) continue;

    const content = "content" in msg ? msg.content : "";
    const match = typeof content === "string" ? content.match(/<CHAT>([\s\S]*?)<\/CHAT>/) : null;
    if (match) {
      msg.additional_kwargs = { ...msg.additional_kwargs, processed_chat: true };
      return match[1];
    }
  }
  return null;
}

function isTaskCompleteOrFailed(messages: (AIMessage | HumanMessage)[]): boolean {
  const lastAIMessage = messages.slice().reverse().find(m => m._getType() === "ai") as AIMessage | undefined;
  if (!lastAIMessage) return false;
  const task = extractTask(messages);
  if (!task) return true;
  const responseText = typeof lastAIMessage.content === "string" ? lastAIMessage.content.toLowerCase() : "";
  return responseText.includes("<task_completed>") || responseText.includes("<fail>");
}

function needsVisionTag(messages: (AIMessage | HumanMessage)[]): boolean {
  const last = messages[messages.length - 1] as AIMessage | undefined;
  if (!last) return false;
  const text = typeof last.content === "string" ? last.content : "";
  return /<need_vision\s*\/>|<need_vision[\s>]/i.test(text);
}

function extractVisionPromptTag(messages: (AIMessage | HumanMessage)[]): string {
  const last = messages[messages.length - 1] as AIMessage | undefined;
  if (!last) return "";
  const text = typeof last.content === "string" ? last.content : "";
  const match = text.match(/<need_vision>([\s\S]*?)<\/need_vision>/i);
  return match ? match[1].trim() : "";
}

function shouldContinue({ messages }: typeof MessagesAnnotation.State) {
  const lastMessage = messages[messages.length - 1] as AIMessage;
  const penultimateMessage = messages[messages.length - 2] as AIMessage | undefined;

  if (lastMessage._getType() === "ai" && penultimateMessage?._getType() === "ai") {
    if (lastMessage.content === penultimateMessage.content) return "cleanup";
  }

  if (lastMessage.tool_calls?.some(c => c.name === "need_vision")) return "vision";
  if (lastMessage.tool_calls?.length) return "tools";
  if (needsVisionTag(messages)) return "vision";

  const task = extractTask(messages);
  if (task && !isTaskCompleteOrFailed(messages)) return "agent";

  const chatMsg = extractMessage(messages);
  if (chatMsg) require("../index").bot.chat(chatMsg);

  return "cleanup";
}

async function visionNode(state: typeof MessagesAnnotation.State) {
  const last = state.messages[state.messages.length - 1] as AIMessage;
  const call = last.tool_calls?.find(c => c.name === "need_vision");
  const prompt = call?.args?.prompt ?? extractVisionPromptTag(state.messages);
  const screenshotDataUrl = await makeScreenshot();
  const toolReply = new ToolMessage({ tool_call_id: call?.id ?? "no_id", content: "<screenshot_captured>" });
  const imageMsg = new HumanMessage({
    content: [
      { type: "text", text: prompt || "<OBSERVATION_SCREENSHOT/>" },
      { type: "image_url", image_url: { url: screenshotDataUrl } },
    ],
  });
  return { messages: [toolReply, imageMsg] };
}

let previousPrompts: (string | null)[] = [];

async function createTask(state: typeof MessagesAnnotation.State) {
  const firstHumanMessage = state.messages.find(msg => msg._getType() === "human") as HumanMessage | undefined;
  if (!firstHumanMessage) return { messages: [] };

  let promptUser: string | null = null;
  for (const msg of state.messages.slice().reverse()) {
    const message =
      typeof msg.content === "object" && Array.isArray(msg.content) && "text" in msg.content[0]
        ? msg.content[0].text
        : "";
    const match = typeof message === "string" ? message.match(/<PROMPT>([\s\S]*?)<\/PROMPT>/) : null;
    if (match) {
      promptUser = match[1];
      break;
    }
  }

  const bot = require("../index").bot;
  const observation = new Observation(bot);
  const observationData = await observation.toString();

  const taskPrompt = [
    new HumanMessage({
      content: `Given this user input, generate:\n\n<Task>...</Task>\n<Plan>...</Plan>\nIf vision is needed, call need_vision({ prompt }) immediately.\n\nPrevious Prompts: {${previousPrompts.join(", ")}}\nCurrent Prompt: "${promptUser}"\nObservation: ${observationData}`,
    }),
  ];

  previousPrompts.push(promptUser);
  if (previousPrompts.length > 5) previousPrompts.shift();

  const taskMessage = await taskCreatorModel.invoke(taskPrompt);
  return { messages: [taskMessage] };
}

async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
}

function cleanupImages(state: typeof MessagesAnnotation.State) {
  for (const msg of state.messages) {
    if (Array.isArray(msg.content)) {
      msg.content = msg.content.filter(part => !(typeof part === "object" && part.type === "image_url"));
    }
  }
  return { messages: [] };
}

const workflow = new StateGraph(MessagesAnnotation)
  .addNode("createTask", createTask)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addNode("vision", visionNode)
  .addNode("cleanup", cleanupImages)
  .addEdge("__start__", "createTask")
  .addEdge("createTask", "agent")
  .addEdge("tools", "agent")
  .addEdge("vision", "agent")
  .addEdge("cleanup", "__end__")
  .addConditionalEdges("agent", shouldContinue);

const memory = new MemorySaver();
const app = workflow.compile({ checkpointer: memory });
export default app;
