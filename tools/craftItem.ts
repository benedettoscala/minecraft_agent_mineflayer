import { z } from "zod";
import { tool } from "@langchain/core/tools";
const { GoalLookAtBlock } = require("mineflayer-pathfinder").goals;

const { failedCraftFeedback } = require("../utils/craftHelper"); // Assicurati che esista questa funzione

let _craftItemFailCount = 0;

const craftItem = tool(
  async ({ name, count }): Promise<string> => {
    
    const bot = require("../index").bot;
    const mcData = require("minecraft-data")(bot.version); // Assicurati che bot.version sia disponibile

    if (typeof name !== "string") {
      throw new Error("name for craftItem must be a string");
    }
    if (typeof count !== "number" || count < 1) {
      throw new Error("count for craftItem must be a number >= 1");
    }

    const itemByName = mcData.itemsByName[name];
    if (!itemByName) {
      throw new Error(`No item named ${name}`);
    }

    const craftingTable = bot.findBlock({
      matching: mcData.blocksByName.crafting_table.id,
      maxDistance: 32,
    });

    if (!craftingTable) {
      bot.chat("Crafting without a crafting table");
    } else {
      await bot.pathfinder.goto(
        new GoalLookAtBlock(craftingTable.position, bot.world)
      );
    }

    const recipe = bot.recipesFor(itemByName.id, null, 1, craftingTable)[0];

    if (recipe) {
      bot.chat(`I can make ${name}`);
      try {
        await bot.craft(recipe, count, craftingTable);
        bot.chat(`I did the recipe for ${name} ${count} times`);
        return `Successfully crafted ${count} ${name}${count > 1 ? "s" : ""}`;
      } catch (err) {
        bot.chat(`I cannot do the recipe for ${name} ${count} times`);
        return `Failed to craft ${name} ${count} times`;
      }
    } else {
      
      _craftItemFailCount++;
      if (_craftItemFailCount > 10) {
        failedCraftFeedback(bot, name, itemByName, craftingTable); // ✅ Reinserita qui
        throw new Error(
          "craftItem failed too many times, check chat log to see what happened"
        );
      }
      return `Failed to find a valid recipe for ${name}`;
    }
  },
  {
    name: "craftItem",
    description: "Crafts a given item using available resources and a crafting table if needed",
    schema: z.object({
      name: z.string().describe("The name of the item to craft (e.g., wooden_sword, furnace)"),
      count: z.number().optional().default(1).describe("The number of items to craft"),
    }),
  }
);

export { craftItem };
