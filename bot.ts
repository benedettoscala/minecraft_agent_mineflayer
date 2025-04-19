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
    
        bot.viewer.drawText('greeting', 'Ciao mondo!', { x: 244, y: 65, z: 501 }, 0xffff00, 2)
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
            messageLower = "username: " + username + " " + messageLower;

            const base64image = await makeScreenshot();
            

            askAgentImage(base64image, messageLower).then((response) => {
                bot.chat(response);
            }).catch((error) => {
                console.error("Error:", error);
                bot.chat("An error occurred while processing your request.");
            });
        }
    });

    bot.loadPlugin(require('mineflayer-pathfinder').pathfinder);
    bot.loadPlugin(require('mineflayer-collectblock').plugin);

    return bot;
}

type CharMap = Record<string, string[]>

/**
 * Mappa base per lettere pixelate 5x5
 */
const charMap: CharMap = {
  'A': [
    ' 1 ',
    '1 1',
    '111',
    '1 1',
    '1 1'
  ],
  // Aggiungi altre lettere se vuoi
}
import { Vec3 } from 'vec3'
/**
 * Disegna un testo 3D con punti usando drawPoints
 */
function drawText(
  bot: Bot,
  text: string,
  basePosition: Vec3,
  idPrefix = 'text',
  color = 0x00ff00,
  size = 5
): void {
  const points: Vec3[] = []
  const spacing = 6

  for (let i = 0; i < text.length; i++) {
    const char = text[i].toUpperCase()
    const glyph = charMap[char]
    if (!glyph) continue

    for (let y = 0; y < glyph.length; y++) {
      for (let x = 0; x < glyph[y].length; x++) {
        if (glyph[y][x] === '1') {
          const point = basePosition.offset(x + i * spacing, -y, 0)
          points.push(point)
        }
      }
    }
  }

  // @ts-ignore: drawPoints is dynamically added by prismarine-viewer
  bot.viewer.drawPoints(`${idPrefix}_${text}`, points, color, size)
}


