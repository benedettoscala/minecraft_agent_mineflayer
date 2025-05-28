# 🧠 Minecraft AI Agent with Mineflayer & LangChain

An intelligent, modular AI agent for Minecraft, powered by [Mineflayer](https://github.com/PrismarineJS/mineflayer), [LangChain](https://www.langchain.com/), and natural language processing. The bot can interpret and execute user instructions written in natural language.

## 🚀 Features

- ✅ Natural language understanding and command execution  
- 🧱 Mining, placing, crafting, and inventory management  
- 🧭 Autonomous pathfinding and navigation  
- ⚔️ Mob detection and combat capabilities  
- 📦 Chest interaction (depositing and retrieving items)  
- 📸 Screenshot capture and image-based reasoning via Puppeteer  
- 🧠 Modular, tool-based reasoning using LangChain agents  

## 📁 Project Structure

```

minecraft\_agent\_mineflayer/
├── agent/                # LangChain agent and tool integration
├── tools/                # Custom Minecraft tools
├── utils/                # Code utils
└──  index.ts              # Main entry point

````

## 🛠️ Requirements

- Node.js 18+
- A Minecraft server (tested on version 1.20)
- An OpenAI API key

## 📦 Installation

```bash
git clone https://github.com/benedettoscala/minecraft_agent_mineflayer.git
cd minecraft_agent_mineflayer
npm install
````

### ⚙️ Environment Variables

Create a `.env` file in the root directory and define the following:

```env
OPENAI_API_KEY=your_openai_key
IP=your_server_ip
PORT=your_server_port
BOT_USERNAME=your_bot_username
```

## 🔧 Compile the TypeScript Code

```bash
tsc
```

## ▶️ Running the Bot

Start the bot with:

```bash
node build/index.js
```

## 💬 Example Commands

You can interact with the bot using natural language. Example prompts:

* `bot go near the tree`
* `bot break that stone block`
* `bot attack the zombie`
* `bot open the chest and get the sword`
* `bot craft a wooden pickaxe`

## 🧠 LangChain Agent Integration

The bot uses LangChain's agent framework to dynamically plan and execute tasks. Each Minecraft action (e.g., mining, following players, interacting with chests) is implemented as a LangChain tool with Zod validation schemas.

Based on the user's input, the agent selects the appropriate tool and executes the related Minecraft action.

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request. Please ensure that your code is clean, well-commented, and follows the existing structure.
