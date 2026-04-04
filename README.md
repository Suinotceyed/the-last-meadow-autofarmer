# 🐉 The Last Meadow - Universal Auto-Farmer

<p align="center">
  <img width="2558" height="1289" alt="The Last Meadow" src="https://github.com/user-attachments/assets/65f85374-30b3-4126-882a-73d47ac9937c" />
</p>

A fully automated, priority-driven farming engine for the Discord activity **The Last Meadow**. 

Unlike basic macro recorders or simple auto-clickers, this script features a **Priority Engine**, an interactive **Live GUI Dashboard**, and a **Universal Mini-Game Solver** that seamlessly adapts to different player classes and scenarios on the fly.

---

## ✨ Features

<img align="right" width="280" alt="GUI Dashboard" src="https://github.com/user-attachments/assets/ba9913b1-0df2-4113-a0e6-939163e43b4a" />

### 🎮 Universal Class & Activity Solvers
The script automatically detects your active mini-game and chosen class, deploying the perfect strategy:
* 🛠️ **Crafting (All Classes):** Reads and executes directional Arrow sequences with perfect timing.
* 🏹 **Battling (Ranger):** A DOM-reactive aim-bot that instantly snipes shrinking targets.
* ✨ **Battling (Priest):** Uses advanced SVG-signature matching to perfectly clear the 3x3 triplet grid.
* 🛡️ **Battling (Paladin):** Calculates projectile velocity and logical coordinates to auto-place your shield and block incoming fireballs.

### 🧠 Smart Automation Engine
* **Priority Routing:** Intelligently switches between Crafting, Battling, and Adventuring based on active cooldowns so you never waste a second of uptime.
* **Auto-Dismiss Modals:** Automatically detects and clears "Continue", "Go Back", and "Out of Resources" popups to prevent the bot from stalling.
* **React-Safe Synthetic Clicks:** Bypasses Discord's strict event listeners by simulating deep, physical mouse and keyboard events (PointerEvents, MouseEvents, KeyboardEvents).

### 🖥️ User Experience
* **Draggable GUI Overlay:** Control the bot, toggle specific automation settings, and view live session stats directly on your screen—no need to type console commands after injection.

---

## 🚀 Installation & Usage

Because Discord Activities run inside an isolated web `iframe`, you must inject this script using your web browser's Developer Tools.

1. Open Discord in your **web browser** (Chrome, Firefox, Edge, etc.) and launch *The Last Meadow*.
2. Press `F12` (or `Ctrl+Shift+I`) to open your browser's Developer Tools.
3. Navigate to the **Console** tab.
4. **⚠️ CRITICAL:** At the top of the Console, change your javascript context from `top` to the activity's iframe (usually named something like `activity` or `The Last Meadow`). If you leave it on `top`, the script won't be able to find the game!
5. Open `autofarm.js` from this repository and copy all the code.
6. Paste the code into the console and hit **Enter**.
7. The TLM Bot interface will appear in the top-left corner of the game. Click "Start Farming"!

---

## ⚠️ Disclaimer

**Use at your own risk.** This script automates user actions. While it operates entirely on the client-side via the browser console (meaning it does not send suspicious API requests), using automation tools, auto-clickers, or self-bots technically violates Discord's Terms of Service. 

The creator assumes no liability for account suspensions, bans, or lost progress. 

---

## 🤝 Contributing

Game updates can occasionally change UI class names and break DOM selectors. Feel free to fork this repository, submit pull requests, or open issues if you notice the script acting up after a new patch!
