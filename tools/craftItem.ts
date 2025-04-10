import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { bot } from "../index";
import { Movements } from "mineflayer-pathfinder";
const {GoalLookAtBlock} = require("mineflayer-pathfinder").goals;


let _craftItemFailCount = 0;

const craftItem = tool(
  async (input): Promise<string> => {
    const mcData = require("minecraft-data")(bot.version);

    const { itemName, count = 1 } = input;

    if (typeof itemName !== "string") {
      return `Item name must be a string.`;
    }

    if (typeof count !== "number") {
      return `Count must be a number.`;
    }

    const itemByName = mcData.itemsByName[itemName];
    if (!itemByName) {
      return `No item named ${itemName}`;
    }

    const craftingTable = bot.findBlock({
      matching: mcData.blocksByName.crafting_table.id,
      maxDistance: 32,
    });

    if (!craftingTable) {
      return `Crafting without a crafting table is not possible.`;
    }

    try {
      await bot.pathfinder.goto(new GoalLookAtBlock(craftingTable.position, bot.world));
    } catch (err : any) {
      return `Error navigating to the crafting table: ${err.message}`;
    }

    const recipe = bot.recipesFor(itemByName.id, null, 1, craftingTable)[0];
    if (recipe) {
      try {
        await bot.craft(recipe, count, craftingTable);
        return `Successfully crafted ${itemName} ${count} times.`;
      } catch (err : any) {
        return `Error crafting ${itemName} ${count} times: ${err.message}`;
      }
    } else {
      _craftItemFailCount++;
      if (_craftItemFailCount > 10) {
        return `Crafting failed too many times. Check the chat log for more information.`;
      }
      return `I cannot craft ${itemName} from the available materials.`;
    }
  },
  {
    name: "craftItem",
    description: "Craft an item using the available materials and a crafting table",
    schema: z.object({
      itemName: z.string().describe("The name of the item to craft"),
      count: z.number().optional().describe("The number of items to craft (default is 1)"),
    }),
  }
);

export { craftItem };
