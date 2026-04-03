# 🐉 The Last Meadow - Universal Auto-Farmer
<img width="2559" height="1289" alt="TheLastMeadow" src="https://github.com/user-attachments/assets/5b19fadb-e755-4ebc-86a3-6ceee9e072e5" />

A fully automated, priority-driven farming script for the Discord activity "The Last Meadow". 

Unlike basic auto-clickers, this script features a **Priority Engine** that intelligently navigates the game menus, and a **Universal Mini-Game Solver** that supports different player classes.

## ✨ Features

* **Universal Class & Activity Support:** The script automatically detects the active mini-game based on what you are doing and your chosen class:
  * 🛠️ **Crafting (All Classes):** Reads and executes the directional Arrow sequence.
  * 🏹 **Battling (Ranger Class):** DOM-reactive aim-bot to instantly snipe shrinking targets.
  * ✨ **Battling (Priest Class):** SVG-signature matching to perfectly clear the 3x3 triplet grid.
  * 🛡️ **Battling (Mage Class):** Auto-Places the shield at projectiles to block them.
* **Priority Engine:** Intelligently switches between Crafting, Battling, and Adventuring based on cooldowns so you never waste a second.
* **Auto-Dismiss Errors:** Automatically detects and clears "Continue", "Go Back", and "Okay" popups to prevent the bot from getting stuck.
* **React-Safe Clicks:** Bypasses Discord's strict event listeners by simulating physical mouse and keyboard events.

---

## ⚠️ Disclaimer

**Use at your own risk.** This script automates user actions. While it operates entirely on the client side via the browser console, using automation tools, auto-clickers, or self-bots technically violates Discord's Terms of Service. The creator assumes no liability for banned accounts or lost progress.

---

## 🚀 How to Use (Installation)

Because Discord Activities run inside an iframe, you must run this script from your browser's Developer Tools.

1. Open Discord in your **web browser** (Chrome, Firefox, Edge, etc.) and launch *The Last Meadow*.
2. Press `F12` (or `Ctrl+Shift+I`) to open Developer Tools.
3. Click on the **Console** tab.
4. Open the `autofarm.js` file in this repository and copy all the code.
5. Paste it into the console and hit **Enter**.

---

## ⚙️ Configuration

You can easily toggle specific features on or off by editing the top few lines inside the `autofarm.js` file before you run it:

```javascript
const config = {
    loopSpeed: 150,      // Speed in milliseconds. Lower = faster.
    autoCraft: true,     // Auto-play Arrows
    autoBattle: true,    // Auto-play Shrinking Targets (Ranger) & 3x3 Grid (Priest)
    clickDragon: true,   // Auto-click the main boss
    clickAdventure: true // Auto-click Adventure when waiting on cooldowns
};
```

---

## 🎮 Bot Commands

Once the script is running, you can control it directly from the console. Type any of the following commands and hit **Enter**:

* `tlmBot.stop()` — **Stops the bot.** 
* `tlmBot.start()` — **Resumes the bot.** 
* `tlmBot.status()` — **Prints your session stats.** 

---

## 🤝 Contributing
Feel free to fork this repository, submit pull requests, or open issues if Discord updates their class names and breaks the script!
