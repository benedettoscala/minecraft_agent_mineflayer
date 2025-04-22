export function waitForMobRemoved(
    bot: any,
    entity: any,
    timeout: number = 300
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      let success = false;
      let droppedItem: any = null;
  
      const timeoutId = setTimeout(() => {
        success = false;
        bot.pvp.stop();
      }, timeout * 1000);
  
      function onEntityGone(e: any) {
        if (e === entity) {
          success = true;
          clearTimeout(timeoutId);
          bot.chat(`Killed ${entity.name}!`);
          bot.pvp.stop();
        }
      }
  
      function onItemDrop(item: any) {
        if (entity.position.distanceTo(item.position) <= 1) {
          droppedItem = item;
        }
      }
  
      function onStoppedAttacking() {
        clearTimeout(timeoutId);
        bot.removeListener("entityGone", onEntityGone);
        bot.removeListener("stoppedAttacking", onStoppedAttacking);
        bot.removeListener("itemDrop", onItemDrop);
  
        if (!success) reject(new Error(`Failed to kill ${entity.name}.`));
        else resolve(droppedItem);
      }
  
      bot.on("entityGone", onEntityGone);
      bot.on("stoppedAttacking", onStoppedAttacking);
      bot.on("itemDrop", onItemDrop);
    });
  }
  
  export function waitForMobShot(
    bot: any,
    entity: any,
    timeout: number = 300
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      let success = false;
      let droppedItem: any = null;
  
      const timeoutId = setTimeout(() => {
        success = false;
        bot.hawkEye.stop();
      }, timeout * 1000);
  
      function onEntityGone(e: any) {
        if (e === entity) {
          success = true;
          clearTimeout(timeoutId);
          bot.chat(`Shot ${entity.name}!`);
          bot.hawkEye.stop();
        }
      }
  
      function onItemDrop(item: any) {
        if (entity.position.distanceTo(item.position) <= 1) {
          droppedItem = item;
        }
      }
  
      function onAutoShotStopped() {
        clearTimeout(timeoutId);
        bot.removeListener("entityGone", onEntityGone);
        bot.removeListener("auto_shot_stopped", onAutoShotStopped);
        bot.removeListener("itemDrop", onItemDrop);
  
        if (!success) reject(new Error(`Failed to shoot ${entity.name}.`));
        else resolve(droppedItem);
      }
  
      bot.on("entityGone", onEntityGone);
      bot.on("auto_shot_stopped", onAutoShotStopped);
      bot.on("itemDrop", onItemDrop);
    });
  }
  