import { Bot } from "mineflayer";
import { askAgent, askAgentImage } from "./agent";

const mineflayer = require('mineflayer');
const { mineflayer: mineflayerViewer } = require('prismarine-viewer')
const dotenv = require('dotenv');
import puppeteer, { Page } from "puppeteer"
dotenv.config();





let browser
let page: Page;
async function setupBrowser() {
  browser = await puppeteer.launch()
  page = await browser.newPage()
  await page.goto('http://localhost:9333')
}

async function makeScreenshot() {
  if (page) {
    const base64Image = await page.screenshot({
      fullPage: true,
      encoding: 'base64'
    });
    return 'data:image/jpeg;base64,' + base64Image;
  }
  return null;
}

export function connect(port = process.env.port) {
    setupBrowser().then(() => {
        console.log("Browser setup complete for minecraft screenshots")
    });

    const bot = mineflayer.createBot({
        host: process.env.IP ?? 'localhost',
        port: port ?? 25565,
        username: process.env.USERNAME ?? 'Bot',
    });

    console.log(process.env.OPENAI_API_KEY);
    bot.once('spawn', () => {
        console.log(`Connected to server on port ${process.env.port?.toString()}`);
    });

    

    const { Vec3 } = require('vec3')



    bot.once('spawn', () => {
        const basePos = bot.entity.position.offset(0, 2, 0)

        mineflayerViewer(bot, { port: 9333, firstPerson: true }) // crea il viewer
    
        //bot.viewer.drawText('greeting', 'Ciao mondo!', { x: 244, y: 65, z: 501 }, 0xffff00, 2)
        bot.loadPlugin(require('mineflayer-pathfinder').pathfinder);
        bot.loadPlugin(require('mineflayer-collectblock').plugin);
        bot.loadPlugin(require('mineflayer-pvp').plugin);
        
    })

    bot.on('chat', async (username:string, message:string) => {
        if (username === bot.username) return;

        let messageLower = message.toLowerCase();

        if (messageLower === 'hello') {
            bot.chat(`Hello, ${username}!`);
        } else if (messageLower.includes("donna")) {
            //guarda due blocchi sopra il player
            const player = bot.players[username]?.entity;
            bot.lookAt(player.position.offset(0, 2, 0), true);
            

            messageLower = messageLower.replace("donna", "");
            messageLower = "the player named " + username + " asked: " + messageLower;

            const base64image = await makeScreenshot();
            
            if (base64image) {
                askAgentImage(base64image, messageLower).then((response) => {
                    bot.chat(response);
                }).catch((error) => {
                    console.error("Error:", error);
                    bot.chat("An error occurred while processing your request.");
                });
            } else {
                bot.chat("Unable to capture a screenshot. Please try again.");
            }
        }
    });

    
    const minecraftHawkEye = require('minecrafthawkeye');
    bot.loadPlugin(minecraftHawkEye);

    return bot;
}
