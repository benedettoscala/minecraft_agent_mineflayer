
class Observation {
    private bot: any;
    private surroundingBlocks: Set<string>;
    private inventoryItems: Map<string, number>


    constructor(bot: any) {
        this.bot = bot;
        this.surroundingBlocks = new Set();
        // Initialize the inventory items as a datastructure with pairs <ItemName, ItemCount>
        this.inventoryItems = new Map();
    }

    public getInventoryItems() {
        const inventory = this.bot.inventory.items();
        this.inventoryItems.clear(); // Clear the previous inventory items

        for (const item of inventory) {
            const itemName = item.name;
            this.inventoryItems.set(itemName, item.count + 1);
        }

        return this.inventoryItems;
    }

    public getSurroundingBlocks(x_distance: number, y_distance: number, z_distance: number) {
        const surroundingBlocks: {
            name: string,
            position: { x: number, y: number, z: number },
            id: number
        }[] = [];
    
        for (let x = -x_distance; x <= x_distance; x++) {
            for (let y = -y_distance; y <= y_distance; y++) {
                for (let z = -z_distance; z <= z_distance; z++) {
                    const pos = this.bot.entity.position.offset(x, y, z);
                    const block = this.bot.blockAt(pos);
                    if (block && block.type !== 0) {
                        surroundingBlocks.push({
                            name: block.name,
                            position: { x: pos.x, y: pos.y, z: pos.z },
                            id: block.type
                        });
                    }
                }
            }
        }
    
        return surroundingBlocks;
    }
    

    public getCurrentBotPosition() {
        const position = this.bot.entity.position;
        const yaw = this.bot.entity.yaw;

        return {
            x: position.x,
            y: position.y,
            z: position.z,
            yaw: yaw,
        };
    }

    //to string method to print the current observation (it will have more observations in the future)
    public toString() {
        return `Surrounding blocks: ${JSON.stringify(this.getSurroundingBlocks(5, 5, 5))}\n` +
            `Inventory items: ${Array.from(this.getInventoryItems()).join(", ")}\n` +
            `Current bot position: ${JSON.stringify(this.getCurrentBotPosition())}\n`;
    }
}

export { Observation };