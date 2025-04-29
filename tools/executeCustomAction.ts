import { tool } from "@langchain/core/tools";
import { z } from "zod";
const bot = require("../index").bot; // Ensure './index' exists and exports 'bot'

const executeCustomAction = tool(
    async (input): Promise<string> => {
        try {
            console.log(input.code);
            const codeToEval = `
                const { vec3 } = require("vec3");
                const bot = require("../index").bot;
                const mcData = require("minecraft-data")(bot.version);
                ${input.code}
            `;
            const result = await eval(`(() => { ${codeToEval} })()`);
            return typeof result === "string" ? result : JSON.stringify(result);
        } catch (error: any) {
            console.log(error.stack);
            return `Error executing custom action: ${error.stack}`;
        }
    },
    {
        name: "executeCustomAction",
        description: `Use this tool to execute custom JavaScript code in the game using the Mineflayer API. 
This is useful for performing specific actions that are not supported by the predefined tools. 
Provide the exact code to be executed. 
**Make sure your code returns a string or a description of what the bot did**, otherwise no feedback will be shown.`,
        schema: z.object({
            code: z.string().describe("The code to execute. It must return a string describing the action taken."),
        }),
    }
);

export { executeCustomAction };