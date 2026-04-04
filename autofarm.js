(function () {
    "use strict";

    try { if (typeof window.tlmBot?.stop === "function") window.tlmBot.stop(); } catch {}
    const existingGui = document.getElementById('tlm-gui');
    if (existingGui) existingGui.remove();

    const config = {
        autoCraft: true,
        autoBattle: true,
        clickDragon: true,
        clickAdventure: true,
    };

    const ENGINE_CONF = Object.freeze({
        dragonMs: 50, activityMs: 50, pollMs: 25, settleMs: 20, keyDelayMs: 70, craftRetrySameSeqMs: 700,
        palSmooth: 1, palAimY: 0.93, palTopDelta: 120, palDualCoverRatio: 1.08, palDefaultShieldW: 138, palDefaultProjW: 115, palMinShieldW: 96, blockRealMouse: true,
        priestClickDelayMs: 28, priestTripletDelayMs: 120, goBackScanMs: 60, goBackCooldownMs: 250
    });

    const RANGER_HASH = "16fb25536f00a7996cbdf5bfff2ef0d09459f580af9e67d380263f5ead43055e";
    const PRIEST_MATCHED_CLASS = "matched__0dcd3";

    const SELECTORS = Object.freeze({
        target: 'img[alt="target"], [class*="targetContainer"]', 
        clickable: '[class*="clickable"], [role="button"]', 
        seq: 'div[class*="sequences"]', 
        char: 'img[alt^="Arrow"]',
        cont: '[class*="continueButton"] [class*="clickable"], [class*="continueButton"] button', 
        activity: '[class*="activityButton"]', 
        cooldown: '[class*="countdown"]',
        projectile: 'img[class^="projectile_"]', 
        shield: 'img[class^="shield_"]', 
        palRoot: 'div[class^="game__"], div[class*="container__"]',
        priestGrid: '[class*="grid__"]', 
        priestItem: '[class*="gridItem"]', 
        priestGlyph: 'svg',
        modalResourceText: "[class*='text_'], [data-text-variant='text-lg/normal']",
        goBackBtn: ".button__65fca.buttonWhite__65fca.clickable__5c90e"
    });

    const KEY_MAP = Object.freeze({
        ArrowLeft: { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37, which: 37 },
        ArrowRight: { key: "ArrowRight", code: "ArrowRight", keyCode: 39, which: 39 },
        ArrowUp: { key: "ArrowUp", code: "ArrowUp", keyCode: 38, which: 38 },
        ArrowDown: { key: "ArrowDown", code: "ArrowDown", keyCode: 40, which: 40 },
        " ": { key: " ", code: "Space", keyCode: 32, which: 32 }, Space: { key: " ", code: "Space", keyCode: 32, which: 32 }
    });

    const MOUSE_LOCK_EVENTS = Object.freeze(["pointermove", "mousemove", "dragstart", "pointerdown", "mousedown", "pointerup", "mouseup"]);

    const state = {
        active: false, mode: null, observer: null,
        stats: { dragonClicks: 0, sequencesSolved: 0, targetsSniped: 0, tripletsMatched: 0, popupsCleared: 0, shieldBlocks: 0 },
        palRaf: 0, palDrag: false, palRoot: null, mouseLockHandler: null, projectileMeta: new WeakMap(), liveProjectileSprites: new Set(),
        priestRaf: 0, priestBusy: false, craftBusy: false, lastSeqKey: "", lastSeqSentAt: 0, clickedContinue: new WeakSet(), hitTargets: new WeakSet(), lastGoBackClickAt: 0,
        dragonTimer: 0, activityTimer: 0, goBackTimer: 0, pollTimer: 0
    };

    const queryOne = (selector, root = document) => root.querySelector(selector);
    const queryAll = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const toNum = (value) => { const n = parseFloat(value); return Number.isFinite(n) ? n : null; };
    const normalizeKeyName = (name) => { if (!name) return null; const trimmed = String(name).trim(); return (trimmed === "Space" || trimmed === "Spacebar") ? " " : trimmed; };

    function isVisible(el) {
        if (!(el instanceof Element) || !document.contains(el)) return false;
        const rect = el.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) return false;
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") return false;
        return !(parseFloat(style.opacity || "1") < 0.02);
    }

    function resolveEventCtor(target, ctorName) {
        const targetWin = target?.ownerDocument?.defaultView || target?.defaultView || (target?.window === target ? target : window);
        return targetWin?.[ctorName] || window?.[ctorName] || globalThis?.[ctorName] || null;
    }

    function dispatchSafe(target, ctorName, type, options) {
        if (!target || typeof target.dispatchEvent !== "function") return;
        const EventCtor = resolveEventCtor(target, ctorName);
        if (typeof EventCtor === "function") { try { target.dispatchEvent(new EventCtor(type, options)); } catch {} }
    }

    const emitPointer = (target, type, options) => dispatchSafe(target, "PointerEvent", type, options);
    const emitMouse = (target, type, options) => dispatchSafe(target, "MouseEvent", type, options);

    function sendKey(target, keyName) {
        if (!target) return;
        const key = normalizeKeyName(keyName);
        if (!key || !KEY_MAP[key]) return;
        const options = { bubbles: true, cancelable: true, location: 0, repeat: false, ...KEY_MAP[key] };
        ["keydown", "keypress", "keyup"].forEach(type => dispatchSafe(target, "KeyboardEvent", type, options));
    }

    function hardClick(el) {
        if (!el) return false;
        try { if (typeof el.focus === "function") el.focus({ preventScroll: true }); } catch {}
        const rect = el.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) return false;
        const clientX = rect.left + rect.width / 2, clientY = rect.top + rect.height / 2;
        const targets = [el, document.elementFromPoint(clientX, clientY)].filter(Boolean);
        const base = { bubbles: true, cancelable: true, composed: true, view: window, clientX, clientY };
        const mDown = { ...base, button: 0, buttons: 1 }, mUp = { ...base, button: 0, buttons: 0 };
        const pDown = { ...mDown, pointerId: 1, pointerType: "mouse", isPrimary: true }, pUp = { ...mUp, pointerId: 1, pointerType: "mouse", isPrimary: true };
        targets.forEach(t => { emitPointer(t, "pointerdown", pDown); emitMouse(t, "mousedown", mDown); });
        targets.forEach(t => { emitPointer(t, "pointerup", pUp); emitMouse(t, "mouseup", mUp); emitMouse(t, "click", mUp); });
        dispatchSafe(el, "KeyboardEvent", "keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true });
        dispatchSafe(el, "KeyboardEvent", "keyup", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true });
        try { el.click(); } catch {}
        return true;
    }

    function tryClickGoBackModal() {
        if (Date.now() - state.lastGoBackClickAt < ENGINE_CONF.goBackCooldownMs) return false;
        const warningNode = queryAll(SELECTORS.modalResourceText).find(el => isVisible(el) && /out of resources/i.test((el.textContent || "").trim()));
        if (!warningNode) return false;
        let button = queryAll(SELECTORS.goBackBtn).find(candidate => isVisible(candidate)) || Array.from(document.querySelectorAll('.button__65fca, [role="button"]')).find(el => {
            const t = (el.textContent || "").toLowerCase();
            return (t.includes('go back') || t.includes('okay')) && isVisible(el);
        });
        if (!button) return false;
        state.lastGoBackClickAt = Date.now();
        hardClick(button); setTimeout(() => hardClick(button), 60);
        state.stats.popupsCleared++;
        return true;
    }

    function runActivityTick() {
        if (!state.active) return;
        for (const wrapper of queryAll(SELECTORS.activity)) {
            if (queryOne(SELECTORS.cooldown, wrapper)) continue;
            const t = (wrapper.textContent || "").toLowerCase();
            if (!config.autoCraft && t.includes("craft")) continue;
            if (!config.autoBattle && t.includes("battle")) continue;
            if (!config.clickAdventure && t.includes("adventure")) continue;
            queryOne(SELECTORS.clickable, wrapper)?.click();
        }
    }

    function runDragonTick() {
        if (!state.active || !config.clickDragon) return;
        const el = queryOne(".dragonClickable__8e80e") || queryOne('img[alt="Grass Toucher"]');
        if (el) { hardClick(el); state.stats.dragonClicks++; }
    }

    function tryContinue() {
        const btn = queryOne(SELECTORS.cont);
        if (!btn || state.clickedContinue.has(btn)) return;
        state.clickedContinue.add(btn);
        hardClick(btn);
    }

    function fireTarget(el) {
        if (!document.contains(el)) return;
        const btn = queryOne(SELECTORS.clickable, el) || el;
        hardClick(btn); sendKey(btn, " "); sendKey(document.body, " ");
        state.stats.targetsSniped++;
    }

    function tryTarget(el) {
        if (!config.autoBattle || state.hitTargets.has(el)) return;
        state.hitTargets.add(el);
        setTimeout(() => fireTarget(el), ENGINE_CONF.settleMs);
    }

    async function doSequence(seqEl) {
        if (!config.autoCraft) return;
        const keys = queryAll(SELECTORS.char, seqEl).map(img => normalizeKeyName(img.getAttribute("alt"))).filter(name => KEY_MAP[name]);
        if (!keys.length || state.craftBusy) return;
        const seqKey = keys.join(",");
        if (seqKey === state.lastSeqKey && ENGINE_CONF.craftRetrySameSeqMs - (Date.now() - state.lastSeqSentAt) > 0) return;
        state.craftBusy = true; state.lastSeqKey = seqKey; state.lastSeqSentAt = Date.now();
        try {
            for (const key of keys) {
                let sent = 0;
                try { sendKey(document, key); sent++; } catch(e) {}
                try { sendKey(document.body, key); sent++; } catch(e) {}
                const active = document.activeElement;
                if (active && active !== document.body && document.contains(active)) {
                    try { sendKey(active, key); sent++; } catch(e) {}
                }
                await delay(ENGINE_CONF.keyDelayMs);
            }
            state.stats.sequencesSolved++;
        } finally { state.craftBusy = false; }
    }

    function resetPaladinProjectileCache() {
        state.projectileMeta = new WeakMap();
        state.liveProjectileSprites = new Set();
    }

    function isResolvedProjectile(el, topMetric, src, now) {
        let meta = state.projectileMeta.get(el);
        if (!meta) {
            meta = { top: topMetric, ts: now, stableFrames: 0, moved: false, src: src || "" };
            state.projectileMeta.set(el, meta);
            return false;
        }
        const dy = Math.abs(topMetric - meta.top);
        const dt = now - meta.ts;
        if (dy > 0.7) {
            meta.moved = true; meta.stableFrames = 0;
            if (src) state.liveProjectileSprites.add(src);
        } else if (dt >= 20) { meta.stableFrames += 1; }
        const looksLikeImpactSprite = meta.moved && !!src && state.liveProjectileSprites.size > 0 && !state.liveProjectileSprites.has(src);
        const frozenAfterMove = meta.moved && meta.stableFrames >= 2;
        const resolved = looksLikeImpactSprite || frozenAfterMove;
        meta.top = topMetric; meta.ts = now; meta.src = src || meta.src;
        return resolved;
    }

    function getShieldWidthLogical(shield) {
        return Math.max(ENGINE_CONF.palMinShieldW, toNum(shield.style.width) ?? toNum(getComputedStyle(shield).width) ?? ENGINE_CONF.palDefaultShieldW);
    }

    function getProjectileThreats(root) {
        const list = [];
        const now = performance.now();
        for (const el of queryAll(SELECTORS.projectile, root)) {
            if (!isVisible(el)) continue;
            const rect = el.getBoundingClientRect();
            const topMetric = toNum(el.style.top) ?? rect.bottom;
            const src = el.getAttribute("src") || "";
            if (isResolvedProjectile(el, topMetric, src, now)) continue;
            const leftLogical = toNum(el.style.left);
            const widthLogical = toNum(el.style.width) ?? ENGINE_CONF.palDefaultProjW;
            const logicalCenter = leftLogical === null ? null : leftLogical + widthLogical / 2;
            const clientCenter = rect.left + rect.width / 2;
            list.push({ el, topMetric, logicalCenter, clientCenter });
        }
        list.sort((a, b) => b.topMetric - a.topMetric);
        return list;
    }

    function choosePaladinTarget(threats, shieldW) {
        if (!threats.length) return null;
        const first = threats[0], second = threats[1];
        if (!second) return { logicalCenter: first.logicalCenter, clientCenter: first.clientCenter };
        const closeInY = first.topMetric - second.topMetric <= ENGINE_CONF.palTopDelta;
        if (closeInY && first.logicalCenter !== null && second.logicalCenter !== null && Math.abs(first.logicalCenter - second.logicalCenter) <= shieldW * ENGINE_CONF.palDualCoverRatio) {
            let avgLogical = first.logicalCenter + second.logicalCenter;
            let avgClient = first.clientCenter + second.clientCenter;
            let count = 2;
            for (let i = 2; i < threats.length; i++) {
                const threat = threats[i];
                if (first.topMetric - threat.topMetric > ENGINE_CONF.palTopDelta) break;
                if (threat.logicalCenter === null) continue;
                if (Math.abs(first.logicalCenter - threat.logicalCenter) > shieldW * ENGINE_CONF.palDualCoverRatio) continue;
                avgLogical += threat.logicalCenter; avgClient += threat.clientCenter; count++;
            }
            return { logicalCenter: avgLogical / count, clientCenter: avgClient / count };
        }
        return { logicalCenter: first.logicalCenter, clientCenter: first.clientCenter };
    }

    function getPaladinInputTargets(ctx) {
        return [ctx.shield, ctx.root, document, document.body, window];
    }

    function paladinPointerDown(ctx, x, y) {
        const base = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };
        const mouse = { ...base, button: 0, buttons: 1 };
        const pointer = { ...mouse, pointerId: 1, pointerType: "mouse", isPrimary: true };
        for (const target of getPaladinInputTargets(ctx)) {
            emitPointer(target, "pointerdown", pointer); emitMouse(target, "mousedown", mouse);
        }
        state.palDrag = true;
    }

    function paladinPointerMove(ctx, x, y) {
        const base = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, buttons: 1 };
        const pointer = { ...base, pointerId: 1, pointerType: "mouse", isPrimary: true };
        for (const target of getPaladinInputTargets(ctx)) {
            emitPointer(target, "pointermove", pointer); emitMouse(target, "mousemove", base);
        }
    }

    function paladinPointerUp() {
        if (!state.palDrag) return;
        const root = state.palRoot;
        const rect = root?.getBoundingClientRect();
        const x = rect ? rect.left + rect.width / 2 : 0;
        const y = rect ? rect.top + rect.height * ENGINE_CONF.palAimY : 0;
        const base = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };
        const mouse = { ...base, button: 0, buttons: 0 };
        const pointer = { ...mouse, pointerId: 1, pointerType: "mouse", isPrimary: true };
        for (const target of [root, document, document.body, window]) {
            emitPointer(target, "pointerup", pointer); emitMouse(target, "mouseup", mouse);
        }
        state.palDrag = false;
    }

    function mouseEventInsidePaladin(e) {
        const root = state.palRoot;
        if (!root) return true;
        if (!("clientX" in e) || !("clientY" in e)) return true;
        const rect = root.getBoundingClientRect();
        return (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom);
    }

    function enableMouseLock() {
        if (!ENGINE_CONF.blockRealMouse || state.mouseLockHandler) return;
        state.mouseLockHandler = (e) => {
            if (state.mode !== "paladin" || !e.isTrusted || !mouseEventInsidePaladin(e)) return;
            e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        };
        for (const ev of MOUSE_LOCK_EVENTS) {
            window.addEventListener(ev, state.mouseLockHandler, true); document.addEventListener(ev, state.mouseLockHandler, true);
        }
    }

    function disableMouseLock() {
        if (!state.mouseLockHandler) return;
        for (const ev of MOUSE_LOCK_EVENTS) {
            window.removeEventListener(ev, state.mouseLockHandler, true); document.removeEventListener(ev, state.mouseLockHandler, true);
        }
        state.mouseLockHandler = null;
    }

    function getPaladinContext() {
        let best = null;
        for (const root of queryAll(SELECTORS.palRoot)) {
            if (!isVisible(root)) continue;
            const shield = queryOne(SELECTORS.shield, root);
            if (!shield || !isVisible(shield)) continue;
            const rect = root.getBoundingClientRect();
            if (rect.width < 80 || rect.height < 80) continue;
            const projectiles = queryAll(SELECTORS.projectile, root).filter(isVisible);
            const score = projectiles.length * 1000000 + rect.width * rect.height;
            if (!best || score > best.score) best = { root, shield, rect, projectiles, score };
        }
        return best;
    }

    function paladinTick() {
        if (!config.autoBattle) return;
        const ctx = getPaladinContext();
        if (!ctx) return;
        state.palRoot = ctx.root;
        const threats = getProjectileThreats(ctx.root);
        if (!threats.length) return;
        const shieldW = getShieldWidthLogical(ctx.shield);
        const target = choosePaladinTarget(threats, shieldW);
        if (!target) return;
        if (target.logicalCenter !== null) {
            const currentLeft = toNum(ctx.shield.style.left);
            const desiredLeft = target.logicalCenter - shieldW / 2;
            const nextLeft = currentLeft === null ? desiredLeft : currentLeft + (desiredLeft - currentLeft) * ENGINE_CONF.palSmooth;
            ctx.shield.style.setProperty("left", `${nextLeft}px`, "important");
            ctx.shield.style.setProperty("transform", "none", "important");
        }
        if (target.clientCenter === null || target.clientCenter === undefined) return;
        const x = target.clientCenter, y = ctx.rect.top + ctx.rect.height * ENGINE_CONF.palAimY;
        if (!state.palDrag) paladinPointerDown(ctx, x, y);
        paladinPointerMove(ctx, x, y);
        state.stats.shieldBlocks++;
    }

    function paladinLoop() {
        paladinTick();
        state.palRaf = requestAnimationFrame(paladinLoop);
    }

    function startPaladinBot() {
        if (state.palRaf) return;
        resetPaladinProjectileCache();
        enableMouseLock();
        state.palRaf = requestAnimationFrame(paladinLoop);
    }

    function stopPaladinBot() {
        if (state.palRaf) { cancelAnimationFrame(state.palRaf); state.palRaf = 0; }
        paladinPointerUp(); disableMouseLock(); resetPaladinProjectileCache(); state.palRoot = null;
    }

    function hasPriestBoard() {
        const grid = queryOne(SELECTORS.priestGrid) || queryOne(".game__5c62c");
        if (!grid) return false;
        const items = queryAll(SELECTORS.priestItem).filter(isVisible);
        return items.length >= 3;
    }

    function getPriestGlyphSignature(tile) {
        const glyphRoot = queryOne(SELECTORS.priestGlyph, tile) || queryOne(".gridAssetFront__0dcd3 svg", tile) || queryOne("svg", tile);
        if (!glyphRoot) return null;
        const paths = queryAll("path", glyphRoot).map((p) => p.getAttribute("d") || "").join("|");
        if (paths && paths.length > 12) return paths;
        return (glyphRoot.innerHTML || "").replace(/\s+/g, "") || null;
    }

    function buildPriestGroups() {
        const items = queryAll(SELECTORS.priestItem).filter((el) => isVisible(el) && !el.classList.contains(PRIEST_MATCHED_CLASS));
        const groupsBySignature = new Map();
        for (const item of items) {
            const signature = getPriestGlyphSignature(item);
            if (!signature) continue;
            if (!groupsBySignature.has(signature)) groupsBySignature.set(signature, []);
            groupsBySignature.get(signature).push(item);
        }
        return Array.from(groupsBySignature.values()).filter((group) => group.length >= 3).map((group) => group.slice(0, 3));
    }

    async function solvePriestBoardOnce() {
        if (state.priestBusy || state.mode !== "priest" || !config.autoBattle) return;
        state.priestBusy = true;
        try {
            const groups = buildPriestGroups();
            if (!groups.length) return;
            for (const group of groups) {
                if (state.mode !== "priest") break;
                const live = group.filter((el) => document.contains(el) && isVisible(el) && !el.classList.contains(PRIEST_MATCHED_CLASS));
                if (live.length < 3) continue;
                for (const tile of live) {
                    if (state.mode !== "priest") break;
                    hardClick(tile); await delay(ENGINE_CONF.priestClickDelayMs);
                }
                state.stats.tripletsMatched++;
                await delay(ENGINE_CONF.priestTripletDelayMs);
            }
        } finally { state.priestBusy = false; }
    }

    function priestTick() {
        if (state.mode !== "priest" || !hasPriestBoard()) return;
        solvePriestBoardOnce();
    }

    function priestLoop() {
        priestTick();
        state.priestRaf = requestAnimationFrame(priestLoop);
    }

    function startPriestBot() {
        if (state.priestRaf) return;
        state.priestBusy = false;
        state.priestRaf = requestAnimationFrame(priestLoop);
    }

    function stopPriestBot() {
        if (state.priestRaf) { cancelAnimationFrame(state.priestRaf); state.priestRaf = 0; }
        state.priestBusy = false;
    }

    function getBattleType() {
        if (getPaladinContext()) return "paladin";
        if (hasPriestBoard()) return "priest";
        if (queryAll(SELECTORS.target).some(isVisible)) return "ranger";
        for (const wrapper of queryAll(SELECTORS.activity)) {
            const img = wrapper.querySelector("img.activityButtonAsset__8af73, img.asset__65fca");
            if (img && img.src && img.src.includes(RANGER_HASH)) return "ranger";
        }
        return null;
    }

    function checkBattleMode() {
        const mode = getBattleType();
        if (mode === state.mode) return;
        state.mode = mode;
        if (mode === "paladin") { stopPriestBot(); startPaladinBot(); return; }
        if (mode === "priest") { stopPaladinBot(); startPriestBot(); return; }
        stopPaladinBot(); stopPriestBot();
    }

    function handleAddedNode(node) {
        if (!(node instanceof Element)) return;
        if (node.matches?.(SELECTORS.target)) tryTarget(node);
        node.querySelectorAll?.(SELECTORS.target).forEach(tryTarget);
        const seq = node.matches?.(SELECTORS.seq) ? node : node.querySelector?.(SELECTORS.seq);
        if (seq) doSequence(seq);
        if (node.matches?.(SELECTORS.cont) || node.querySelector?.(SELECTORS.cont)) tryContinue();
        if (state.mode === "paladin" && (node.matches?.(SELECTORS.projectile) || node.querySelector?.(SELECTORS.projectile))) paladinTick();
        if (state.mode === "priest" && (node.matches?.(SELECTORS.priestItem) || node.matches?.(SELECTORS.priestGrid) || node.querySelector?.(SELECTORS.priestItem))) priestTick();
    }

    function handleMutation(mutation) {
        for (const node of mutation.addedNodes) handleAddedNode(node);
        if (mutation.type === "childList" && mutation.target instanceof Element) {
            if (mutation.target.closest?.(SELECTORS.seq) || mutation.target.matches?.(SELECTORS.seq)) {
                doSequence(mutation.target.closest(SELECTORS.seq) || mutation.target);
            }
        }
    }

    function runPollTick() {
        if (!state.active) return;
        tryClickGoBackModal(); checkBattleMode();
        queryAll(SELECTORS.target).forEach(tryTarget);
        const seq = queryOne(SELECTORS.seq);
        if (seq) doSequence(seq); else { state.lastSeqKey = ""; state.lastSeqSentAt = 0; }
        if (state.mode === "priest") priestTick();
        tryContinue();
    }

    function createGUI() {
        if (document.getElementById('tlm-gui')) return; 
        const style = document.createElement('style');
        style.innerHTML = `
            #tlm-gui-container { position: fixed; top: 20px; left: 20px; width: 300px; background-color: rgba(30, 30, 35, 0.75); color: #ffffff; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); font-family: -apple-system, BlinkMacSystemFont, 'gg sans', sans-serif; border-radius: 16px; box-shadow: 0 12px 40px rgba(0,0,0,0.4); z-index: 999999; border: 1px solid rgba(255,255,255,0.15); }
            #tlm-gui-header { font-weight: 700; font-size: 14px; padding: 12px 16px; background: rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.08); cursor: grab; display: flex; justify-content: space-between; align-items: center; user-select: none; }
            #tlm-btn-master { width: 100%; border: none; padding: 12px; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: 14px; color: white; background: #34C759; box-shadow: 0 4px 12px rgba(52, 199, 89, 0.3); transition: all 0.2s ease; margin-bottom: 16px; }
            #tlm-btn-master.active { background: #FF3B30; box-shadow: 0 4px 12px rgba(255, 59, 48, 0.3); }
            .tlm-toggle-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 13px; font-weight: 500; }
            .ios-toggle { position: relative; width: 40px; height: 22px; appearance: none; -webkit-appearance: none; background: rgba(255,255,255,0.2); border-radius: 20px; outline: none; cursor: pointer; transition: background 0.3s ease; }
            .ios-toggle::after { content: ''; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; background: white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: transform 0.3s ease; }
            .ios-toggle:checked { background: #0A84FF; } .ios-toggle:checked::after { transform: translateX(18px); }
            .tlm-stats-box { background: rgba(0,0,0,0.2); border-radius: 10px; padding: 12px; font-size: 12px; color: #EBEBF5; border: 1px solid rgba(255,255,255,0.05); }
            .tlm-stat-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
            .tlm-stat-val { font-weight: 700; font-family: monospace; color: white; }
            .tlm-badge { font-size: 10px; padding: 2px 6px; border-radius: 8px; font-weight: 700; background: rgba(255, 59, 48, 0.2); color: #FF453A; }
            .tlm-badge.on { background: rgba(52, 199, 89, 0.2); color: #32D74B; }
        `;
        document.head.appendChild(style);

        const gui = document.createElement('div'); gui.id = 'tlm-gui';
        gui.innerHTML = `
            <div id="tlm-gui-container">
                <div id="tlm-gui-header"><span>🐉 TLM Auto-Farmer</span><span id="tlm-btn-collapse" style="cursor: pointer;">▼</span></div>
                <div id="tlm-gui-body" style="padding: 16px;">
                    <button id="tlm-btn-master">START FARMING</button>
                    <div style="margin-bottom:16px;">
                        <label class="tlm-toggle-row"><span>Auto-Craft</span><input type="checkbox" class="ios-toggle" id="cb-craft" ${config.autoCraft ? 'checked' : ''}></label>
                        <label class="tlm-toggle-row"><span>Auto-Battle</span><input type="checkbox" class="ios-toggle" id="cb-battle" ${config.autoBattle ? 'checked' : ''}></label>
                        <label class="tlm-toggle-row"><span>Snipe Boss</span><input type="checkbox" class="ios-toggle" id="cb-dragon" ${config.clickDragon ? 'checked' : ''}></label>
                        <label class="tlm-toggle-row" style="margin-bottom:0;"><span>Auto-Adventure</span><input type="checkbox" class="ios-toggle" id="cb-adv" ${config.clickAdventure ? 'checked' : ''}></label>
                    </div>
                    <div class="tlm-stats-box">
                        <div class="tlm-stat-row"><span>Status</span> <span id="tlm-stat-status" class="tlm-badge">OFFLINE</span></div>
                        <div class="tlm-stat-row"><span>Boss Clicks</span> <span id="tlm-stat-dragon" class="tlm-stat-val">0</span></div>
                        <div class="tlm-stat-row"><span>Targets</span> <span id="tlm-stat-targets" class="tlm-stat-val">0</span></div>
                        <div class="tlm-stat-row"><span>Shield Moves</span> <span id="tlm-stat-shields" class="tlm-stat-val">0</span></div>
                        <div class="tlm-stat-row"><span>Sequences</span> <span id="tlm-stat-arrows" class="tlm-stat-val">0</span></div>
                        <div class="tlm-stat-row"><span>Grids Matched</span> <span id="tlm-stat-grids" class="tlm-stat-val">0</span></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(gui);

        let isDragging = false, initX, initY, container = document.getElementById('tlm-gui-container');
        document.getElementById('tlm-gui-header').onmousedown = e => { isDragging = true; initX = e.clientX - container.offsetLeft; initY = e.clientY - container.offsetTop; };
        document.onmousemove = e => { if (isDragging) { e.preventDefault(); container.style.left = (e.clientX - initX) + 'px'; container.style.top = (e.clientY - initY) + 'px'; }};
        document.onmouseup = () => isDragging = false;
        
        let collapsed = false;
        document.getElementById('tlm-btn-collapse').onclick = function() { collapsed = !collapsed; document.getElementById('tlm-gui-body').style.display = collapsed ? 'none' : 'block'; this.innerText = collapsed ? '▲' : '▼'; };

        const masterBtn = document.getElementById('tlm-btn-master');
        masterBtn.onclick = () => {
            if (state.active) window.tlmBot.stop(); else window.tlmBot.start();
            masterBtn.innerText = state.active ? "STOP FARMING" : "START FARMING"; masterBtn.className = state.active ? "active" : "";
        };

        ['craft','battle','dragon','adv'].forEach(id => document.getElementById(`cb-${id}`).onchange = e => config[`auto${id.charAt(0).toUpperCase() + id.slice(1)}`] = e.target.checked);
        document.getElementById('cb-dragon').onchange = e => config.clickDragon = e.target.checked;
        document.getElementById('cb-adv').onchange = e => config.clickAdventure = e.target.checked;

        setInterval(() => {
            if (!document.getElementById('tlm-gui')) return;
            const b = document.getElementById('tlm-stat-status'); b.innerText = state.active ? "ACTIVE" : "OFFLINE"; b.className = state.active ? "tlm-badge on" : "tlm-badge";
            document.getElementById('tlm-stat-dragon').innerText = state.stats.dragonClicks;
            document.getElementById('tlm-stat-targets').innerText = state.stats.targetsSniped;
            document.getElementById('tlm-stat-shields').innerText = state.stats.shieldBlocks;
            document.getElementById('tlm-stat-arrows').innerText = state.stats.sequencesSolved;
            document.getElementById('tlm-stat-grids').innerText = state.stats.tripletsMatched;
        }, 500);
    }

    window.tlmBot = {
        start: () => {
            if (state.active) return; state.active = true;
            state.dragonTimer = setInterval(runDragonTick, ENGINE_CONF.dragonMs);
            state.activityTimer = setInterval(runActivityTick, ENGINE_CONF.activityMs);
            state.goBackTimer = setInterval(tryClickGoBackModal, ENGINE_CONF.goBackScanMs);
            state.pollTimer = setInterval(runPollTick, ENGINE_CONF.pollMs);
            state.observer = new MutationObserver(mutations => {
                if (!state.active) return;
                tryClickGoBackModal(); checkBattleMode();
                for (const mutation of mutations) handleMutation(mutation);
            });
            state.observer.observe(document.body, { childList: true, subtree: true });
        },
        stop: () => {
            state.active = false;
            [state.dragonTimer, state.activityTimer, state.goBackTimer, state.pollTimer].forEach(clearInterval);
            stopPaladinBot(); stopPriestBot();
            if (state.observer) { state.observer.disconnect(); state.observer = null; }
        }
    };

    createGUI();
})();
