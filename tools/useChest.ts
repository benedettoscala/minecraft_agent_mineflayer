import { z } from "zod";
import { tool } from "@langchain/core/tools";
const { GoalLookAtBlock } = require("mineflayer-pathfinder").goals;
const Vec3 = require("vec3");

//
// Helper: trova la chest più vicina
//
async function findNearestChest(bot: any): Promise<any> {
  const chestPositions = bot.findBlocks({
    matching: (block: { name: string; }) => block && block.name === "chest",
    maxDistance: 32,
    count: 10,
  });

  if (chestPositions.length === 0) {
    throw new Error("No chest found nearby.");
  }

  const nearestPos = chestPositions.sort(
    (a: { distanceTo: (arg0: any) => number; }, b: { distanceTo: (arg0: any) => number; }) => a.distanceTo(bot.entity.position) - b.distanceTo(bot.entity.position)
  )[0];

  const chestBlock = bot.blockAt(nearestPos);
  await bot.pathfinder.goto(new GoalLookAtBlock(chestBlock.position, bot.world, {}));
  return chestBlock;
}

//
// Helper: chiudi la chest
//
async function closeChest(bot: any, chestBlock: any): Promise<void> {
  try {
    const chest = await bot.openContainer(chestBlock);
    await chest.close();
  } catch (err) {
    try {
      await bot.closeWindow(chestBlock);
    } catch {}
  }
}

//
// Tool: getItemFromChest
//
const getItemFromChestTool = tool(
    async ({ items }: { items: { name: string; quantity: number }[] }) => {
      const bot = require("../index").bot;
      const mcData = require("minecraft-data")(bot.version);
  
      try {
        const chestBlock = await findNearestChest(bot);
        const chest = await bot.openContainer(chestBlock);
  
        for (const { name, quantity } of items) {
          if (quantity <= 0) continue;
  
          const itemDef = mcData.itemsByName[name];
          if (!itemDef) return `Item ${name} is not valid.`;
  
          const item = chest.findContainerItem(itemDef.id);
          if (!item) return `${name} not found in chest.`;
  
          await chest.withdraw(item.type, null, quantity);
        }
  
        await closeChest(bot, chestBlock);
        return `Successfully withdrew items: ${items.map(i => `${i.quantity}x ${i.name}`).join(", ")}`;
      } catch (err: any) {
        console.error(err.stack);
        return `Error: ${err.message}`;
      }
    },
    {
      name: "getItemFromNearestChest",
      description: "Withdraw specific items from the nearest chest",
      schema: z.object({
        items: z.array(
          z.object({
            name: z.string().describe("The name of the item to withdraw"),
            quantity: z.number().min(1).describe("The quantity to withdraw"),
          })
        ),
      }),
    }
  );

//
// Tool: depositItemIntoChest
//
//
// Tool: depositItemIntoNearestChestTool
//
const depositItemIntoChestTool = tool(
    async ({ items }: { items: { name: string; quantity: number }[] }) => {
      const bot = require("../index").bot;
      const mcData = require("minecraft-data")(bot.version);
  
      try {
        const chestBlock = await findNearestChest(bot);
        const chest = await bot.openContainer(chestBlock);
  
        for (const { name, quantity } of items) {
          const itemDef = mcData.itemsByName[name];
          if (!itemDef) return `Item ${name} is not valid.`;
  
          const item = bot.inventory.findInventoryItem(itemDef.id);
          if (!item) return `${name} not found in inventory.`;
  
          await chest.deposit(item.type, null, quantity);
        }
  
        await chest.close();
        return `Successfully deposited items: ${items
          .map(i => `${i.quantity}x ${i.name}`)
          .join(", ")}`;
      } catch (err: any) {
        console.error(err.stack);
        return `Error: ${err.message}`;
      }
    },
    {
      name: "depositItemIntoNearestChest",
      description: "Deposit specific items into the nearest chest",
      schema: z.object({
        items: z
          .array(
            z.object({
              name: z.string().describe("Item name, e.g., cobblestone"),
              quantity: z.number().min(1).describe("Amount of the item to deposit"),
            })
          )
          .describe("List of items and quantities to deposit"),
      }),
    }
  );

//
// Tool: checkItemInsideChest
//
const checkItemInsideChestTool = tool(
  async () => {
    const bot = require("../index").bot;

    try {
      const chestBlock = await findNearestChest(bot);
      const chest = await bot.openContainer(chestBlock);
      const contents = chest.containerItems();

      await closeChest(bot, chestBlock);

      if (contents.length === 0) return "Chest is empty.";

      const summary = contents.map((i: any) => `${i.count}x ${i.name}`).join(", ");
      return `Chest contains: ${summary}`;
    } catch (err: any) {
        console.error(err.stack);
      return `Error: ${err.message}`;
    }
  },
  {
    name: "checkItemsInNearestChest",
    description: "List the items inside the nearest chest",
    schema: z.object({}),
  }
);

//
// Export tools
//
export {
  getItemFromChestTool,
  depositItemIntoChestTool,
  checkItemInsideChestTool
};
