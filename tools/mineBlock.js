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
exports.mineBlockTool = void 0;
const zod_1 = require("zod");
const tools_1 = require("@langchain/core/tools");
const index_1 = require("../index"); // Assicurati che il bot sia correttamente esportato da index.ts
const collectBlock = require("mineflayer-collectblock").plugin;
const toolPlugin = require("mineflayer-tool").plugin;
const mineBlockTool = (0, tools_1.tool)((input) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const mcData = require("minecraft-data")(index_1.bot.version);
    if (mcData.blocksByName[input.blockName] === undefined) {
        return `${input.blockName} is not a valid block name.`;
    }
    const ids = [mcData.blocksByName[input.blockName].id];
    const blocks = index_1.bot.findBlocks({
        matching: ids,
        maxDistance: 128,
        count: (_a = input.count) !== null && _a !== void 0 ? _a : 1,
    });
    if (blocks.length === 0) {
        return `I don't see any ${input.blockName} nearby.`;
    }
    const targets = blocks.slice(0, (_b = input.count) !== null && _b !== void 0 ? _b : 1).map((pos) => index_1.bot.blockAt(pos));
    index_1.bot.loadPlugin(collectBlock);
    index_1.bot.loadPlugin(toolPlugin);
    try {
        yield index_1.bot.collectBlock.collect(targets, {
            ignoreNoPath: true,
            count: (_c = input.count) !== null && _c !== void 0 ? _c : 1,
        });
        return `Successfully collected ${(_d = input.count) !== null && _d !== void 0 ? _d : 1} ${input.blockName}(s).`;
    }
    catch (err) {
        console.error(err);
        return `Error collecting ${input.blockName}: ${err.message}`;
    }
}), {
    name: "mineBlock",
    description: "Mine a specific block near the bot",
    schema: zod_1.z.object({
        blockName: zod_1.z.string().describe("The name of the Minecraft block to mine"),
        count: zod_1.z.number().optional().describe("The number of blocks to mine (default is 1)"),
    }),
});
exports.mineBlockTool = mineBlockTool;
