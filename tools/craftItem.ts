import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { Observation } from "../agent/observation";
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
        throw new Error(`To craft a crafting table convert some logs (oak_log, etc.) in planks (oak_planks, etc.). You need 1 log to do that`);
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
      let attemptedCount = count;

      try {
        await bot.craft(recipe, attemptedCount, craftingTable);
        bot.chat(`I did the recipe for ${name} ${attemptedCount} times`);
        return `Successfully crafted ${attemptedCount} ${name}${attemptedCount > 1 ? "s" : ""}`;
        
      } catch (err) {
        const obs = new Observation(bot);
        return `You crafted some ${name} but not all of them in the count. In your inventory, there is now ${obs.getInventoryItems().toString()}`;
      }
    } else {
      
      _craftItemFailCount++;
      if (_craftItemFailCount > 10) {
        
        throw new Error(
          "craftItem failed too many times, check chat log to see what happened"
        );
      }
      return failedCraftFeedback(bot, name, itemByName, craftingTable);
    }
  },
  {
    name: "craftItem",
    description: "Crafts a given item using available resources and a crafting table if needed",
    schema: z.object({
      name: z.string().describe("The name of the item to craft (e.g., wooden_sword, furnace)"),
      count: z.number().optional().default(1).describe("The number of items to craft."),
    }),
  }
);

export { craftItem };
