import { z } from "zod";
import { tool } from "@langchain/core/tools";

const needVisionShim = tool(
  async () => "<ignored>",
  {
    name: "need_vision",
    description: `Request a screenshot from the bot. You can specify a direction by having the bot look at an entity or a specific block position, and you can also include a textual prompt to describe what the bot should focus on or extract from the scene.

- prompt?: string → textual prompt describing what to observe or analyze (do not include directional information here like "Look at the obsidian block located at coordinates x:310, y:133, z:606 and tell me the color" instead a prompt should be like "What is the color of the obsidian block?").
- entity?: string → name of the entity to look at (e.g., "zombie")
- blockPos?: {x, y, z} → coordinates of the block to look at (center of the block)

If both 'entity' and 'blockPos' are provided, the bot will prioritize the entity. Use the direction fields ('entity' or 'blockPos') to control where the bot looks — the prompt is only for describing what to analyze.`
,
    schema: z
      .object({
        prompt: z.string().optional(),
        entity: z.string().optional(),
        blockPos: z
          .object({
            x: z.number(),
            y: z.number(),
            z: z.number(),
          })
          .optional(),
      })
  },
);

export { needVisionShim };
