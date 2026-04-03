(function() {
    "use strict";

    const config = {
        loopSpeed: 150,
        autoCraft: true,   
        autoBattle: true,  
        clickDragon: true,
        clickAdventure: true,
    };

    let state = {
        active: false,
        /** @type {number | null} */
        timer: null,
        isPlayingSequence: false,
        shieldBotRunning: false,
        /** @type {number | null} */
        shieldBotRaf: null,
        shieldHistory: new WeakMap(),
        stats: {
            dragonClicks: 0,
            sequencesSolved: 0,
            targetsSniped: 0,
            tripletsMatched: 0,
            popupsCleared: 0,
            shieldBlocks: 0,
        },
    };

    const utils = {
        simulateKeyPress: (/** @type {string} */ key) => {
            /** @type {Record<string, number>} */
            const map = { 'ArrowUp': 38, 'ArrowDown': 40, 'ArrowLeft': 37, 'ArrowRight': 39 };
            const ev = (/** @type {string} */ type) => document.dispatchEvent(new KeyboardEvent(type, {
                key,
                code: key,
                keyCode: map[key],
                bubbles: true,
            }));
            ev('keydown');
            ev('keyup');
        },

        reactClick: (/** @type {{ dispatchEvent: (arg0: MouseEvent) => void; }} */ el) => {
            ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(t =>
                el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }))
            );
        },

        px: (/** @type {string} */ v) => {
            const n = parseFloat(v);
            return Number.isFinite(n) ? n : 0;
        },

        getCenter: (/** @type {{ getBoundingClientRect: () => any; }} */ el) => {
            const rect = el.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                width: rect.width,
                height: rect.height,
            };
        },

        dispatchMouseMove: (
            /** @type {{ dispatchEvent: (arg0: MouseEvent) => void; }} */ targetEl,
            /** @type {any} */ clientX,
            /** @type {any} */ clientY
        ) => {
            const ev = new MouseEvent('mousemove', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX,
                clientY,
                screenX: clientX,
                screenY: clientY,
            });

            targetEl.dispatchEvent(ev);
            document.dispatchEvent(ev);
            window.dispatchEvent(ev);
        }
    };

    // --- MINI-GAME: 3x3 GRID (Smithy) ---
    function handleTripletGrid() {
        const items = /** @type {HTMLElement[]} */ (Array.from(
            document.querySelectorAll("[class*='gridItem']")
        )).filter(item => {
            const isMatched = item.className.toLowerCase().includes('matched') || item.style.opacity === "0";
            return !isMatched;
        });

        if (items.length === 0) return;

        /** @type {Record<string, HTMLElement[]>} */
        const groups = {};
        items.forEach(item => {
            const svg = item.querySelector("svg");
            if (!svg) return;

            const sig = Array.from(svg.querySelectorAll("path"))
                .map(p => p.getAttribute("d"))
                .join("") + svg.getAttribute("viewBox");

            if (!groups[sig]) groups[sig] = [];
            groups[sig].push(item);
        });

        for (let sig in groups) {
            if (groups[sig].length >= 3) {
                groups[sig].slice(0, 3).forEach((/** @type {any} */ el, /** @type {number} */ index) => {
                    setTimeout(() => utils.reactClick(el), index * 100);
                });
                state.stats.tripletsMatched++;
                return; 
            }
        }
    }

    // --- MINI-GAME: ARROWS (Scholar) ---
    function handleArrowSequence() {
        if (state.isPlayingSequence) return;
        const container = document.querySelector('div[class*="sequences"]');
        if (!container) return;
        const arrows = Array.from(container.querySelectorAll('img[alt^="Arrow"]'));
        if (arrows.length === 0) return;

        state.isPlayingSequence = true;
        const seq = arrows.map(img => img.getAttribute('alt') || '');
        seq.forEach((dir, i) => setTimeout(() => utils.simulateKeyPress(dir), i * 150));
        setTimeout(() => {
            state.isPlayingSequence = false;
            state.stats.sequencesSolved++;
        }, (seq.length * 150) + 800);
    }

    // --- MINI-GAME: TARGETS (Fletcher/Battle) ---
    function handleBattleTargets() {
        const targets = document.querySelectorAll('img[alt="target"]');
        targets.forEach(t => {
            utils.reactClick(t);
            state.stats.targetsSniped++;
        });
    }

    // --- MINI-GAME: SHIELD (Battle) ---
    function stopBattleShield() {
        if (state.shieldBotRaf) {
            cancelAnimationFrame(state.shieldBotRaf);
            state.shieldBotRaf = null;
        }
        state.shieldBotRunning = false;
        state.shieldHistory = new WeakMap();
    }

    function handleBattleShield() {
        if (state.shieldBotRunning) return;

        state.shieldBotRunning = true;
        state.shieldHistory = new WeakMap();

        const GAME_SELECTOR = 'div[class^="game__"]';
        const PROJECTILE_SELECTOR = 'img[class^="projectile_"]';
        const SHIELD_SELECTOR = 'img[class^="shield_"]';

        const getGame = () => document.querySelector(GAME_SELECTOR);
        const getShield = () => document.querySelector(SHIELD_SELECTOR);
        const getProjectiles = () => [
            ...document.querySelectorAll(PROJECTILE_SELECTOR),
        ].filter((el) => el.isConnected);

        function updateHistory(projectiles, t) {
            for (const p of projectiles) {
                const rect = p.getBoundingClientRect();
                const x = rect.left + rect.width / 2;
                const y = rect.top + rect.height / 2;

                const prev = state.shieldHistory.get(p);
                if (!prev) {
                    state.shieldHistory.set(p, { x, y, t, vx: 0, vy: 0 });
                    continue;
                }

                const dt = Math.max((t - prev.t) / 1000, 0.0001);
                state.shieldHistory.set(p, {
                    x, y, t,
                    vx: (x - prev.x) / dt,
                    vy: (y - prev.y) / dt,
                });
            }
        }

        function getBestTarget(shield, projectiles) {
            const shieldCenter = utils.getCenter(shield);
            let best = null;
            let bestT = Infinity;

            for (const p of projectiles) {
                const s = state.shieldHistory.get(p);
                if (!s) continue;

                if (s.y > shieldCenter.y) continue;
                if (s.vy <= 0) continue;

                const timeToShield = (shieldCenter.y - s.y) / s.vy;
                if (!Number.isFinite(timeToShield) || timeToShield < 0) continue;

                const predictedX = s.x + s.vx * timeToShield;

                if (timeToShield < bestT) {
                    bestT = timeToShield;
                    best = {
                        projectile: p,
                        timeToShield,
                        predictedX,
                        predictedY: shieldCenter.y,
                    };
                }
            }
            return best;
        }

        function loop() {
            if (!state.active || !state.shieldBotRunning) {
                stopBattleShield();
                return;
            }

            const game = getGame();
            const shield = getShield();

            if (!game || !shield) {
                stopBattleShield();
                return;
            }

            const projectiles = getProjectiles();
            const t = performance.now();

            updateHistory(projectiles, t);

            const target = getBestTarget(shield, projectiles);
            if (target) {
                utils.dispatchMouseMove(game, target.predictedX, target.predictedY);
                state.stats.shieldBlocks++;
            }

            state.shieldBotRaf = requestAnimationFrame(loop);
        }
        loop();
    }

    function handlePopups() {
        const btns = document.querySelectorAll('[role="button"], .button__65fca');
        const dismiss = /** @type {HTMLElement[]} */ (Array.from(btns)).find(el => {
            if (el.offsetParent === null) return false;
            const t = (el.textContent || "").toLowerCase();
            return t.includes('continue') || t.includes('go back') || t.includes('okay') || t.includes('close');
        });
        if (dismiss) {
            utils.reactClick(dismiss);
            state.stats.popupsCleared++;
            return true;
        }
        return false;
    }

    function mainLoop() {
        if (handlePopups()) return;

        if (config.clickDragon) {
            const d = document.querySelector('img.dragon_b6b008') || document.querySelector('img[alt="Grass Toucher"]');
            if (d) {
                utils.reactClick(d);
                state.stats.dragonClicks++;
            }
        }

        if (document.querySelector('div[class*="sequences"]')) {
            stopBattleShield();
            return config.autoCraft && handleArrowSequence();
        }

        if (document.querySelector("[class*='gridItem']")) {
            stopBattleShield();
            return config.autoCraft && handleTripletGrid();
        }

        if (document.querySelector('img[class*="shield_"]')) {
            return config.autoBattle && handleBattleShield();
        }

        if (document.querySelector('img[alt="target"]')) {
            stopBattleShield();
            return config.autoBattle && handleBattleTargets();
        }

        stopBattleShield();

        const btns = /** @type {HTMLElement[]} */ (Array.from(
            document.querySelectorAll('.button__65fca, .activityButton_8af73, [role="button"]')
        ));
        const findBtn = (/** @type {string} */ n) => btns.find(el => {
            const t = (el.textContent || "").toLowerCase();
            const disabled = /** @type {HTMLButtonElement} */ (el).disabled || el.getAttribute('aria-disabled') === 'true' || el.className.toLowerCase().includes('disabled');
            return t.includes(n.toLowerCase()) && !disabled && el.offsetParent !== null;
        });

        const craft = findBtn('Craft');
        const battle = findBtn('Battle');
        const adv = findBtn('Adventure');

        if (config.autoCraft && craft) return utils.reactClick(craft);
        if (config.autoBattle && battle) return utils.reactClick(battle);
        if (config.clickAdventure && adv) utils.reactClick(adv);
    }

    // --- GUI OVERLAY SYSTEM ---
    function createGUI() {
        if (document.getElementById('tlm-gui')) return; 

        const gui = document.createElement('div');
        gui.id = 'tlm-gui';
        gui.innerHTML = `
            <div style="font-weight:bold; font-size:16px; margin-bottom:10px; text-align:center; border-bottom:1px solid #4f545c; padding-bottom:5px;">
                🐉 TLM Auto-Farmer
            </div>
            
            <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                <button id="tlm-btn-start" style="background:#3ba55d; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; width:48%;">START</button>
                <button id="tlm-btn-stop" style="background:#ed4245; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; width:48%;">STOP</button>
            </div>

            <div style="font-size:12px; margin-bottom:15px; background:#202225; padding:8px; border-radius:4px;">
                <label style="display:block; margin-bottom:5px;"><input type="checkbox" id="cb-craft" ${config.autoCraft ? 'checked' : ''}> Auto-Craft (Arrows/Grid)</label>
                <label style="display:block; margin-bottom:5px;"><input type="checkbox" id="cb-battle" ${config.autoBattle ? 'checked' : ''}> Auto-Battle (All Classes)</label>
                <label style="display:block; margin-bottom:5px;"><input type="checkbox" id="cb-dragon" ${config.clickDragon ? 'checked' : ''}> Auto-Snipe Boss</label>
                <label style="display:block;"><input type="checkbox" id="cb-adv" ${config.clickAdventure ? 'checked' : ''}> Auto-Adventure</label>
            </div>

            <div style="font-size:11px; color:#b9bbbe;">
                <div style="display:flex; justify-content:space-between;"><span>Status:</span> <span id="tlm-stat-status" style="color:#ed4245; font-weight:bold;">OFFLINE</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Dragon Clicks:</span> <span id="tlm-stat-dragon">0</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Targets Sniped:</span> <span id="tlm-stat-targets">0</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Shield Blocks:</span> <span id="tlm-stat-shields">0</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Arrows Solved:</span> <span id="tlm-stat-arrows">0</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Grids Matched:</span> <span id="tlm-stat-grids">0</span></div>
            </div>
        `;

        // Styling the container
        Object.assign(gui.style, {
            position: 'fixed',
            top: '20px',
            left: '20px',
            width: '220px',
            backgroundColor: '#2b2d31',
            color: '#dcddde',
            fontFamily: 'sans-serif',
            padding: '12px',
            borderRadius: '8px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
            zIndex: '999999',
            border: '1px solid #1e1f22'
        });

        document.body.appendChild(gui);

        // Event Listeners for UI
        document.getElementById('tlm-btn-start').onclick = () => window.tlmBot.start();
        document.getElementById('tlm-btn-stop').onclick = () => window.tlmBot.stop();
        
        document.getElementById('cb-craft').onchange = (e) => config.autoCraft = e.target.checked;
        document.getElementById('cb-battle').onchange = (e) => config.autoBattle = e.target.checked;
        document.getElementById('cb-dragon').onchange = (e) => config.clickDragon = e.target.checked;
        document.getElementById('cb-adv').onchange = (e) => config.clickAdventure = e.target.checked;

        // Start Live Stats Loop
        setInterval(() => {
            if (!document.getElementById('tlm-gui')) return;
            const s = document.getElementById('tlm-stat-status');
            s.innerText = state.active ? "RUNNING" : "OFFLINE";
            s.style.color = state.active ? "#3ba55d" : "#ed4245";
            
            document.getElementById('tlm-stat-dragon').innerText = state.stats.dragonClicks;
            document.getElementById('tlm-stat-targets').innerText = state.stats.targetsSniped;
            document.getElementById('tlm-stat-shields').innerText = state.stats.shieldBlocks;
            document.getElementById('tlm-stat-arrows').innerText = state.stats.sequencesSolved;
            document.getElementById('tlm-stat-grids').innerText = state.stats.tripletsMatched;
        }, 1000);
    }

    /** @type {any} */ (window).tlmBot = {
        start: () => {
            if (state.active) return;
            state.active = true;
            state.timer = setInterval(mainLoop, config.loopSpeed);
        },
        stop: () => {
            if (state.timer !== null) clearInterval(state.timer);
            stopBattleShield();
            state.active = false;
        },
        config,
        status: () => state
    };

    // Inject GUI and Auto-Start
    createGUI();
    window.tlmBot.start();
})();
