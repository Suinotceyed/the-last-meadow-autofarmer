(function() {
    // --- CONFIGURATION ---
    const loopSpeed = 150;       
    const autoCraft = true;      
    const autoBattle = true;     
    const clickDragon = true;    
    const clickAdventure = true; 
    // ---------------------

    let gameBot = null;
    let isPlayingSequence = false;

    function simulateKeyPress(keyName) {
        const keyMap = { 'ArrowUp': 38, 'ArrowDown': 40, 'ArrowLeft': 37, 'ArrowRight': 39 };
        const keyCode = keyMap[keyName];
        
        document.dispatchEvent(new KeyboardEvent('keydown', { key: keyName, code: keyName, keyCode: keyCode, which: keyCode, bubbles: true }));
        document.dispatchEvent(new KeyboardEvent('keyup', { key: keyName, code: keyName, keyCode: keyCode, which: keyCode, bubbles: true }));
    }

    function reactClick(element) {
        ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(eventType => {
            element.dispatchEvent(new MouseEvent(eventType, { bubbles: true, cancelable: true, view: window }));
        });
    }

    function handlePopups() {
        const buttons = document.querySelectorAll('[role="button"], .button__65fca');
        const dismissBtn = Array.from(buttons).find(el => {
            // Ensure the button is actually visible on screen
            if (el.offsetParent === null) return false; 
            
            const text = (el.textContent || "").toLowerCase();
            // Look for any standard popup dismissal text
            return text.includes('continue') || text.includes('go back') || text.includes('okay') || text.includes('close');
        });
        
        if (dismissBtn) {
            reactClick(dismissBtn); 
            console.log(`[SYSTEM] Cleared Popup (${dismissBtn.textContent.trim()}) - Returning to home screen.`);
            return true; 
        }
        return false;
    }

    function isInCrafting() {
        return document.querySelector('div[class*="sequences"]') !== null;
    }

    function isInBattle() {
        return document.querySelector('img[alt="target"]') !== null || document.querySelector('div[class*="targetContainer"]') !== null;
    }

    function handleCrafting() {
        if (isPlayingSequence) return; 

        const sequenceContainer = document.querySelector('div[class*="sequences"]');
        if (!sequenceContainer) return; 

        const arrowElements = Array.from(sequenceContainer.querySelectorAll('img[alt^="Arrow"]'));
        if (arrowElements.length === 0) return;

        const sequence = arrowElements.map(img => img.getAttribute('alt'));
        console.log(`[CRAFTING] Executing sequence: ${sequence.join(', ')}`);
        isPlayingSequence = true; 

        sequence.forEach((direction, index) => {
            setTimeout(() => { simulateKeyPress(direction); }, index * 150);
        });

        const totalTimeToPlay = sequence.length * 150;
        setTimeout(() => { isPlayingSequence = false; }, totalTimeToPlay + 1000); 
    }

    function handleBattle() {
        const targets = document.querySelectorAll('img[alt="target"]');
        
        if (targets.length > 0) {
            targets.forEach(target => {
                reactClick(target);
            });
        }
    }

    function startAutoFarm() {
        // 1. Popups & Error Screens
        if (handlePopups()) return; 

        // 2. Dragon Snipe
        if (clickDragon) {
            const dragon = document.querySelector('img.dragon__8e80e') || document.querySelector('img[alt="Grass Toucher"]');
            if (dragon) reactClick(dragon); 
        }

        // 3. Mini-Game Locks
        if (isInCrafting()) {
            if (autoCraft) handleCrafting();
            return; 
        }

        if (isInBattle()) {
            if (autoBattle) handleBattle();
            return;
        }

        // --- 4. NAVIGATION LOGIC ---
        const activityButtons = Array.from(document.querySelectorAll('.button__65fca, .activityButton_8af73, [role="button"]'));

        const findActiveButton = (name) => {
            return activityButtons.find(el => {
                const text = (el.textContent || "").toLowerCase();
                const targetName = name.toLowerCase();
                
                // Exclude disabled buttons
                const isDisabled = el.disabled || el.getAttribute('aria-disabled') === 'true' || el.className.toLowerCase().includes('disabled');
                
                // Must be visible, not disabled, and contain the target text
                return text.includes(targetName) && !isDisabled && el.offsetParent !== null;
            });
        };

        const craftBtn = findActiveButton('Craft');
        const battleBtn = findActiveButton('Battle');
        const adventureBtn = findActiveButton('Adventure');

        if (autoCraft && craftBtn) {
            reactClick(craftBtn);
            return; 
        }
        
        if (autoBattle && battleBtn) {
            reactClick(battleBtn);
            return;
        }

        if (clickAdventure && adventureBtn) {
            reactClick(adventureBtn);
        }
    }

    // Initialize the bot
    function init() {
        if (gameBot) clearInterval(gameBot);
        gameBot = setInterval(startAutoFarm, loopSpeed);
        console.log("%c[BOT STARTED] Auto-Dismiss Errors Added! Fully Operational.", "color: #00ff00; font-weight: bold; font-size: 14px;");
    }

    window.stopBot = function() {
        clearInterval(gameBot);
        console.log("%c[BOT STOPPED]", "color: #ff0000; font-weight: bold;");
    };

    init();
})();
