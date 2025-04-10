import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { bot } from "../index"; // Ensure './index' exists and exports 'bot'
const { GoalNear} = require('mineflayer-pathfinder').goals
const { Movements } = require('mineflayer-pathfinder');


const goToPlayer = tool(
    async (input): Promise<string> => {
        const mcData = require("minecraft-data")(bot.version);
        const player = bot.players[input.username]?.entity;
        if (!player) {
            return `I can't see ${input.username}`;
        }

        const distance = bot.entity.position.distanceTo(player.position);
        if (distance < 2) {
            return `I'm already close to ${input.username}`;
        }

        bot.pathfinder.setMovements(new Movements(bot, mcData));
        await bot.pathfinder.goto(new GoalNear(player.position.x, player.position.y, player.position.z, 1), (err: any) => {
            if (err) {
                console.error(err);
                return `I can't reach ${input.username}`;
            }
        });

        return `Following ${input.username}`;
    },
    {
        name: "goToPlayer",
        description: "Go to a player",
        schema: z.object({
            username: z.string(),
        }),
    }
);

export { goToPlayer };