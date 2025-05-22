import { z } from "zod";
import { tool } from "@langchain/core/tools";

const coordinateRegex = /\b(x\s*:\s*\d+|y\s*:\s*\d+|z\s*:\s*\d+)\b/i;

const needVisionShim = tool(
  async () => "<ignored>",
  {
    name: "need_vision",
    description: `Triggers the bot's vision system to analyze the current scene. You must specify a block or entity to focus on using the appropriate parameters.`,
    schema: z.object({
      prompt: z
        .string()
        .optional()
        .refine(
          val => !val || !coordinateRegex.test(val),
          { message: "Do not include coordinates in the prompt. Use blockPos instead." }
        )
        .describe("Describe what the bot should observe. Do NOT include coordinates or entity names here."),

      entity: z
        .string()
        .describe("Exact name of the entity the bot should look at (e.g., 'zombie', 'player123'). If 'null', the bot will use the blockPos instead."),

      blockPos: z
        .object({
          x: z.number(),
          y: z.number(),
          z: z.number(),
        })
        .describe("3D coordinates of the block the bot should face before triggering vision. If 'null', the bot will use the entity instead."),
    }),
  }
);

export { needVisionShim };
