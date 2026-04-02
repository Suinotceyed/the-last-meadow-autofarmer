# 🐉 The Last Meadow - Ultimate Auto-Farmer

A fully automated, priority-driven farming script for the Discord activity "The Last Meadow". 

Unlike basic auto-clickers, this script features a **Priority Engine** that intelligently navigates the game menus, physically simulates keyboard presses for crafting, and utilizes a reactive aim-bot for battles.

## ✨ Features

* **Priority Engine:** Intelligently switches between Crafting, Battling, and Adventuring based on cooldowns.
* **Auto-Crafting (Macro):** Automatically reads and executes the directional arrow DDR mini-game.
* **Aim-Bot Battles:** Scans the DOM to instantly snipe shrinking targets in the Battle mini-game.
* **Auto-Dismiss Errors:** Automatically detects and clears "Continue", "Go Back", and "Okay" popups to prevent the bot from getting stuck.
* **React-Safe Clicks:** Bypasses Discord's strict event listeners by simulating physical mouse events.

## ⚠️ Disclaimer

**Use at your own risk.** This script automates user actions. While it operates entirely on the client side via the browser console, using automation tools, auto-clickers, or self-bots technically violates Discord's Terms of Service. The creator assumes no liability for banned accounts or lost progress.

## 🚀 How to Use (Installation)

Because Discord Activities run inside an iframe, you must run this script from your browser's Developer Tools.

1. Open Discord in your **web browser** (Chrome, Firefox, Edge, etc.) and launch *The Last Meadow*.
2. Press `F12` (or `Ctrl+Shift+I`) to open Developer Tools.
3. Click on the **Console** tab.
4. **CRITICAL:** At the top left of the console, look for a dropdown menu that says `top`. Click it and change the context to the iframe running the game (it will usually look like a long string of numbers or say something related to the activity).
5. Copy the code from `autofarm.js` in this repository.
6. Paste it into the console and hit **Enter**.

## ⚙️ Configuration

You can easily toggle specific features on or off by editing the top few lines of the script before you paste it:

```javascript
const loopSpeed = 150;       // Speed in milliseconds. Lower = faster.
const autoCraft = true;      // Change to false to disable auto-crafting
const autoBattle = true;     // Change to false to disable aim-bot
const clickDragon = true;    // Change to false to stop clicking the main boss
const clickAdventure = true; // Change to false to stop clicking Adventure
