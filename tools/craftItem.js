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
exports.craftItem = void 0;
const zod_1 = require("zod");
const tools_1 = require("@langchain/core/tools");
const index_1 = require("../index");
const { GoalLookAtBlock } = require("mineflayer-pathfinder").goals;
let _craftItemFailCount = 0;
const craftItem = (0, tools_1.tool)((input) => __awaiter(void 0, void 0, void 0, function* () {
    const mcData = require("minecraft-data")(index_1.bot.version);
    const { itemName, count = 1 } = input;
    if (typeof itemName !== "string") {
        return `Item name must be a string.`;
    }
    if (typeof count !== "number") {
        return `Count must be a number.`;
    }
    const itemByName = mcData.itemsByName[itemName];
    if (!itemByName) {
        return `No item named ${itemName}`;
    }
    const craftingTable = index_1.bot.findBlock({
        matching: mcData.blocksByName.crafting_table.id,
        maxDistance: 32,
    });
    if (!craftingTable) {
        return `Crafting without a crafting table is not possible.`;
    }
    try {
        yield index_1.bot.pathfinder.goto(new GoalLookAtBlock(craftingTable.position, index_1.bot.world));
    }
    catch (err) {
        return `Error navigating to the crafting table: ${err.message}`;
    }
    const recipe = index_1.bot.recipesFor(itemByName.id, null, 1, craftingTable)[0];
    if (recipe) {
        try {
            yield index_1.bot.craft(recipe, count, craftingTable);
            return `Successfully crafted ${itemName} ${count} times.`;
        }
        catch (err) {
            return `Error crafting ${itemName} ${count} times: ${err.message}`;
        }
    }
    else {
        _craftItemFailCount++;
        if (_craftItemFailCount > 10) {
            return `Crafting failed too many times. Check the chat log for more information.`;
        }
        return `I cannot craft ${itemName} from the available materials.`;
    }
}), {
    name: "craftItem",
    description: "Craft an item using the available materials and a crafting table",
    schema: zod_1.z.object({
        itemName: zod_1.z.string().describe("The name of the item to craft"),
        count: zod_1.z.number().optional().describe("The number of items to craft (default is 1)"),
    }),
});
exports.craftItem = craftItem;
