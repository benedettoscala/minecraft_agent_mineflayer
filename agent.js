"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.askAgentImage = askAgentImage;
exports.askAgent = askAgent;
const openai_1 = require("@langchain/openai");
const langgraph_1 = require("@langchain/langgraph");
const messages_1 = require("@langchain/core/messages");
const prebuilt_1 = require("@langchain/langgraph/prebuilt");
const zod_1 = require("zod");
const tools_1 = require("@langchain/core/tools");
const followPlayer_1 = require("./tools/followPlayer");
const mineBlock_1 = require("./tools/mineBlock");
const placeItem_1 = require("./tools/placeItem");
const observation_1 = require("./observation");
const executeCustomAction_1 = require("./tools/executeCustomAction");
const craftItem_1 = require("./tools/craftItem");
// Assicurati che il bot sia correttamente esportato da index.ts
// Tool e modello
const adderSchema = zod_1.z.object({
    a: zod_1.z.number(),
    b: zod_1.z.number(),
});
const adderTool = (0, tools_1.tool)((input) => __awaiter(void 0, void 0, void 0, function* () {
    const sum = input.a + input.b;
    return `The sum of ${input.a} and ${input.b} is ${sum}`;
}), {
    name: "adder",
    description: "Adds two numbers together",
    schema: adderSchema,
});
const agentTools = [adderTool, followPlayer_1.goToPlayer, mineBlock_1.mineBlockTool, placeItem_1.placeItems, executeCustomAction_1.executeCustomAction, craftItem_1.craftItem];
const agentModel = new openai_1.ChatOpenAI({ model: "gpt-4o", temperature: 0.7 });
const agentCheckpointer = new langgraph_1.MemorySaver();
const agent = (0, prebuilt_1.createReactAgent)({
    tools: agentTools,
    llm: agentModel,
    checkpointer: agentCheckpointer,
});
function askAgentImage(base64Image, prompt) {
    return __awaiter(this, void 0, void 0, function* () {
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
        const obs = new observation_1.Observation(bot);
        console.log("Observation of the game status: " + obs.toString() + "\n");
        // Messaggi
        const systemMessage = new messages_1.SystemMessage({
            content: [
                {
                    type: "text",
                    text: "You are a Minecraft bot that can perform various tasks. You think that you are an actual Player. You can use the tools available to you to accomplish these tasks.",
                },
            ],
        });
        const systemMessageWithObservation = new messages_1.SystemMessage({
            content: [
                {
                    type: "text",
                    text: "Observation of the game status: " + obs.toString() + "\n",
                },
            ],
        });
        const message = new messages_1.HumanMessage({
            content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: base64Image } },
            ],
        });
        // Invocazione dell'agente
        const response = yield agent.invoke({
            messages: [systemMessage, systemMessageWithObservation, message],
        }, { configurable: { thread_id: 42 } });
        const llmresponse = response.messages[response.messages.length - 1].content;
        return llmresponse;
    });
}
function askAgent(imagePath, prompt) {
    return __awaiter(this, void 0, void 0, function* () {
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
        const obs = new observation_1.Observation(bot);
        const message = new messages_1.HumanMessage({
            content: [
                { type: "text", text: prompt }
            ],
        });
        const systemMessage = new messages_1.SystemMessage({
            content: [
                { type: "text", text: "You are a Minecraft bot that can perform various tasks. You think that you are an actual Player. You can use the tools available to you to accomplish these tasks." }
            ],
        });
        console.log("Observation of the game status: " + obs.toString() + "\n");
        //system message with the observation
        const systemMessageWithObservation = new messages_1.SystemMessage({
            content: [
                { type: "text", text: "Observation of the game status: " + obs.toString() + "\n" }
            ],
        });
        const response = yield agent.invoke({
            messages: [systemMessage, systemMessageWithObservation, message],
        }, { configurable: { thread_id: 42 } });
        const llmresponse = response.messages[response.messages.length - 1].content;
        return llmresponse;
    });
}
