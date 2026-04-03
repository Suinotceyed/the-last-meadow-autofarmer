# 🐉 The Last Meadow - Universal Auto-Farmer
<img width="2558" height="1289" alt="The Last Meadow" src="https://github.com/user-attachments/assets/2ef56875-3e7f-486a-9582-430ada96e38a" />

A fully automated, priority-driven farming script for the Discord activity "The Last Meadow". 

Unlike basic auto-clickers, this script features a **Priority Engine**, a **Live GUI Dashboard**, and a **Universal Mini-Game Solver** that supports different player classes.

## ✨ Features

* **Interactive GUI Overlay:** Control the bot, toggle settings, and view live stats directly on your screen without typing console commands.
* **Universal Class & Activity Support:** The script automatically detects the active mini-game based on what you are doing and your chosen class:
  * 🛠️ **Crafting (All Classes):** Reads and executes the directional Arrow sequence.
  * 🏹 **Battling (Ranger Class):** DOM-reactive aim-bot to instantly snipe shrinking targets.
  * ✨ **Battling (Priest Class):** SVG-signature matching to perfectly clear the 3x3 triplet grid.
  * 🛡️ **Battling (Paladin Class):** Calculates velocity to auto-place the shield and block incoming fireballs.
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
6. The TLM Bot interface will appear in the top-left corner of the game!

---

## 🤝 Contributing
Feel free to fork this repository, submit pull requests, or open issues if Discord updates their class names and breaks the script!
