import { z } from "zod";
import { tool } from "@langchain/core/tools";

import { waitForMobRemoved, waitForMobShot } from "../utils/mobutils";
const { GoalNear } = require("mineflayer-pathfinder").goals;
const { Movements } = require("mineflayer-pathfinder");
const bot = require("../index").bot; // Ensure './index' exists and exports 'bot'

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
  async ({ mobName, timeout, count }): Promise<string> => {
    const bot = require("../index").bot; // Ensure './index' exists and exports 'bot'
    
    if (typeof mobName !== "string") {
      throw new Error(`mobName must be a string`);
    }

    if (typeof timeout !== "number") {
      throw new Error(`timeout must be a number`);
    }

    if (typeof count !== "number" || count < 1) {
      throw new Error(`count must be a number >= 1`);
    }

    let killed = 0;

    while (killed < count) {
      let mainHandItem = bot.inventory.slots[bot.getEquipmentDestSlot("hand")];

      // Equipaggia spada se non hai un'arma a distanza
      if (!mainHandItem || !weaponsForShooting.includes(mainHandItem.name)) {
        const sword = bot.inventory.items().find((item: { name: string | string[]; }) =>
          item.name.includes("sword")
        );

        if (sword) {
          await bot.equip(sword, "hand");
          mainHandItem = sword;
        }
      }

      const entity = bot.nearestEntity(
        (entity: any) =>
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
        return `No ${mobName} nearby, please explore first. (${killed}/${count} killed)`;
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

      killed++;
    }

    bot.save(`${mobName}_${count}_killed`);
    return `Successfully killed ${count} ${mobName}${count > 1 ? "s" : ""}`;
  },
  {
    name: "killMob",
    description: "Kills a nearby mob of the given type",
    schema: z.object({
      mobName: z.string().describe("The name of the mob to kill (e.g., zombie, skeleton)"),
      timeout: z.number().optional().default(300).describe("Optional timeout for waiting after attack"),
      count: z.number().optional().default(1).describe("The number of mobs to kill"),
    }),
  }
);

export { killMob };
