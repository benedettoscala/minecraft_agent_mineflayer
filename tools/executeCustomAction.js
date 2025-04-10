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
exports.executeCustomAction = void 0;
const tools_1 = require("@langchain/core/tools");
const zod_1 = require("zod");
const executeCustomAction = (0, tools_1.tool)((input) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log(input.code);
        //append the import of bot to the code
        input.code = `const {vec3} = require("vec3");; const bot = require("../index").bot;` + input.code;
        eval(input.code);
    }
    catch (error) {
        //return the stacktrace
        console.log(error.stack);
        return `Error executing custom action: ${error.stack}`;
    }
    return "Action executed successfully.";
}), {
    name: "executeCustomAction",
    description: "Execute a custom action with code in the game using the mineflayer api. You should import the necessary library at the beginning of the code.",
    schema: zod_1.z.object({
        code: zod_1.z.string().describe("The code to execute."),
    }),
});
exports.executeCustomAction = executeCustomAction;
