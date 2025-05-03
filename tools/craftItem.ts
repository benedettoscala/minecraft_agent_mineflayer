import { z } from "zod";
import { tool } from "@langchain/core/tools";
const { GoalLookAtBlock } = require("mineflayer-pathfinder").goals;
const Item = require('prismarine-item')('1.8')
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

    if (itemByName.name === "crafting_table") {
      const recipe = bot.recipesFor(itemByName.id, null, 1, null)[0];
      if (!recipe) {
        throw new Error(`Gather some logs to make a crafting table. You need 4 planks (1 log = 4 planks)`);
      }
      bot.craft(recipe, 1, null);

      return `Crafted a crafting table`;
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
        
        throw new Error(
          "craftItem failed too many times, check chat log to see what happened"
        );
      }
      return "I cannot make " + name + ", but I couldn't determine why. Maybe there are some missing ingredients?";
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
