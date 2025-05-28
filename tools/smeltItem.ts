import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { goals } from "mineflayer-pathfinder";
const { GoalLookAtBlock } = goals;

const smeltItem = tool(
  async ({ itemName, fuelName, count = 1 }) => {
    const { bot } = require("../index");
    const mcData = require("minecraft-data")(bot.version);

    // --- Validate item and fuel existence ----------------------------------
    const item = mcData.itemsByName[itemName];
    const fuelItem = mcData.itemsByName[fuelName];

    if (!item) throw new Error(`No item named "${itemName}"`);
    if (!fuelItem) throw new Error(`No fuel item named "${fuelName}"`);
    if (count < 1) throw new Error("Count must be >= 1");

    // --- Locate the nearest furnace ---------------------------------------
    const furnaceBlock = bot.findBlock({
      matching: mcData.blocksByName.furnace.id,
      maxDistance: 32,
    });
    if (!furnaceBlock) throw new Error("No furnace found within 32 blocks");

    await bot.pathfinder.goto(new GoalLookAtBlock(furnaceBlock.position, bot.world));

    // --- Check item availability in inventory ------------------------------
    const have = bot.inventory.count(item.id, null, true);
    if (have === 0) {
      throw new Error(`You don't have any ${itemName}. Inventory: ${
        bot.inventory.items().map((i: any) => `${i.name} (${i.count})`).join(", ")
      }`);
    }

    const todo = Math.min(count, have);

    const furnace = await bot.openFurnace(furnaceBlock);

    // --- Burn time calculation ---------------------------------------------
    const SECONDS_PER_ITEM = 10;

    const fallbackFuelTimes: Record<string, number> = {
  // --- High-Efficiency Fuels ---
  lava_bucket: 1000,
  block_of_coal: 800,
  dried_kelp_block: 200,
  blaze_rod: 120,
  coal: 80,
  charcoal: 80,

  // --- Logs (15s each) ---
  oak_log: 15,
  spruce_log: 15,
  birch_log: 15,
  jungle_log: 15,
  acacia_log: 15,
  dark_oak_log: 15,
  mangrove_log: 15,
  cherry_log: 15,
  crimson_stem: 15,
  warped_stem: 15,

  // --- Wooden Planks (15s each) ---
  oak_planks: 15,
  spruce_planks: 15,
  birch_planks: 15,
  jungle_planks: 15,
  acacia_planks: 15,
  dark_oak_planks: 15,
  mangrove_planks: 15,
  cherry_planks: 15,
  crimson_planks: 15,
  warped_planks: 15,

  // --- Wooden Items (15s each) ---
  crafting_table: 15,
  cartography_table: 15,
  fletching_table: 15,
  smithing_table: 15,
  loom: 15,
  bookshelf: 15,
  lectern: 15,
  composter: 15,
  chest: 15,
  trapped_chest: 15,
  barrel: 15,
  jukebox: 15,
  note_block: 15,
  ladder: 15,
  fence: 15,
  fence_gate: 15,
  wooden_stairs: 15,
  wooden_trapdoor: 15,
  wooden_pressure_plate: 15,
  wooden_door: 15,
  sign: 15,
  banner: 15,
  daylight_detector: 15,

  // --- Wooden Tools & Weapons (10s each) ---
  wooden_sword: 10,
  wooden_shovel: 10,
  wooden_pickaxe: 10,
  wooden_axe: 10,
  wooden_hoe: 10,

  // --- Short-Duration Fuels ---
  stick: 5,
  sapling: 5,
  bowl: 5,
  wooden_button: 5,
  wool: 5,
  carpet: 3.35,
  bamboo: 2.5,
  scaffolding: 2.5,
};


    const burnSecondsPerFuel =
      (fuelItem as any).fuelTime !== undefined
        ? (fuelItem as any).fuelTime / 20
        : fallbackFuelTimes[fuelItem.name] ?? 0;

    if (burnSecondsPerFuel === 0) {
      furnace.close();
      throw new Error(`${fuelName} is not a valid or supported fuel.`);
    }

    const secondsNeeded = todo * SECONDS_PER_ITEM;
    const secondsLeft = furnace.fuelSeconds;
    const secondsShort = Math.max(0, secondsNeeded - secondsLeft);
    const fuelNeed = Math.ceil(secondsShort / burnSecondsPerFuel);

    const fuelCount = bot.inventory.count(fuelItem.id, null, true);
    if (fuelNeed > 0 && fuelCount < fuelNeed) {
      furnace.close();
      throw new Error(`Not enough ${fuelName}. Needed: ${fuelNeed}, Available: ${fuelCount}`);
    }

    // --- Load fuel and input items into furnace ----------------------------
    if (fuelNeed > 0) await furnace.putFuel(fuelItem.id, null, fuelNeed);
    await furnace.putInput(item.id, null, todo);

    // --- Wait for smelting to complete -------------------------------------
    let done = 0;
    return await new Promise((resolve, reject) => {
      const onUpdate = async () => {
        if (furnace.outputItem()) {
          await furnace.takeOutput();
          done += 1;
          if (done >= todo) {
            furnace.removeListener("update", onUpdate);
            furnace.removeListener("close", onClose);
            furnace.close();
            bot.chat(`Smelted ${done} ${itemName}`);
            resolve(`Successfully smelted ${done} ${itemName}.`);
          }
        }
      };

      const onClose = () => {
        furnace.removeListener("update", onUpdate);
        reject(new Error("Furnace closed before smelting was complete"));
      };

      furnace.on("update", onUpdate);
      furnace.once("close", onClose);
    });
  },
  {
    name: "smeltItem",
    description: "Smelts an item using the specified fuel in a nearby furnace.",
    schema: z.object({
      itemName: z.string().describe("Name of the item to smelt (e.g. raw_iron, etc.)"),
      fuelName: z.string().describe("Name of the fuel to use (e.g. coal, lava_bucket, oak_log)"),
      count: z.number().int().min(1).default(1).describe("Number of items to smelt"),
    }),
  }
);

export { smeltItem };
