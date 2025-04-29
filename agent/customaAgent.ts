

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

// Define the tools for the agent to use
const tools = [ goToPlayer, mineBlockTool, placeItems, craftItem, killMob, smeltItem, executeCustomAction];
const toolNode = new ToolNode(tools);

// Create a model and give it access to the tools
const model = new ChatOpenAI({
  model: "gpt-4o-mini",
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

function isTaskComplete(messages: (AIMessage | HumanMessage)[]): boolean {
  const lastAIMessage = messages.slice().reverse().find((m) => m._getType() === "ai") as AIMessage | undefined;
  if (!lastAIMessage) return false;

  const task = extractTask(messages);
  if (!task) return true; // No task defined

  const responseText = typeof lastAIMessage.content === "string" ? lastAIMessage.content.toLowerCase() : "";
  // Define your logic to decide if task is "complete"
  return responseText.includes("Task Complete");
}

function shouldContinue({ messages }: typeof MessagesAnnotation.State) {
  const lastMessage = messages[messages.length - 1] as AIMessage;

  // If tool calls are present, continue with tools
  if (lastMessage.tool_calls?.length) {
    return "tools";
  }

  // If a task exists and it's not complete, continue
  const task = extractTask(messages);
  if (task && !isTaskComplete(messages)) {
    return "agent";
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
