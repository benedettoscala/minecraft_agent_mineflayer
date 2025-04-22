import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { bot } from "../index"; // Assicurati che questo esporti 'bot'
import { waitForMobRemoved, waitForMobShot } from "../utils/mobutils";
const { GoalNear } = require("mineflayer-pathfinder").goals;
const { Movements } = require("mineflayer-pathfinder");

let _killMobFailCount = 0;

const weaponsForShooting = [
  "bow",
  "crossbow",
  "snowball",
  "ender_pearl",
  "egg",
  "splash_potion",
  "trident",
];

const killMob = tool(
  async ({ mobName, timeout }): Promise<string> => {
    if (typeof mobName !== "string") {
      throw new Error(`mobName must be a string`);
    }

    if (typeof timeout !== "number") {
      throw new Error(`timeout must be a number`);
    }

    const mainHandItem = bot.inventory.slots[bot.getEquipmentDestSlot("hand")];

    const entity = bot.nearestEntity(
      (entity : any) =>
        entity.name === mobName &&
        entity.position.distanceTo(bot.entity.position) < 48
    );

    if (!entity) {
      _killMobFailCount++;
      if (_killMobFailCount > 10) {
        throw new Error(
          `killMob failed too many times. Explore before calling killMob.`
        );
      }
      return `No ${mobName} nearby, please explore first.`;
    }

    let droppedItem;
    if (mainHandItem && weaponsForShooting.includes(mainHandItem.name)) {
      bot.hawkEye.autoAttack(entity, mainHandItem.name);
      droppedItem = await waitForMobShot(bot, entity, timeout);
    } else {
      await bot.pvp.attack(entity);
      droppedItem = await waitForMobRemoved(bot, entity, timeout);
    }

    if (droppedItem) {
      await bot.collectBlock.collect(droppedItem, { ignoreNoPath: true });
    }

    bot.save(`${mobName}_killed`);
    return `Successfully killed a ${mobName}`;
  },
  {
    name: "killMob",
    description: "Kills a nearby mob of the given type",
    schema: z.object({
      mobName: z.string().describe("The name of the mob to kill (e.g., zombie, skeleton)"),
      timeout: z.number().optional().default(300).describe("Optional timeout for waiting after attack"),
    }),
  }
);

export { killMob };
