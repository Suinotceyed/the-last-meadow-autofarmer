(function() {
    "use strict";

    const config = {
        loopSpeed: 150,
        autoCraft: true,   // Handles both Arrows and 3x3 Grid
        autoBattle: true,  // Handles Shrinking Targets + Shield
        clickDragon: true,
        clickAdventure: true
    };

    let state = {
        active: false,
        timer: null,
        isPlayingSequence: false,
        shieldBotRunning: false,
        shieldBotRaf: null,
        shieldHistory: new WeakMap(),
        stats: {
            dragonClicks: 0,
            sequencesSolved: 0,
            targetsSniped: 0,
            tripletsMatched: 0,
            popupsCleared: 0,
            shieldBlocks: 0
        }
    };

    const utils = {
        simulateKeyPress: (key) => {
            const map = { 'ArrowUp': 38, 'ArrowDown': 40, 'ArrowLeft': 37, 'ArrowRight': 39 };
            const ev = (type) => document.dispatchEvent(new KeyboardEvent(type, {
                key,
                code: key,
                keyCode: map[key],
                bubbles: true
            }));
            ev('keydown');
            ev('keyup');
        },

        reactClick: (el) => {
            ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(t =>
                el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }))
            );
        },

        px: (v) => {
            const n = parseFloat(v);
            return Number.isFinite(n) ? n : 0;
        },

        getCenter: (el) => {
            const rect = el.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                width: rect.width,
                height: rect.height
            };
        },

        dispatchMouseMove: (targetEl, clientX, clientY) => {
            const ev = new MouseEvent('mousemove', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX,
                clientY,
                screenX: clientX,
                screenY: clientY
            });

            targetEl.dispatchEvent(ev);
            document.dispatchEvent(ev);
            window.dispatchEvent(ev);
        }
    };

    // --- MINI-GAME: 3x3 GRID (Smithy) ---
    function handleTripletGrid() {
        // Find all grid items that haven't been matched yet
        const items = Array.from(document.querySelectorAll("[class*='gridItem']")).filter(item => {
            // Discord usually adds a 'matched' class or changes opacity when solved
            const isMatched = item.className.toLowerCase().includes('matched') || item.style.opacity === "0";
            return !isMatched;
        });

        if (items.length === 0) return;

        const groups = {};
        items.forEach(item => {
            const svg = item.querySelector("svg");
            if (!svg) return;

            // Create a unique 'signature' based on the SVG paths
            const sig = Array.from(svg.querySelectorAll("path"))
                .map(p => p.getAttribute("d"))
                .join("") + svg.getAttribute("viewBox");

            if (!groups[sig]) groups[sig] = [];
            groups[sig].push(item);
        });

        // Find the first available triplet and click it
        for (let sig in groups) {
            if (groups[sig].length >= 3) {
                console.log(`[SMITHY] Found triplet! Matching...`);
                groups[sig].slice(0, 3).forEach((el, index) => {
                    // Stagger the clicks slightly so the game registers all three
                    setTimeout(() => utils.reactClick(el), index * 100);
                });
                state.stats.tripletsMatched++;
                return; // Exit and wait for next loop to find the next set
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
        const seq = arrows.map(img => img.getAttribute('alt'));
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
        const getProjectiles = () =>
            [...document.querySelectorAll(PROJECTILE_SELECTOR)].filter((el) => el.isConnected);

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
                    x,
                    y,
                    t,
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

            // stop when minigame is gone
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
        const dismiss = Array.from(btns).find(el => {
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

        // Detect mini-games
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

        // no shield game currently visible
        stopBattleShield();

        // Home Navigation
        const btns = Array.from(document.querySelectorAll('.button__65fca, .activityButton_8af73, [role="button"]'));
        const findBtn = (n) => btns.find(el => {
            const t = (el.textContent || "").toLowerCase();
            const disabled = el.disabled || el.getAttribute('aria-disabled') === 'true' || el.className.toLowerCase().includes('disabled');
            return t.includes(n.toLowerCase()) && !disabled && el.offsetParent !== null;
        });

        const craft = findBtn('Craft');
        const battle = findBtn('Battle');
        const adv = findBtn('Adventure');

        if (config.autoCraft && craft) return utils.reactClick(craft);
        if (config.autoBattle && battle) return utils.reactClick(battle);
        if (config.clickAdventure && adv) utils.reactClick(adv);
    }

    window.tlmBot = {
        start: () => {
            if (state.active) return;
            state.active = true;
            state.timer = setInterval(mainLoop, config.loopSpeed);
            console.log("%c[TLM UNIVERSAL] Running!", "color: #00ff00; font-weight: bold;");
        },

        stop: () => {
            clearInterval(state.timer);
            stopBattleShield();
            state.active = false;
            console.log("%c[TLM BOT] Stopped.", "color: #ff0000; font-weight: bold;");
        },

        status: () => {
            console.table(state.stats);
            return state;
        }
    };

    window.tlmBot.start();
})();
