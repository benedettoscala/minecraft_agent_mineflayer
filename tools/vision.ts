import { any, z } from "zod";
import { tool } from "@langchain/core/tools";

const coordinateRegex = /\b(x\s*:\s*\d+|y\s*:\s*\d+|z\s*:\s*\d+)\b/i;

const needVisionShim = tool(
  async ({ entity, blockPos, direction }) => {
    const bot = require("../index").bot;

    if (direction) {
      const yawPitchMap: Record<string, [number, number]> = {
        north: [Math.PI, 0],
        south: [0, 0],
        east: [-Math.PI / 2, 0],
        west: [Math.PI / 2, 0],
        up: [bot.entity.yaw, -Math.PI / 2],
        down: [bot.entity.yaw, Math.PI / 2],
      };

      const [yaw, pitch] = yawPitchMap[direction.toLowerCase()] || [bot.entity.yaw, 0];
      bot.look(yaw, pitch, true);
    } else if (entity !== "null") {
      const target = bot.nearestEntity((e: any) => e.name === entity);
      if (target) bot.lookAt(target.position.offset(0, target.height / 2, 0));
    } else if (blockPos) {
      const pos = new (require("vec3"))(blockPos.x, blockPos.y, blockPos.z);
      bot.lookAt(pos);
    }

    bot.chat("I am currently looking at something. Please wait a moment while I think of what to say.");
    return "<ignored>";
  },
  {
    name: "need_vision",
    description: `Triggers the bot's vision system to analyze the current scene. You must specify a block, entity, or direction to focus on.`,
    schema: z.object({
      prompt: z
        .string()
        .optional()
        .refine(
          val => !val || !coordinateRegex.test(val),
          { message: "Do not include coordinates in the prompt. Use blockPos instead." }
        )
        .describe("Describe what the bot should observe. Do NOT include coordinates or entity names here."),

      entity: z
        .string()
        .describe("Exact name of the entity the bot should look at (e.g., 'zombie', 'player123'). If 'null', the bot will use the blockPos or direction instead."),

      blockPos: z
        .object({
          x: z.number(),
          y: z.number(),
          z: z.number(),
        })
        .nullable()
        .describe("3D coordinates of the block the bot should face before triggering vision. If 'null', direction or entity will be used instead."),

      direction: z
        .enum(["north", "south", "east", "west", "up", "down"])
        .optional()
        .describe("Optional absolute direction for the bot to look at. Ignored if blockPos or entity is used."),
    }),
  }
);

export { needVisionShim };
