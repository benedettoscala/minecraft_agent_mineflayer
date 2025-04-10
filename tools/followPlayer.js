"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.goToPlayer = void 0;
const zod_1 = require("zod");
const tools_1 = require("@langchain/core/tools");
const index_1 = require("../index"); // Ensure './index' exists and exports 'bot'
const { GoalNear } = require('mineflayer-pathfinder').goals;
const { Movements } = require('mineflayer-pathfinder');
const goToPlayer = (0, tools_1.tool)((input) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const mcData = require("minecraft-data")(index_1.bot.version);
    const player = (_a = index_1.bot.players[input.username]) === null || _a === void 0 ? void 0 : _a.entity;
    if (!player) {
        return `I can't see ${input.username}`;
    }
    const distance = index_1.bot.entity.position.distanceTo(player.position);
    if (distance < 2) {
        return `I'm already close to ${input.username}`;
    }
    index_1.bot.pathfinder.setMovements(new Movements(index_1.bot, mcData));
    yield index_1.bot.pathfinder.goto(new GoalNear(player.position.x, player.position.y, player.position.z, 1), (err) => {
        if (err) {
            console.error(err);
            return `I can't reach ${input.username}`;
        }
    });
    return `Following ${input.username}`;
}), {
    name: "goToPlayer",
    description: "Go to a player",
    schema: zod_1.z.object({
        username: zod_1.z.string(),
    }),
});
exports.goToPlayer = goToPlayer;
