import { tool } from "@langchain/core/tools";
import { z } from "zod";


const executeCustomAction = tool(
    async (input) : Promise<string> => {
        try {
            console.log(input.code)
            //append the import of bot to the code
            input.code = `const {vec3} = require("vec3"); const mcData = require("minecraft-data")(bot.version); const bot = require("../index").bot;` + input.code;
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
        description: "Execute a custom action with code in the game using the mineflayer api. You should import the necessary library at the beginning of the code.",
        schema: z.object({
            code: z.string().describe("The code to execute."),
        }),
    }
);

export { executeCustomAction };