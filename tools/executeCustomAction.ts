import { tool } from "@langchain/core/tools";
import { z } from "zod";
const bot = require("../index").bot; // Ensure './index' exists and exports 'bot'

const executeCustomAction = tool(
    async (input) : Promise<string> => {
        try {
            console.log(input.code)
            //append the import of bot to the code
            input.code = `const {vec3} = require("vec3"); const bot = require("../index").bot; const mcData = require("minecraft-data")(bot.version); ` + input.code;
            await eval(input.code);
            
        } catch (error : any) {
            //return the stacktrace
            console.log(error.stack);
            return `Error executing custom action: ${error.stack}`;
        }
        return "Action executed successfully.";
    },
    {
        name: "executeCustomAction",
        description: "Use this tool to execute custom JavaScript code in the game using the Mineflayer API. This is useful for performing specific actions that are not supported by the predefined tools. Provide the exact code to be executed.",
        schema: z.object({
            code: z.string().describe("The code to execute."),
        }),
    }
);

export { executeCustomAction };