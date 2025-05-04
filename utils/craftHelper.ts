import { Bot } from 'mineflayer';
import { Recipe } from 'prismarine-recipe'; // might need to adjust depending on actual typings
import { Item } from 'prismarine-item'; // the item type
import mcDataLoader from 'minecraft-data';

export function failedCraftFeedback(bot: Bot, name: string, item: Item, craftingTable: any): string {
  const mcData = mcDataLoader(bot.version);
  const itemData = mcData.itemsByName[item.name];

  if (!itemData) {
    throw new Error(`No item named ${item.name}`);
  }

  const recipes = bot.recipesAll(itemData.id, null, craftingTable);

  if (!recipes.length) {
    return `I cannot craft ${name} because there is no crafting table nearby or no recipe exists.`;
  }

  let feedback = `I cannot craft ${name}. Here's what I need for each recipe:\n`;

  recipes.forEach((recipe, index) => {
    let missingItems: string[] = [];

    for (const deltaItem of recipe.delta) {
      if (deltaItem.count < 0) {
        const requiredId = deltaItem.id;
        const requiredName = mcData.items[requiredId].name;
        const requiredCount = -deltaItem.count;

        const inventoryItem = bot.inventory.findInventoryItem(requiredId, null, false);
        const inventoryCount = inventoryItem ? inventoryItem.count : 0;

        const missingCount = Math.max(requiredCount - inventoryCount, 0);

        if (missingCount > 0) {
          missingItems.push(`${missingCount}x ${requiredName}`);
        }
      }
    }

    if (missingItems.length > 0) {
      feedback += `- Recipe ${index + 1}: Missing ${missingItems.join(', ')}\n`;
    } else {
      feedback += `- Recipe ${index + 1}: You have all the required items.\n`;
    }
  });

  return feedback.trim();
}
