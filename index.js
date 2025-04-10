"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bot = void 0;
const bot_1 = require("./bot");
const bot = (0, bot_1.connect)(process.env.port);
exports.bot = bot;
