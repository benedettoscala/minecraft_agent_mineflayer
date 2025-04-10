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
exports.placeItems = void 0;
const zod_1 = require("zod");
const tools_1 = require("@langchain/core/tools");
const index_1 = require("../index");
const vec3_1 = require("vec3");
const mineflayer_pathfinder_1 = require("mineflayer-pathfinder");
const { GoalPlaceBlock } = require("mineflayer-pathfinder").goals;
let _placeItemFailCount = 0;
// Create a lock
const placeItems = (0, tools_1.tool)((input) => __awaiter(void 0, void 0, void 0, function* () {
    const mcData = require("minecraft-data")(index_1.bot.version);
    const { items } = input;
    if (!Array.isArray(items)) {
        return `Items must be an array.`;
    }
    let failedPlacements = [];
    let placedItems = [];
    for (const itemInfo of items) {
        const { itemName, position } = itemInfo;
        if (typeof itemName !== "string") {
            failedPlacements.push(`Item name must be a string for position ${JSON.stringify(position)}`);
            continue;
        }
        const vec3Pos = new vec3_1.Vec3(position.x, position.y, position.z);
        const itemByName = mcData.itemsByName[itemName];
        if (!itemByName) {
            failedPlacements.push(`No item named ${itemName} for position ${JSON.stringify(position)}`);
            continue;
        }
        const item = index_1.bot.inventory.findInventoryItem(itemByName.id);
        if (!item) {
            failedPlacements.push(`No ${itemName} in inventory for position ${JSON.stringify(position)}`);
            continue;
        }
        const item_count = item.count;
        const faceVectors = [
            new vec3_1.Vec3(0, 1, 0),
            new vec3_1.Vec3(0, -1, 0),
            new vec3_1.Vec3(1, 0, 0),
            new vec3_1.Vec3(-1, 0, 0),
            new vec3_1.Vec3(0, 0, 1),
            new vec3_1.Vec3(0, 0, -1),
        ];
        let referenceBlock = null;
        let faceVector = null;
        for (const vector of faceVectors) {
            const block = index_1.bot.blockAt(vec3Pos.minus(vector));
            if ((block === null || block === void 0 ? void 0 : block.name) !== "air") {
                referenceBlock = block;
                faceVector = vector;
                break;
            }
        }
        if (!referenceBlock) {
            _placeItemFailCount++;
            if (_placeItemFailCount > 10) {
                return `Too many placement failures. Cannot place a floating block.`;
            }
            failedPlacements.push(`No block to place ${itemName} on at position ${JSON.stringify(position)}.`);
            continue;
        }
        try {
            index_1.bot.pathfinder.setMovements(new mineflayer_pathfinder_1.Movements(index_1.bot));
            yield index_1.bot.pathfinder.goto(new GoalPlaceBlock(vec3Pos, index_1.bot.world, {}));
            yield index_1.bot.equip(item, "hand");
            yield index_1.bot.placeBlock(referenceBlock, faceVector);
            placedItems.push(`Placed ${itemName} at position ${JSON.stringify(position)}`);
        }
        catch (err) {
            const stillHasItem = index_1.bot.inventory.findInventoryItem(itemByName.id);
            if ((stillHasItem === null || stillHasItem === void 0 ? void 0 : stillHasItem.count) === item_count) {
                _placeItemFailCount++;
                if (_placeItemFailCount > 10) {
                    return `Too many placement failures. Try a different position.`;
                }
                failedPlacements.push(`Error placing ${itemName} at position ${JSON.stringify(position)}: ${err.message}`);
            }
            else {
                placedItems.push(`Placed ${itemName} at position ${JSON.stringify(position)} (after inventory changed).`);
            }
        }
    }
    if (failedPlacements.length > 0) {
        return `Failed to place the following items:\n${failedPlacements.join("\n")}`;
    }
    else {
        return `Successfully placed the following items:\n${placedItems.join("\n")}`;
    }
}), {
    name: "placeItems",
    description: "Place multiple items from the inventory at specific positions in the world",
    schema: zod_1.z.object({
        items: zod_1.z.array(zod_1.z.object({
            itemName: zod_1.z.string().describe("Name of the item to place from inventory"),
            position: zod_1.z.object({
                x: zod_1.z.number(),
                y: zod_1.z.number(),
                z: zod_1.z.number(),
            }).describe("The world position (Vec3) where the item should be placed"),
        })).describe("An array of items and their respective positions to place"),
    }),
});
exports.placeItems = placeItems;
