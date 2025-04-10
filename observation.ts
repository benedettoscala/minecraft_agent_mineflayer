
class Observation {
    private bot: any;
    private surroundingBlocks: Set<string>;
    private inventoryItems: Set<string>;

    constructor(bot: any) {
        this.bot = bot;
        this.surroundingBlocks = new Set();
        this.inventoryItems = new Set();
    }

    public getInventoryItems() {
        this.bot.inventory.items().forEach((item:any) => {
            if (item) this.inventoryItems.add(item.name);
        });
        return this.inventoryItems;
    }

    public getSurroundingBlocks(x_distance: number, y_distance: number, z_distance: number) {
        const surroundingBlocks = new Set();
        

        for (let x = -x_distance; x <= x_distance; x++) {
            for (let y = -y_distance; y <= y_distance; y++) {
                for (let z = -z_distance; z <= z_distance; z++) {
                    const block = this.bot.blockAt(this.bot.entity.position.offset(x, y, z));
                    if (block && block.type !== 0) {
                        surroundingBlocks.add(block.name);
                    }
                }
            }
        }
        // console.log(surroundingBlocks);
        return surroundingBlocks;
    }

    //to string method to print the current observation (it will have more observations in the future)
    public toString() {
        return `Surrounding blocks: ${Array.from(this.getSurroundingBlocks(2, 2, 2)).join(", ")}\n` +
            `Inventory items: ${Array.from(this.getInventoryItems()).join(", ")}\n`;
    }
}

export { Observation };