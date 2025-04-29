

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
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { checkItemInsideChestTool, depositItemIntoChestTool, getItemFromChestTool } from "../tools/useChest";

// Define the tools for the agent to use
const tools = [ goToPlayer, mineBlockTool, placeItems, craftItem, killMob, smeltItem, executeCustomAction, checkItemInsideChestTool, depositItemIntoChestTool, getItemFromChestTool];
const toolNode = new ToolNode(tools);

// Create a model and give it access to the tools
const model = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0,
}).bindTools(tools);

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
  if (!task) return true; // No task defined

  const responseText = typeof lastAIMessage.content === "string" ? lastAIMessage.content.toLowerCase() : "";

  return responseText.includes("task completed") || responseText.includes("<fail>");
}

function shouldContinue({ messages }: typeof MessagesAnnotation.State) {
  const lastMessage = messages[messages.length - 1] as AIMessage;

  // If tool calls are present, continue with tools
  if (lastMessage.tool_calls?.length) {
    return "tools";
  }

  // If a task exists and it's not complete, continue
  const task = extractTask(messages);
  if (task && !isTaskCompleteOrFailed(messages)) {
    return "agent";
  }

  const bot = require("../index").bot; // Ensure './index' exists and exports 'bot'
  const message = extractMessage(messages);
  if(message) {
    bot.chat(message);
  }
  // Otherwise, we're done
  return "__end__";
}


// Define the function that calls the model
async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke(state.messages);

  // We return a list, because this will get added to the existing list
  return { messages: [response] };
}

// Define a new graph
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addEdge("__start__", "agent") // __start__ is a special name for the entrypoint
  .addNode("tools", toolNode)
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue);

// Finally, we compile it into a LangChain Runnable.
const app = workflow.compile();

export default app;
