import { Bot } from "mineflayer";
import { askAgent } from "../agent/agent";
import dotenv from "dotenv";
import puppeteer, { Browser, Page } from "puppeteer";

const mineflayer = require("mineflayer");
const { mineflayer: mineflayerViewer } = require("prismarine-viewer");
const { pathfinder } = require("mineflayer-pathfinder");
const collectBlock = require("mineflayer-collectblock").plugin;
const pvp = require("mineflayer-pvp").plugin;
const minecraftHawkEye = require("minecrafthawkeye");
const { Vec3 } = require("vec3");

dotenv.config();

let browser: Browser;
let page: Page;
let lastHealthAlertTime = 0;

async function setupBrowser() {
  browser = await puppeteer.launch();
  page = await browser.newPage();
  await page.goto("http://localhost:9333");
  console.log("Browser setup complete for Minecraft screenshots");
}

async function makeScreenshot(): Promise<string | null> {
  if (!page) return null;

  const base64Image = await page.screenshot({
    fullPage: true,
    encoding: "base64",
  });

  return "data:image/jpeg;base64," + base64Image;
}

export function connect(port = Number(process.env.PORT) || 25565): Bot {
  setupBrowser();

  const bot: Bot = mineflayer.createBot({
    host: process.env.IP ?? "localhost",
    port,
    username: process.env.USERNAME ?? "Bot",
  });

  bot.once("spawn", () => {
    console.log(`Connected to server on port ${port}`);

    // Viewer setup
    mineflayerViewer(bot, { port: 9333, firstPerson: true });

    // Load plugins
    bot.loadPlugin(pathfinder);
    bot.loadPlugin(collectBlock);
    bot.loadPlugin(pvp);
    bot.loadPlugin(minecraftHawkEye);
  });



  bot.on("health", () => {
    const now = Date.now();
    const healthThreshold = 20;
    const cooldown = 20 * 1000; // 20 seconds in milliseconds

    if (bot.health < healthThreshold && (now - lastHealthAlertTime > cooldown)) {
      lastHealthAlertTime = now;

      bot.chat("I'm in danger!");
      const prompt = `<status>Something is attacking me. My health is ${bot.health}</status>`;
      askAgent("", prompt).then((response) => {
        bot.chat(response.toString());
      });
    }
  });



  bot.on("chat", async (username: string, message: string) => {
    if (username === bot.username) return;

    const messageLower = message.toLowerCase();

    if (messageLower === "hello") {
      bot.chat(`Hello, ${username}!`);
    } else if (messageLower.includes("donna")) {
      const player = bot.players[username]?.entity;
      if (!player) return;

      await bot.lookAt(player.position.offset(0, 2, 0), true);

      const prompt = `The player named ${username} asked: ${messageLower.replace("donna", "").trim()}`;
      const base64Image = await makeScreenshot();

      if (base64Image) {
        try {
          const response = await askAgent(base64Image, prompt);
          bot.chat(response.toString());
        } catch (error) {
          console.error("Error:", error);
          bot.chat("An error occurred while processing your request.");
        }
      } else {
        bot.chat("Unable to capture a screenshot. Please try again.");
      }
    }
  });

  return bot;
}
