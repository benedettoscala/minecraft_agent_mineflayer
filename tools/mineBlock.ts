import { any, z } from "zod";
import { tool } from "@langchain/core/tools";
const collectBlock = require("mineflayer-collectblock").plugin;
const toolPlugin = require("mineflayer-tool").plugin;

const mineBlockTool = tool(
  async (input): Promise<string> => {
    const bot = require("../index").bot;
    const mcData = require("minecraft-data")(bot.version);

    const blockInfo = mcData.blocksByName[input.blockName];
    if (!blockInfo) {
      return `${input.blockName} is not a valid block name.`;
    }

    const ids = [blockInfo.id];
    const blocks = bot.findBlocks({
      matching: ids,
      maxDistance: 128,
      count: input.count ?? 1,
    });

    if (blocks.length === 0) {
      return `I don't see any ${input.blockName} nearby.`;
    }

    const targets = blocks
      .slice(0, input.count ?? 1)
      .map((pos: any) => bot.blockAt(pos));

    bot.loadPlugin(collectBlock);
    bot.loadPlugin(toolPlugin);

    // Controllo se serve un tool specifico
    const harvestTools = blockInfo.harvestTools;
    if (harvestTools) {
      const requiredItemIds = Object.keys(harvestTools).map(id => parseInt(id));
      const hasTool = bot.inventory.items().some((item: any) => requiredItemIds.includes(item.type));

      if (!hasTool) {
        const requiredNames = requiredItemIds.map(id => mcData.items[id].name).join(", ");
        return `You need one of the following tools to mine ${input.blockName}, but I don't have any of them: ${requiredNames}. Try to craft it, if you can.`;
      }

      // Equipaggia automaticamente il tool giusto
      try {
        await bot.tool.equipForBlock(targets[0], {});
      } catch (e: any) {
        return `I couldn't equip the proper tool: ${e.message}`;
      }
    }

    // Procede con il mining
    try {
      await bot.collectBlock.collect(targets, {
        ignoreNoPath: true,
        count: input.count ?? 1,
      });
      return `Successfully collected ${input.count ?? 1} ${input.blockName}(s).`;
    } catch (err: any) {
      console.error(err);
      return `Error collecting ${input.blockName}: ${err.message}`;
    }
  },
  {
    name: "mineBlock",
    description: "Mine a specific block near the bot",
    schema: z.object({
      blockName: z.string().describe("The name of the Minecraft block to mine"),
      count: z.number().optional().describe("The number of blocks to mine (default is 1)"),
    }),
  }
);

export { mineBlockTool };
