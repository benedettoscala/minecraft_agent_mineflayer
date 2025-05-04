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
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, MessagesAnnotation, MemorySaver } from "@langchain/langgraph";
import { checkItemInsideChestTool, depositItemIntoChestTool, getItemFromChestTool } from "../tools/useChest"
import { checkObservation } from "../tools/checkObservation";

// Define the tools for the agent to use
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
];
const toolNode = new ToolNode(tools);

// LLM principale
const model = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0.2,
}).bindTools(tools);

// LLM secondario per generare il task dal messaggio utente
const taskCreatorModel = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0.2,
});

// --- Helpers ---
function extractTask(messages: (AIMessage | HumanMessage)[]): string | null {
  for (const msg of messages) {
    const content = "content" in msg ? msg.content : "";
    const match = typeof content === "string" ? content.match(/<Task>(.*?)<\/Task>/) : null;
    if (match) {
      return match[1];
    }
  }
  return null;
}

function extractMessage(messages: (AIMessage | HumanMessage)[]): string | null {
  for (const msg of messages) {
    const content = "content" in msg ? msg.content : "";
    const match = typeof content === "string" ? content.match(/<CHAT>(.*?)<\/CHAT>/) : null;
    if (match) {
      return match[1];
    }
  }
  return null;
}

function isTaskCompleteOrFailed(messages: (AIMessage | HumanMessage)[]): boolean {
  const lastAIMessage = messages.slice().reverse().find((m) => m._getType() === "ai") as AIMessage | undefined;
  if (!lastAIMessage) return false;

  const task = extractTask(messages);
  if (!task) return true;

  const responseText = typeof lastAIMessage.content === "string" ? lastAIMessage.content.toLowerCase() : "";
  return responseText.includes("<task_completed>") || responseText.includes("<fail>");
}

function shouldContinue({ messages }: typeof MessagesAnnotation.State) {
  const lastMessage = messages[messages.length - 1] as AIMessage;
  const penultimateMessage = messages[messages.length - 2] as AIMessage;

  if (lastMessage._getType() === "ai" && penultimateMessage._getType() === "ai") {
    if (lastMessage.content === penultimateMessage.content) {
      return "__end__";
    }
  }

  if (lastMessage.tool_calls?.length) {
    return "tools";
  }

  const task = extractTask(messages);
  if (task && !isTaskCompleteOrFailed(messages)) {
    return "agent";
  }

  const bot = require("../index").bot;
  const message = extractMessage(messages);
  if (message) {
    bot.chat(message);
  }

  return "__end__";
}

// --- Nodes ---
async function createTask(state: typeof MessagesAnnotation.State) {
  const firstHumanMessage = state.messages.find((msg) => msg._getType() === "human") as HumanMessage | undefined;
  if (!firstHumanMessage) return { messages: [] };

  let promptUser = null;
  // prendi il prompt contenuto in PROMPT, cerca in tutti i messagi
  for (const msg of state.messages.slice().reverse()) {
    const message = typeof msg.content === "object" && Array.isArray(msg.content) && "text" in msg.content[0] ? msg.content[0].text : "";
    const match = typeof message === "string" ? message.match(/<PROMPT>(.*?)<\/PROMPT>/) : null;
    if (match) {
      promptUser = match[1];
      break;
    }
  }

  const bot = require("../index").bot;
  const observation = new Observation(bot);
  const observationData = await observation.toString();
  const prompt = [
    new HumanMessage({
      content: `Given this user input, generate:

A task wrapped in the <Task>...</Task> tags.
A plan to accomplish the task wrapped in <Plan>...</Plan>.

Example:
<Task>Craft a Wooden Sword</Task> 
<Plan>
  1. Check if a crafting table is available nearby.
  2. If no crafting table is available, craft one using the necessary materials.
  3. If the required materials are not available, gather wood from trees.
  4. Once enough wood is gathered, craft wooden planks.
  5. Use the wooden planks and sticks to craft the wooden sword at the crafting table.
  6. If you do not have sticks, craft them using wooden planks.
  7. Once the sword is crafted, retrieve it from the crafting table.
</Plan>


User input ${promptUser},
User Observation ${observationData},`,
    }),
  ];

  const taskMessage = await taskCreatorModel.invoke(prompt);
  return { messages: [taskMessage] };
}

async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
}

// --- Workflow ---
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("createTask", createTask)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge("__start__", "createTask")
  .addEdge("createTask", "agent")
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue);

// --- Compila e esporta ---
const memory = new MemorySaver();

const app = workflow.compile({ checkpointer: memory });
export default app;
