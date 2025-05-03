import { Bot } from 'mineflayer';
import { Recipe } from 'prismarine-recipe'; // might need to adjust depending on actual typings
import { Item } from 'prismarine-item'; // the item type
import mcDataLoader from 'minecraft-data';

export function failedCraftFeedback(bot: Bot, name: string, item: Item, craftingTable: any): string {
  const mcData = mcDataLoader(bot.version);
  //get the metadata of the item
  const itemMeta = mcData.itemsByName[item.name].id;
  if (!itemMeta) {
    throw new Error(`No item named ${item.name}`);
  }
  const recipes = bot.recipesAll(item.type, itemMeta, craftingTable);

  if (!recipes.length) {
    throw new Error(`No crafting table nearby`);
  } else {
    const recipes = bot.recipesAll(
      item.type,
      null,
      craftingTable
    );

    // Find the recipe with the fewest missing ingredients
    let minMissing = Infinity;
    let bestRecipe: Recipe | null = null;

    for (const recipe of recipes) {
      let missing = 0;

      for (const deltaItem of recipe.delta) {
        if (deltaItem.count < 0) {
          const inventoryItem = bot.inventory.findInventoryItem(
              mcData.items[deltaItem.id].id,
              null,
              false // Assuming 'notFull' is false; adjust as needed
            );

          if (!inventoryItem) {
            missing += -deltaItem.count;
          } else {
            missing += Math.max(
              -deltaItem.count - inventoryItem.count,
              0
            );
          }
        }
      }

      if (missing < minMissing) {
        minMissing = missing;
        bestRecipe = recipe;
      }
    }

    if (!bestRecipe) {
      return `I cannot make ${name}, but I couldn't determine why.`;
    }

    let message = '';

    for (const deltaItem of bestRecipe.delta) {
      if (deltaItem.count < 0) {
        const inventoryItem = bot.inventory.findInventoryItem(
          mcData.items[deltaItem.id].id,
          null,
          false // Assuming 'notFull' is false; adjust as needed
        );

        const missingCount = !inventoryItem
          ? -deltaItem.count
          : Math.max(-deltaItem.count - inventoryItem.count, 0);

        if (missingCount > 0) {
          message += `${missingCount} more ${mcData.items[deltaItem.id].name}, `;
        }
      }
    }

    message = message.trim().replace(/,\s*$/, ''); // Remove trailing comma
    return `I cannot make ${name} because I need: ${message}`;
  }
}
