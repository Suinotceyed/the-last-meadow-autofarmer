(function() {
    "use strict";

    const config = {
        loopSpeed: 150,
        autoCraft: true,   // Handles both Arrows and 3x3 Grid
        autoBattle: true,  // Handles Shrinking Targets
        clickDragon: true,
        clickAdventure: true
    };

    let state = {
        active: false,
        timer: null,
        isPlayingSequence: false,
        stats: { dragonClicks: 0, sequencesSolved: 0, targetsSniped: 0, tripletsMatched: 0, popupsCleared: 0 }
    };

    const utils = {
        simulateKeyPress: (key) => {
            const map = { 'ArrowUp': 38, 'ArrowDown': 40, 'ArrowLeft': 37, 'ArrowRight': 39 };
            const ev = (type) => document.dispatchEvent(new KeyboardEvent(type, { key, code: key, keyCode: map[key], bubbles: true }));
            ev('keydown'); ev('keyup');
        },
        reactClick: (el) => {
            ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(t => 
                el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }))
            );
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
                             .join("") 
                             + svg.getAttribute("viewBox");

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
        setTimeout(() => { state.isPlayingSequence = false; state.stats.sequencesSolved++; }, (seq.length * 150) + 800);
    }

    // --- MINI-GAME: TARGETS (Fletcher/Battle) ---
    function handleBattleTargets() {
        const targets = document.querySelectorAll('img[alt="target"]');
        targets.forEach(t => { utils.reactClick(t); state.stats.targetsSniped++; });
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
            if (d) { utils.reactClick(d); state.stats.dragonClicks++; }
        }

        // Detect mini-games
        if (document.querySelector('div[class*="sequences"]')) return config.autoCraft && handleArrowSequence();
        if (document.querySelector("[class*='gridItem']")) return config.autoCraft && handleTripletGrid();
        if (document.querySelector('img[alt="target"]')) return config.autoBattle && handleBattleTargets();

        // Home Navigation
        const btns = Array.from(document.querySelectorAll('.button__65fca, .activityButton_8af73, [role="button"]'));
        const findBtn = (n) => btns.find(el => {
            const t = (el.textContent || "").toLowerCase();
            const disabled = el.disabled || el.getAttribute('aria-disabled') === 'true' || el.className.toLowerCase().includes('disabled');
            return t.includes(n.toLowerCase()) && !disabled && el.offsetParent !== null;
        });

        const craft = findBtn('Craft'), battle = findBtn('Battle'), adv = findBtn('Adventure');
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
