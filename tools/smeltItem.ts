import { z } from "zod";
import { tool } from "@langchain/core/tools";
const { GoalLookAtBlock } = require("mineflayer-pathfinder").goals;



let _smeltItemFailCount = 0;

const smeltItem = tool(
  async ({ itemName, fuelName, count }): Promise<string> => {
    const bot = require("../index").bot;
    const mcData = require("minecraft-data")(bot.version);
    if (typeof itemName !== "string" || typeof fuelName !== "string") {
      throw new Error("itemName and fuelName must both be strings");
    }
    if (typeof count !== "number" || count < 1) {
      throw new Error("count must be a number >= 1");
    }

    const item = mcData.itemsByName[itemName];
    const fuel = mcData.itemsByName[fuelName];
    if (!item) throw new Error(`No item named ${itemName}`);
    if (!fuel) throw new Error(`No item named ${fuelName}`);

    const furnaceBlock = bot.findBlock({
      matching: mcData.blocksByName.furnace.id,
      maxDistance: 32,
    });

    if (!furnaceBlock) {
      throw new Error("No furnace nearby");
    } else {
      await bot.pathfinder.goto(
        new GoalLookAtBlock(furnaceBlock.position, bot.world)
      );
    }

    const furnace = await bot.openFurnace(furnaceBlock);
    let successCount = 0;

    for (let i = 0; i < count; i++) {
      if (!bot.inventory.findInventoryItem(item.id, null)) {
        bot.chat(`No ${itemName} to smelt in inventory`);
        break;
      }

      if (furnace.fuelSeconds < 15 && furnace.fuelItem()?.name !== fuelName) {
        if (!bot.inventory.findInventoryItem(fuel.id, null)) {
          bot.chat(`No ${fuelName} as fuel in inventory`);
          break;
        }

        await furnace.putFuel(fuel.id, null, 1);
        await bot.waitForTicks(20);

        if (!furnace.fuel && furnace.fuelItem()?.name !== fuelName) {
          throw new Error(`${fuelName} is not a valid fuel`);
        }
      }

      await furnace.putInput(item.id, null, 1);
      await bot.waitForTicks(12 * 20); // Smelting time

      if (!furnace.outputItem()) {
        throw new Error(`${itemName} is not a valid input`);
      }

      await furnace.takeOutput();
      successCount++;
    }

    furnace.close();

    if (successCount > 0) {
      bot.chat(`Smelted ${successCount} ${itemName}.`);
      return `Successfully smelted ${successCount} ${itemName}.`;
    } else {
      bot.chat(`Failed to smelt ${itemName}, please check the fuel and input.`);
      _smeltItemFailCount++;
      if (_smeltItemFailCount > 10) {
        throw new Error(
          `smeltItem failed too many times, please check the fuel and input.`
        );
      }
      return `Failed to smelt ${itemName}.`;
    }
  },
  {
    name: "smeltItem",
    description: "Smelts an item in a nearby furnace using the given fuel.",
    schema: z.object({
      itemName: z
        .string()
        .describe("The name of the item to smelt (e.g., iron_ore, raw_porkchop)"),
      fuelName: z
        .string()
        .describe("The name of the fuel to use (e.g., coal, lava_bucket)"),
      count: z
        .number()
        .optional()
        .default(1)
        .describe("The number of times to perform the smelting operation."),
    }),
  }
);

export { smeltItem };
