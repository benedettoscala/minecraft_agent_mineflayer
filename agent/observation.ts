
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
                            //approssimazione a 2 decimali
                            position: { x: parseFloat(pos.x.toFixed(2)), y: parseFloat(pos.y.toFixed(2)), z: parseFloat(pos.z.toFixed(2)) },
                            id: block.type
                        });
                    }
                }
            }
        }
    
        return surroundingBlocks;
    }
    
    public getSurroundingBlocksWithNames(x_distance: number, y_distance: number, z_distance: number) {
        //con un set così non ci sono duplicati
        const surroundingBlocks: Set<string> = new Set();

        for (let x = -x_distance; x <= x_distance; x++) {
            for (let y = -y_distance; y <= y_distance; y++) {
                for (let z = -z_distance; z <= z_distance; z++) {
                    const pos = this.bot.entity.position.offset(x, y, z);
                    const block = this.bot.blockAt(pos);
                    if (block && block.type !== 0) {
                        surroundingBlocks.add(block.name);
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
            x: parseFloat(position.x.toFixed(2)),
            y: parseFloat(position.y.toFixed(2)),
            z: parseFloat(position.z.toFixed(2)),
            yaw: parseFloat(yaw.toFixed(2))
        };
    }

    public getNearbyLivingEntities(maxDistance = 48) {
        const livingEntities: Record<string, any[]> = {};
      
        for (const id in this.bot.entities) {
          const entity = this.bot.entities[id];
          if (
            entity.type === "hostile" || // animali e mob ostili
            entity.type === "animal"||
            entity.type === "player" // opzionale: per includere player
          ) {
            const distance = entity.position.distanceTo(this.bot.entity.position);
            if (distance <= maxDistance) {
              if (!livingEntities[entity.name]) {
                livingEntities[entity.name] = [];
              }
              livingEntities[entity.name].push({ entity, distance });
            }
          }
        }
      
        // Ordina ogni array per distanza
        for (const name in livingEntities) {
          livingEntities[name].sort((a, b) => a.distance - b.distance);
        }
      
        return livingEntities;
      }


    public getNearbyEntityNamesAndDistance(): string[] {
        const nearbyEntities = this.getNearbyLivingEntities(10);
        const entityNames: string[] = [];

        for (const name in nearbyEntities) {
            const entities = nearbyEntities[name];
            for (const entity of entities) {
                if (name === "player" && entity.distance == 0) {
                    continue; // Skip the bot itself
                }
                entityNames.push(`${name} (${entity.distance.toFixed(2)} blocks)`);
            }
        }

        return entityNames;
    }
    
    public getHealthAndHunger() {
        const health = this.bot.health;
        const maxHealth = this.bot.entity.maxHealth;
        const hunger = this.bot.food;
        const maxHunger = 20; // Max hunger in Minecraft

        return {
            health: health,
            maxHealth: maxHealth,
            hunger: hunger,
            maxHunger: maxHunger
        };
    }

    //to string method to print the current observation (it will have more observations in the future)
    public toString() {
        return `Current health and hunger: ${this.getHealthAndHunger().health}/${this.getHealthAndHunger().maxHealth}\n` +
            `Surrounding blocks: ${JSON.stringify(this.getSurroundingBlocks(1, 1, 1))}\n` +
            `Surrounding blocks with names (less detail): ${Array.from(this.getSurroundingBlocksWithNames(5, 5, 5)).join(", ")}\n` +
            `Inventory items: ${Array.from(this.getInventoryItems()).join(", ")}\n` +
            `Current bot position: ${JSON.stringify(this.getCurrentBotPosition())}\n`+ 
            `Nearby living entities: ${JSON.stringify(this.getNearbyEntityNamesAndDistance())}\n`;
    }
}

export { Observation };