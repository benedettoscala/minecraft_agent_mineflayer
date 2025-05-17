import { z } from "zod";
import { tool } from "@langchain/core/tools";

const checkObservation = tool(
  async (_input): Promise<string> => {
    const bot = require("../index").bot;
    const { Observation } = require("../agent/observation"); // Assicurati che Observation sia esportato
    const observation = new Observation(bot, _input.x_distance, _input.y_distance, _input.z_distance);
    return observation.toString();
  },
  {
    name: "checkObservation",
    description: `Check the current observation of the bot. This returns a string representation of the bot's state, like position, health, etc.`,
    schema: z.object({
      x_distance: z.number().optional().describe("The x distance in blocks to check the observation"), // Distanza opzionale
      y_distance: z.number().optional().describe("The y distance in blocks to check the observation"), // Distanza opzionale
      z_distance: z.number().optional().describe("The z distance in blocks to check the observation"), // Distanza opzionale
    }), // Nessun input richiesto
  }
);

export { checkObservation };
