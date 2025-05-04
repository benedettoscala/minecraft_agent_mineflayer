import { z } from "zod";
import { tool } from "@langchain/core/tools";

const observationTool = async (): Promise<string> => {
  const bot = require("../index").bot;
  const { Observation } = require("../agent/observation"); // Assicurati che Observation sia esportato
  const observation = new Observation(bot);
  return observation.toString();
};

const checkObservation = tool(
  async (_input): Promise<string> => {
    return await observationTool();
  },
  {
    name: "checkObservation",
    description: `Check the current observation of the bot. This returns a string representation of the bot's state, like position, health, etc.`,
    schema: z.object({}), // Nessun input richiesto
  }
);

export { checkObservation };
