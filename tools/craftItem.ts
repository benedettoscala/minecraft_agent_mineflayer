import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { bot } from "../index";
const { GoalLookAtBlock } = require("mineflayer-pathfinder").goals;
const { Recipe } = require("prismarine-recipe");

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

    // 1. Get all available recipes (with or without crafting table)
    const recipes = bot.recipesFor(itemByName.id, null, count);
    if (!recipes || recipes.length === 0) {
      return `I cannot craft ${itemName} from the available materials.`;
    }

    // 2. Prefer a recipe that doesn't require crafting table
    let recipe: any = recipes.find((r: any) => r.requiresCraftingTable === false);

    // 3. If none is available, pick the first that requires a table
    if (!recipe) {
      recipe = recipes[0];
    }

    // 4. Handle crafting table if needed
    let craftingTable = null;
    if (recipe && recipe.requiresCraftingTable) {
      craftingTable = bot.findBlock({
        matching: mcData.blocksByName.crafting_table.id,
        maxDistance: 32,
      });

      if (!craftingTable) {
        if (itemName === "crafting_table") {
          // Special case: allow crafting crafting tables even if none is present
          craftingTable = null;
        } else {
          return `Crafting ${itemName} requires a crafting table, and none was found nearby.`;
        }
      } else {
        try {
          await bot.pathfinder.goto(new GoalLookAtBlock(craftingTable.position, bot.world));
        } catch (err: any) {
          return `Error navigating to the crafting table: ${err.message}`;
        }
      }
    }

    try {
      await bot.craft(recipe, count, craftingTable);
      return `Successfully crafted ${itemName} ${count} times.`;
    } catch (err: any) {
      return `Error crafting ${itemName} ${count} times: ${err.message}`;
    }
  },
  {
    name: "craftItem",
    description: "Craft an item using available materials. Will use crafting table if required.",
    schema: z.object({
      itemName: z.string().describe("The name of the item to craft"),
      count: z.number().optional().describe("The number of items to craft (default is 1)"),
    }),
  }
);

export { craftItem };
