
# 🧠 Minecraft AI Agent with Mineflayer & LangChain

An intelligent, modular AI agent for Minecraft built with [Mineflayer](https://github.com/PrismarineJS/mineflayer), [LangChain](https://www.langchain.com/), and natural language tools. The bot can understand and execute user commands written in natural language.

## 🚀 Features

- ✅ Natural language command interpretation
- 🧱 Block mining, placing, crafting, and inventory management
- 🧭 Autonomous navigation and pathfinding
- ⚔️ Mob detection and combat
- 📦 Chest interaction (deposit and withdraw items)
- 📸 Screenshot and image-based reasoning via Puppeteer
- 🧠 Modular tool-based reasoning with LangChain

## 📁 Project Structure

```

minecraft\_agent\_mineflayer/
├── agent/                # LangChain agent and tool integration
├── tools/                # Custom Minecraft tools
├── plugins/              # Mineflayer plugins (e.g. pathfinder, pvp)
├── screenshots/          # Puppeteer screenshot utilities
├── index.ts              # Main entry point
├── bot.ts                # Bot creation and initialization
├── langchain.config.ts   # LangChain agent setup
└── ...

````

## 🛠️ Requirements

- Node.js 18+
- A Minecraft server (tested with version 1.19.4)
- OpenAI API key
- Puppeteer for image-based tools

## 📦 Installation

```bash
git clone https://github.com/benedettoscala/minecraft_agent_mineflayer.git
cd minecraft_agent_mineflayer
npm install
````

### ⚙️ Environment Variables

Create a `.env` file in the root folder and add your API key:

```env
OPENAI_API_KEY=your_openai_key
```

## ▶️ Running the Bot

```bash
npm run start
```

## 💡 Example Commands

You can speak to the agent using natural language. Examples:

* "bot Go near the tree"
* "bot Break that stone block"
* "bot Attack the zombie"
* "bot Open the chest and get the sword"
* "bot Craft a wooden pickaxe"

## 🧠 LangChain Agent Integration

This project uses LangChain's tool-based agent system. Each Minecraft action (e.g., mine block, follow player, deposit item) is wrapped as a LangChain tool using Zod schemas and passed to the agent for dynamic planning.

The agent chooses the appropriate tool based on your message, and executes the corresponding Minecraft action.

## 🤝 Contributing

Pull requests and issues are welcome! Please ensure your code is clean, commented, and follows the project structure.

