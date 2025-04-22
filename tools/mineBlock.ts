import { z } from "zod";
import { tool } from "@langchain/core/tools";
const bot = require("../index").bot; // Ensure './index' exists and exports 'bot'
const collectBlock = require("mineflayer-collectblock").plugin;
const toolPlugin = require("mineflayer-tool").plugin;

const mineBlockTool = tool(
  async (input): Promise<string> => {
    const bot = require("../index").bot; // Ensure './index' exists and exports 'bot'
    const mcData = require("minecraft-data")(bot.version);

    if (mcData.blocksByName[input.blockName] === undefined) {
      return `${input.blockName} is not a valid block name.`;
    }

    const ids = [mcData.blocksByName[input.blockName].id];
    const blocks = bot.findBlocks({
      matching: ids,
      maxDistance: 128,
      count: input.count ?? 1,
    });

    if (blocks.length === 0) {
      return `I don't see any ${input.blockName} nearby.`;
    }

    const targets = blocks.slice(0, input.count ?? 1).map((pos : any) => bot.blockAt(pos));

    bot.loadPlugin(collectBlock);
    bot.loadPlugin(toolPlugin);

    try {
      await bot.collectBlock.collect(targets, {
            ignoreNoPath: true,
            count: input.count ?? 1,
        })
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
