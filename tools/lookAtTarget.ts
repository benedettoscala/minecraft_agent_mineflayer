import { z } from "zod";
import { tool } from "@langchain/core/tools";

/**
 * Orienta il bot verso un’entità o verso le coordinate di un blocco.
 * Restituisce la stringa "oriented" se l’operazione va a buon fine.
 */
const lookAtTarget = tool(
  async (input): Promise<string> => {
    const bot = require("../index").bot;          // accesso al bot di mineflayer

    if ("entity" in input) {
      // Cerca la prima entità con quel nome
      const target = Object.values(bot.entities).find(
        (e: any) => e.name === input.entity
      ) as { position: { offset: (x: number, y: number, z: number) => any }, height: number } | undefined;
      if (!target) throw new Error(`Entity "${input.entity}" not found`);
      await bot.lookAt(target.position.offset(0, target.height / 2, 0), true);
    } else if ("blockPos" in input && input.blockPos) {
      const { x, y, z } = input.blockPos;
      await bot.lookAt({ x: x + 0.5, y: y + 0.5, z: z + 0.5 }, true); // centro del blocco
    } else {
      throw new Error("Either 'entity' or 'blockPos' must be provided");
    }

    return "oriented";
  },
  {
    name: "lookAtTarget",
    description:
      "Orient the bot toward an entity or a block position before taking a screenshot.",
    schema: z
      .object({
        entity: z.string().describe("Name of the entity to look at").optional(),
        blockPos: z
          .object({
            x: z.number().describe("X coordinate of the block"),
            y: z.number().describe("Y coordinate of the block"),
            z: z.number().describe("Z coordinate of the block"),
          })
          .optional(),
      })
      .refine((d) => d.entity || d.blockPos, {
        message: "Provide either 'entity' or 'blockPos'",
      }),
  },
);

export { lookAtTarget };
