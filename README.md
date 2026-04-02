# 🐉 The Last Meadow - Universal Auto-Farmer

A fully automated, priority-driven farming script for the Discord activity "The Last Meadow". 

Unlike basic auto-clickers, this script features a **Priority Engine** that intelligently navigates the game menus, and a **Universal Mini-Game Solver** that supports all player classes and crafting stations.

## ✨ Features

* **Universal Class Support:** The only script that automatically detects and plays all three mini-games:
  * 🪄 **Scholar (Magic):** Reads and executes the directional Arrow sequence.
  * 🏹 **Fletcher (Archery):** DOM-reactive aim-bot to instantly snipe shrinking targets.
  * ⚒️ **Smithy (Blacksmith):** SVG-signature matching to perfectly clear the 3x3 triplet grid.
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

## 🎮 Bot Commands
Once the script is running, you can control it directly from the console. Type any of the following commands and hit Enter:

tlmBot.stop() — Pauses the bot. Useful if you want to manually navigate the menus to check your inventory or upgrade gear.
tlmBot.start() — Resumes the bot. Starts the automation loop again without needing to refresh the page or paste the code again.
tlmBot.status() — Prints your session stats. Opens a table in the console showing exactly how many targets you've sniped, sequences you've solved, and triplets you've matched this session.

---

## ⚙️ Configuration

You can easily toggle specific features on or off by editing the top few lines inside the `autofarm.js` file before you run it:

const config = {
    loopSpeed: 150,      // Speed in milliseconds. Lower = faster.
    autoCraft: true,     // Auto-play Arrows (Scholar) and 3x3 Grid (Smithy)
    autoBattle: true,    // Auto-play Shrinking Targets (Fletcher/Battle)
    clickDragon: true,   // Auto-click the main boss
    clickAdventure: true // Auto-click Adventure when waiting on cooldowns
};
