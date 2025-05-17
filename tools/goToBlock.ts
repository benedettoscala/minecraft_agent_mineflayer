import { z } from "zod";
import { tool } from "@langchain/core/tools";
const { GoalNear } = require("mineflayer-pathfinder").goals;
const { Movements } = require("mineflayer-pathfinder");
const { Vec3 } = require("vec3");

// Re‑use the singleton bot instance exported from your main entrypoint

/**
 * LangChain tool that moves the bot to exact Minecraft world coordinates.
 * The path‑finding radius is set to 1 block, so the bot will finish when it is
 * within one block of the target position.
 */
const goToPosition = tool(
  async (input): Promise<string> => {
    console.log("goToPosition input", input);

    const { x, y, z } = {
      x: input.x,
      y: input.y,
      z: input.z,
    };
    console.log("goToPosition numbers", x, y, z);
    const bot = require("../index").bot;

    // Basic validation
    if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) {
      return "Coordinates must all be valid numbers.";
    }

    const target = new Vec3(x, y, z);
    const distance = bot.entity.position.distanceTo(target);

    if (distance < 1) {
      return "I'm already at the target position.";
    }

    // Configure default movements
    const mcData = require("minecraft-data")(bot.version);
    bot.pathfinder.setMovements(new Movements(bot, mcData));

    // Attempt to reach the location
    try {
      await bot.pathfinder.goto(new GoalNear(x, y, z, 1));
    } catch (err) {
      console.error(err);
      return `I can't reach the target position (${x}, ${y}, ${z}).`;
    }

    // Face the direction of travel once arrived
    bot.lookAt(target.offset(0, 1.62, 0), true);

    return `I reached the position (${x}, ${y}, ${z}).`;
  },
  {
    name: "goToPosition",
    description: "Move the bot to specific world coordinates (x, y, z).",
    schema: z.object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
    }),
  }
);

/**
 * LangChain tool that moves the bot onto the nearest block that matches
 * the provided Minecraft block name. The search radius is configurable
 * (default 64 blocks). The bot stops when it is within one block of the
 * target block's center.
 */
const goToBlock = tool(
  async (input): Promise<string> => {
    console.log("goToBlock input", input);
    const { blockName, maxDistance = 64 } = input;
    const bot = require("../index").bot;

    // Validate block name
    if (typeof blockName !== "string" || blockName.trim().length === 0) {
      return "Block name must be a non‑empty string.";
    }

    // Resolve the block ID for the bot's Minecraft version
    const mcData = require("minecraft-data")(bot.version);
    const blockData = mcData.blocksByName[blockName];
    if (!blockData) {
      return `Block name "${blockName}" is not valid for Minecraft version ${bot.version}.`;
    }

    // Search for the nearest matching block
    const targetBlock = bot.findBlock({
      matching: blockData.id,
      maxDistance,
    });

    if (!targetBlock) {
      return `No block named "${blockName}" found within ${maxDistance} blocks.`;
    }

    const { x, y, z } = targetBlock.position;

    // Configure path‑finding movements
    bot.pathfinder.setMovements(new Movements(bot, mcData));

    // Attempt to reach the block
    try {
      await bot.pathfinder.goto(new GoalNear(x, y, z, 1));
    } catch (err) {
      console.error(err);
      return `I can't reach the ${blockName} at (${x}, ${y}, ${z}).`;
    }

    // Face the block once arrived
    bot.lookAt(targetBlock.position.offset(0.5, 0.5, 0.5), true);

    return `I reached the ${blockName} at (${x}, ${y}, ${z}).`;
  },
  {
    name: "goToBlock",
    description: "Move the bot onto the nearest block that matches the given block name.",
    schema: z.object({
      blockName: z
        .string()
        .describe("Exact Minecraft block identifier, e.g. 'minecraft:diamond_ore' or 'oak_planks'"),
      maxDistance: z.number().optional().default(64),
    }),
  }
);

export { goToPosition, goToBlock };
