import { tool } from "@langchain/core/tools";
import { z } from "zod";
const botInstance = require("../index").bot;
const vec3 = require("vec3");

import { getLastEvalError, setLastEvalError } from "../utils/errorStore";

const executeCustomAction = tool(
  async (input): Promise<string> => {
    try {
      setLastEvalError(null); // Reset errori globali

      const asyncWrapperFn = new Function("require", "vec3", `
        return (async () => {
          const bot = require("../index").bot;
          const mcData = require("minecraft-data")(bot.version);

          try {
            ${input.code}
          } catch (err) {
            return '<TASK_FAILED>Errore nel codice utente (catch): ' + (err?.message || err) + '</TASK_FAILED>';
          }
        })();
      `);

      // Passiamo require e vec3
      const result = await asyncWrapperFn(require, vec3);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const errorFromGlobals = getLastEvalError();
      if (errorFromGlobals) {
        return `<TASK_FAILED>Errore nell'esecuzione: ${errorFromGlobals}</TASK_FAILED>`;
      }

      if (result == null) {
        return "<TASK_COMPLETED>Azione eseguita con successo, ma non è stato restituito alcun risultato.</TASK_COMPLETED>";
      }

      return typeof result === "string" ? result : JSON.stringify(result);
    } catch (error: any) {
      return `<TASK_FAILED>Errore interno nell'esecuzione del tool: ${error.stack}</TASK_FAILED>`;
    }
  },
  {
    name: "executeCustomAction",
    description: `You can provide custom JavaScript code to control the Mineflayer bot using the full Mineflayer API.
Your code will be wrapped inside an async function and executed with access to the following preloaded variables:
- require: standard Node.js require function
- vec3: the vector utility from 'vec3'
- bot: the Mineflayer bot instance (via require("../index").bot)
- mcData: the Minecraft data for the current version (via require("minecraft-data"))

Your code **must use async/await**, not callbacks, and must always return a string as the final result.  
If you define a helper function (e.g., \`async function action() { ... }\`), you **must call it with \`return await action();\`** at the end.  
Do **not** just write \`action();\` or \`await action();\` — the tool will not receive any output in that case.

✅ Correct example:
\`\`\`js
async function spin() {
  // logic here
  return '<TASK_COMPLETED>Spin completed</TASK_COMPLETED>';
}
return await spin();
\`\`\`

❌ Incorrect example:
\`\`\`js
async function spin() {
  return '<TASK_COMPLETED>Spin completed</TASK_COMPLETED>';
}
spin(); // ⛔ won't return anything to the tool
\`\`\`
`,
    schema: z.object({
      code: z.string().describe("Mineflayer JS code to execute"),
    }),
  }
);

export { executeCustomAction };
