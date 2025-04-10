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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connect = connect;
const agent_1 = require("./agent");
const mineflayer = require('mineflayer');
const { mineflayer: mineflayerViewer } = require('prismarine-viewer');
const dotenv = require('dotenv');
const puppeteer_1 = __importDefault(require("puppeteer"));
dotenv.config();
let browser;
let page;
function setupBrowser() {
    return __awaiter(this, void 0, void 0, function* () {
        browser = yield puppeteer_1.default.launch();
        page = yield browser.newPage();
        yield page.goto('http://localhost:9333');
    });
}
function makeScreenshot() {
    return __awaiter(this, void 0, void 0, function* () {
        if (page) {
            const base64Image = yield page.screenshot({
                fullPage: true,
                encoding: 'base64'
            });
            return 'data:image/jpeg;base64,' + base64Image;
        }
        return null;
    });
}
function connect(port = process.env.port) {
    var _a, _b;
    setupBrowser().then(() => {
        console.log("Browser setup complete for minecraft screenshots");
    });
    const bot = mineflayer.createBot({
        host: (_a = process.env.IP) !== null && _a !== void 0 ? _a : 'localhost',
        port: port !== null && port !== void 0 ? port : 25565,
        username: (_b = process.env.USERNAME) !== null && _b !== void 0 ? _b : 'Bot',
    });
    console.log(process.env.OPENAI_API_KEY);
    bot.once('spawn', () => {
        var _a;
        console.log(`Connected to server on port ${(_a = process.env.port) === null || _a === void 0 ? void 0 : _a.toString()}`);
    });
    mineflayerViewer(bot, { port: 9333, firstPerson: false }); // crea il viewer
    bot.on('chat', (username, message) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (username === bot.username)
            return;
        let messageLower = message.toLowerCase();
        if (messageLower === 'hello') {
            bot.chat(`Hello, ${username}!`);
        }
        else if (messageLower.includes("donna")) {
            //guarda due blocchi sopra il player
            const player = (_a = bot.players[username]) === null || _a === void 0 ? void 0 : _a.entity;
            bot.lookAt(player.position.offset(0, 2, 0), true);
            messageLower = messageLower.replace("donna", "");
            messageLower = "username: " + username + " " + messageLower;
            const base64image = yield makeScreenshot();
            (0, agent_1.askAgent)(base64image, messageLower).then((response) => {
                bot.chat(response);
            }).catch((error) => {
                console.error("Error:", error);
                bot.chat("An error occurred while processing your request.");
            });
        }
    }));
    bot.loadPlugin(require('mineflayer-pathfinder').pathfinder);
    bot.loadPlugin(require('mineflayer-collectblock').plugin);
    return bot;
}
