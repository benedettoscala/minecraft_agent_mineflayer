import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { bot } from "../index";
import { Vec3 } from "vec3";
import { Movements } from "mineflayer-pathfinder";

const { GoalPlaceBlock } = require("mineflayer-pathfinder").goals;

let _placeItemFailCount = 0;

// Create a lock
const placeItems = tool(
  async (input): Promise<string> => {
    const mcData = require("minecraft-data")(bot.version);

    const { items } = input;

    if (!Array.isArray(items)) {
      return `Items must be an array.`;
    }

    let failedPlacements = [];
    let placedItems = [];

    for (const itemInfo of items) {
      const { itemName, position } = itemInfo;

      if (typeof itemName !== "string") {
        failedPlacements.push(`Item name must be a string for position ${JSON.stringify(position)}`);
        continue;
      }

      const vec3Pos = new Vec3(position.x, position.y, position.z);
      const itemByName = mcData.itemsByName[itemName];
      if (!itemByName) {
        failedPlacements.push(`No item named ${itemName} for position ${JSON.stringify(position)}`);
        continue;
      }

      const item = bot.inventory.findInventoryItem(itemByName.id);
      if (!item) {
        failedPlacements.push(`No ${itemName} in inventory for position ${JSON.stringify(position)}`);
        continue;
      }

      const item_count = item.count;

      const faceVectors = [
        new Vec3(0, 1, 0),
        new Vec3(0, -1, 0),
        new Vec3(1, 0, 0),
        new Vec3(-1, 0, 0),
        new Vec3(0, 0, 1),
        new Vec3(0, 0, -1),
      ];

      let referenceBlock = null;
      let faceVector = null;
      for (const vector of faceVectors) {
        const block = bot.blockAt(vec3Pos.minus(vector));
        if (block?.name !== "air") {
          referenceBlock = block;
          faceVector = vector;
          break;
        }
      }

      if (!referenceBlock) {
        _placeItemFailCount++;
        if (_placeItemFailCount > 10) {
          return `Too many placement failures. Cannot place a floating block.`;
        }
        failedPlacements.push(`No block to place ${itemName} on at position ${JSON.stringify(position)}.`);
        continue;
      }

      try {
        bot.pathfinder.setMovements(new Movements(bot));
        await bot.pathfinder.goto(new GoalPlaceBlock(vec3Pos, bot.world, {}));
        await bot.equip(item, "hand");
        await bot.placeBlock(referenceBlock, faceVector);
        placedItems.push(`Placed ${itemName} at position ${JSON.stringify(position)}`);
      } catch (err: any) {
        const stillHasItem = bot.inventory.findInventoryItem(itemByName.id);
        if (stillHasItem?.count === item_count) {
          _placeItemFailCount++;
          if (_placeItemFailCount > 10) {
            return `Too many placement failures. Try a different position.`;
          }
          failedPlacements.push(`Error placing ${itemName} at position ${JSON.stringify(position)}: ${err.message}`);
        } else {
          placedItems.push(`Placed ${itemName} at position ${JSON.stringify(position)} (after inventory changed).`);
        }
      }
    }

    if (failedPlacements.length > 0) {
      return `Failed to place the following items:\n${failedPlacements.join("\n")}`;
    } else {
      return `Successfully placed the following items:\n${placedItems.join("\n")}`;
    }
  },
  {
    name: "placeItems",
    description: "Place multiple items from the inventory at specific positions in the world",
    schema: z.object({
      items: z.array(
        z.object({
          itemName: z.string().describe("Name of the item to place from inventory"),
          position: z.object({
            x: z.number(),
            y: z.number(),
            z: z.number(),
          }).describe("The world position (Vec3) where the item should be placed"),
        })
      ).describe("An array of items and their respective positions to place"),
    }),
  }
);

export { placeItems };
