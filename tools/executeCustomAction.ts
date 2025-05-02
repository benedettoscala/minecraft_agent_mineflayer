import { tool } from "@langchain/core/tools";
import { z } from "zod";
const bot = require("../index").bot; // Ensure './index' exists and exports 'bot'

import { getLastEvalError, setLastEvalError } from '../utils/errorStore';

const executeCustomAction = tool(
    async (input): Promise<string> => {
        try {
            setLastEvalError(null); // resetta prima dell’eval

            const codeToEval = `
                (async () => {
                    const { vec3 } = require("vec3");
                    const bot = require("../index").bot;
                    const mcData = require("minecraft-data")(bot.version);

                    try {
                        ${input.code}
                    } catch (err) {
                        return 'Errore nel codice utente (catch): ' + (err?.message || err);
                    }
                })()
            `;

            const result = await eval(codeToEval);
            
            //aspetta 1 secondo per dare tempo al codice di eseguire eventuali errori
            await new Promise(resolve => setTimeout(resolve, 1000));

            const errorFromGlobals = getLastEvalError();
            if (errorFromGlobals) {
                return `Errore nell'esecuzione: ${errorFromGlobals}`;
            }

            return typeof result === "string" ? result : JSON.stringify(result);
        } catch (error: any) {
            return `Errore interno nell'esecuzione del tool: ${error.stack}`;
        }
    },
    {
        name: "executeCustomAction",
        description: `Esegue codice JS Mineflayer personalizzato. Il tuo codice è avvolto in un blocco try/catch.
Gli errori globali (es. assert, promise non gestite) vengono intercettati automaticamente e restituiti.`,
        schema: z.object({
            code: z.string().describe("Codice JS da eseguire. Usa `return '...'` per descrivere l'azione."),
        }),
    }
);


export { executeCustomAction };