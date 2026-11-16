(function () {
    "use strict";

    function install() {
        if (window.gtpCompassHud) window.gtpCompassHud.dispose();
        const prefix = "gtpCompass.";
        const artRoot = "coui://gtp-compass/";
        const neonGreen = "#39ff14";
        const hoveringHint = "Ctrl + Left Click to Move  |  Shift + Ctrl to Resize";
        const toolbarRowSelector = [
            '[class*="top-new_"] > [class*="end_"]',
            '[class*="top-inner_"] > [class*="end_"]',
            '[class*="toolbar-right-section-top_"] > [class*="section-top-end_"]'
        ].join(", ");
        const styles = [
            { id: "Wealthy", label: "Wealthy", file: "CompassDial.png", box: [9, 15.9, 82],
                marker: "needle", arrow: "#ad4404", letter: "#fff1ce" },
            { id: "NauticalChart", label: "Nautical Chart", box: [6, 9.4, 88],
                arrow: "#ad3029", letter: "#102948", shadow: "#fff3d5" },
            { id: "SurveyorGrid", label: "Surveyor Grid", box: [5.5, 6.5, 89],
                arrow: "#f74711", letter: "#192331", shadow: "#ffffff" },
            { id: "CockpitDisplay", label: "Cockpit Display", box: [44, 44.7, 12], headingBox: [42.5, 38.7, 15],
                marker: "cockpit", arrow: "#ffc23d", letter: "#ffd179" },
            { id: "MetroTile", label: "Metro Tile", box: [7.5, 8.5, 85],
                arrow: "#ffd923", letter: "#ffdd32" },
            { id: "IndustrialGauge", label: "Industrial Gauge", box: [6, 7.6, 88],
                arrow: "#ff4c2a", letter: "#faf1da" },
            { id: "PixelLcd", label: "Pixel LCD", box: [10.5, 9.9, 79],
                marker: "pixel", arrow: "#ffb522", letter: "#cfff32" },
            { id: "StealthMinimal", label: "Stealth Minimal", box: [4.8, 6, 90],
                arrow: "#ffb943", letter: "#ffbe58" },
            { id: "OrbitalHologram", label: "Orbital Hologram", box: [5, 5.7, 90],
                marker: "needle", arrow: "#fff000", letter: "#fff000" },
            { id: "EnamelEmblem", label: "Enamel Emblem", box: [10.2, 15.6, 78],
                arrow: "#ff5536", letter: "#fff0c5" }
        ];
        // Horizontally align the labels and markers with the illuminated ticks in the artwork.
        const cockpitTicks = [11.3, 28.4, 50, 69.2, 88.9];
        const northPaths = {
            needle: "M 50 27 L 54.6 47 Q 50 43.5 45.4 47 Z",
            pointer: "M 50 29 L 59 46 L 50 42 L 41 46 Z",
            pixel: "M 48 28 H 52 V 33 H 55 V 38 H 58 V 43 H 61 V 48 H 56 V 46 H 53 V 43 H 47 V 46 H 44 V 48 H 39 V 43 H 42 V 38 H 45 V 33 H 48 Z",
            cockpit: "M 50 25 L 82 60 L 50 52 L 18 60 Z"
        };
        const headingPaths = {
            standard: "M 50 10.5 L 56 18.5 L 44 18.5 Z",
            pixel: "M 50 7 L 59 18 L 41 18 Z",
            cockpit: "M 50 18 L 88 53 L 12 53 Z",
            anchored: "M 50 8 L 57.8 18.5 L 42.2 18.5 Z",
            anchoredCockpit: "M 50 17 L 92 56 L 8 56 Z"
        };
        const style = document.createElement("style");
        style.textContent = `
            #gtp-compass {
                position: fixed; z-index: 1100;
                user-select: none;
            }
            .gtpc-toolbar-slot {
                align-self: center; flex-grow: 0; flex-shrink: 0;
                pointer-events: none;
            }
            .gtpc-surface .gtpc-capture {
                display: none; position: fixed; left: 0; top: 0; width: 100vw; height: 100vh;
                background: rgba(0, 0, 0, 0.005);
            }
            .gtpc-surface .gtpc-dial {
                display: block; position: absolute; left: 0; top: 0; width: 100%; height: 100%;
                margin: 0; padding: 0; border: 0; background: rgba(0, 0, 0, 0.005);
                cursor: pointer;
            }
            .gtpc-anchored .gtpc-dial {
                border-radius: 50%;
                background-color: #141f25;
            }
            .gtpc-anchored .gtpc-dial:hover,
            .gtpc-anchored .gtpc-dial[aria-expanded="true"] {
                background-color: #29404a;
            }
            .gtpc-surface .gtpc-layer {
                position: absolute; left: 0; top: 0; width: 100%; height: 100%;
                pointer-events: none;
            }
            .gtpc-surface .gtpc-north, .gtpc-surface .gtpc-heading {
                left: 9%; top: 15.9%; width: 82%; height: 82%;
            }
            .gtpc-surface .gtpc-letter {
                position: absolute; left: 42%; top: 19%; width: 16%; height: 9%;
                display: flex; align-items: center; justify-content: center;
                color: #fff1ce; font-weight: 800; font-style: normal; line-height: 1;
                text-shadow: 0 1px 2px #07131f; pointer-events: none;
            }
            .gtpc-anchored .gtpc-letter { font-weight: 600; }
            .gtpc-surface .gtpc-cockpit-n {
                display: none; top: 46.3%; width: 6%; height: 7%;
            }
            .gtpc-surface .gtpc-cockpit-scale { display: none; }
            .gtpc-surface .gtpc-cockpit-scale span {
                position: absolute; top: 60.8%; transform: translateX(-50%);
                padding: 0 0.16em; border-radius: 0.25em; background: #0b1821;
                color: #c5fbff; font-weight: 600; font-variant-numeric: tabular-nums;
                line-height: 1.05; white-space: nowrap;
            }
            .gtpc-surface .gtpc-compact-scale span:nth-child(even) {
                margin-top: 1.16em;
            }
            .gtpc-surface .gtpc-handle {
                display: none; position: absolute; width: 17px; height: 17px; box-sizing: border-box;
                border-top: 3px solid #ffd181; border-left: 3px solid #ffd181;
                border-radius: 2px; background: rgba(201, 130, 32, 0.42);
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.72);
            }
            #gtp-compass.gtpc-resize .gtpc-handle { display: block; }
            .gtpc-surface .gtpc-nw { left: 0; top: 0; cursor: nwse-resize; }
            .gtpc-surface .gtpc-ne { right: 0; top: 0; cursor: nesw-resize; transform: rotate(90deg); }
            .gtpc-surface .gtpc-se { right: 0; bottom: 0; cursor: nwse-resize; transform: rotate(180deg); }
            .gtpc-surface .gtpc-sw { left: 0; bottom: 0; cursor: nesw-resize; transform: rotate(270deg); }
            .gtpc-surface .gtpc-menu {
                display: none; position: absolute; box-sizing: border-box; padding: 0.35em;
                background: #101c29; border: 1px solid #516377; border-radius: 0.55em;
                box-shadow: 0 5px 18px rgba(0, 0, 0, 0.52);
                pointer-events: auto;
            }
            .gtpc-anchored .gtpc-menu { overflow-y: auto; }
            .gtpc-surface .gtpc-menu button {
                display: flex; flex-direction: row; align-items: center; justify-content: space-between;
                width: 100%; min-height: 2.55em; padding: 0.25em 0.65em;
                background: transparent; border: 0; border-radius: 0.3em;
                font-family: inherit; font-size: inherit; color: #f1f6fa; cursor: pointer; text-align: left;
            }
            .gtpc-surface .gtpc-menu button:hover { background: #263950; }
            .gtpc-surface .gtpc-menu button[aria-disabled="true"] {
                color: #9ba9b7; cursor: default; background: transparent;
            }
            .gtpc-surface .gtpc-menu button span { white-space: nowrap; }
            .gtpc-surface .gtpc-key {
                margin-left: 0.65em; padding: 0.18em 0.5em; border: 1px solid #637b94;
                border-radius: 0.3em; color: #ffd181; font-size: 0.82em; white-space: nowrap;
            }
            .gtpc-surface .gtpc-menu .gtpc-choice-toggle {
                margin-top: 0.25em; border-top: 1px solid #36495d;
            }
            .gtpc-surface .gtpc-choice-value { color: #ffd181; font-size: 0.9em; }
            .gtpc-surface .gtpc-choice-list {
                display: none; overflow-y: auto; padding-left: 0.5em;
                border-left: 1px solid #516377;
            }
            .gtpc-surface .gtpc-choice-list button { min-height: 2.1em; }
            .gtpc-surface .gtpc-choice-list button[aria-current="true"] {
                background: #293e56; color: #ffd181;
            }
            .gtpc-surface .gtpc-style-list button { justify-content: flex-start; }
            .gtpc-surface .gtpc-style-preview {
                width: 1.65em; height: 1.65em; flex-shrink: 0; margin-right: 0.55em;
                object-fit: contain; pointer-events: none;
            }
            .gtpc-surface .gtpc-gesture-hint {
                margin: 0.15em 0.8em 0.35em;
                color: #a6aab0; font-size: 0.82em; font-style: italic;
                line-height: 1.35; white-space: pre-wrap;
            }
            .gtpc-anchored .gtpc-gesture-hint { display: none; }
        `;
        const root = document.createElement("div");
        root.id = "gtp-compass";
        root.className = "gtpc-surface";
        root.style.display = "none";
        root.innerHTML = `
            <div class="gtpc-capture"></div>
            <button type="button" class="gtpc-dial" aria-label="Compass" aria-haspopup="true" aria-expanded="false">
                <img class="gtpc-layer gtpc-face" src="coui://gtp-compass/CompassDial.png" alt="" aria-hidden="true">
                <div class="gtpc-layer gtpc-north" aria-hidden="true">
                    <svg class="gtpc-layer" viewBox="0 0 100 100">
                        <defs>
                            <linearGradient id="gtpc-needle-amber" x1="0%" y1="0%" x2="100%" y2="85%">
                                <stop offset="0%" stop-color="#ffbd54"/>
                                <stop offset="48%" stop-color="#ed8a1c"/>
                                <stop offset="100%" stop-color="#bc4e05"/>
                            </linearGradient>
                        </defs>
                        <path class="gtpc-north-arrow" d="M 50 27 L 54.6 47 Q 50 43.5 45.4 47 Z" fill="#ad4404"
                            stroke="#321b10" stroke-width="0.8" stroke-linejoin="round"/>
                        <path class="gtpc-needle-detail" d="M 50 27 L 50 45.25 Q 47.6 45.4 45.4 47 Z" fill="url(#gtpc-needle-amber)"/>
                        <path class="gtpc-needle-detail" d="M 50 29 L 50 44.8" stroke="#ffbd54" stroke-width="0.35"/>
                    </svg>
                    <span class="gtpc-letter gtpc-n">N</span>
                </div>
                <div class="gtpc-layer gtpc-heading" aria-hidden="true">
                    <svg class="gtpc-layer" viewBox="0 0 100 100">
                        <path class="gtpc-heading-arrow" d="${headingPaths.standard}"
                            fill="${neonGreen}" stroke="#07131f" stroke-width="0.9" stroke-linejoin="round"/>
                    </svg>
                </div>
                <span class="gtpc-letter gtpc-cockpit-n" aria-hidden="true">N</span>
                <div class="gtpc-layer gtpc-cockpit-scale" aria-hidden="true"></div>
            </button>
            <div class="gtpc-handle gtpc-nw" data-x="-1" data-y="-1" aria-hidden="true"></div>
            <div class="gtpc-handle gtpc-ne" data-x="1" data-y="-1" aria-hidden="true"></div>
            <div class="gtpc-handle gtpc-se" data-x="1" data-y="1" aria-hidden="true"></div>
            <div class="gtpc-handle gtpc-sw" data-x="-1" data-y="1" aria-hidden="true"></div>
            <div class="gtpc-menu">
                <button type="button" data-action="turnNorth"><span>Turn North</span><span class="gtpc-key"></span></button>
                <button type="button" data-action="returnToPreviousView"><span>Return to Previous View</span><span class="gtpc-key"></span></button>
                <button type="button" data-action="openOptions"><span>Open Options</span><span class="gtpc-key"></span></button>
                <button type="button" class="gtpc-style-toggle gtpc-choice-toggle" aria-expanded="false" aria-controls="gtpc-style-list">
                    <span>Compass Style</span><span class="gtpc-style-value gtpc-choice-value">Wealthy</span>
                </button>
                <div class="gtpc-style-list gtpc-choice-list" id="gtpc-style-list" role="group" aria-label="Compass styles"></div>
                <button type="button" class="gtpc-placement-toggle gtpc-choice-toggle" aria-expanded="false" aria-controls="gtpc-placement-list">
                    <span>Compass Placement</span><span class="gtpc-placement-value gtpc-choice-value">Hovering Compass</span>
                </button>
                <div class="gtpc-placement-list gtpc-choice-list" id="gtpc-placement-list" role="group" aria-label="Compass placements"></div>
                <p class="gtpc-gesture-hint">${hoveringHint}</p>
            </div>
        `;

        const dial = root.querySelector(".gtpc-dial");
        const toolbarSlot = document.createElement("div");
        toolbarSlot.className = "gtpc-toolbar-slot";
        toolbarSlot.setAttribute("aria-hidden", "true");
        const capture = root.querySelector(".gtpc-capture");
        const face = root.querySelector(".gtpc-face");
        const needle = root.querySelector(".gtpc-north");
        const northLetter = root.querySelector(".gtpc-n");
        const cockpitLetter = root.querySelector(".gtpc-cockpit-n");
        const cockpitScale = root.querySelector(".gtpc-cockpit-scale");
        const degreeLabels = cockpitTicks.map(() => {
            const label = document.createElement("span");
            cockpitScale.appendChild(label);
            return label;
        });
        const northArrow = root.querySelector(".gtpc-north-arrow");
        const needleDetails = Array.from(root.querySelectorAll(".gtpc-needle-detail"));
        const heading = root.querySelector(".gtpc-heading");
        const headingArrow = root.querySelector(".gtpc-heading-arrow");
        const menu = root.querySelector(".gtpc-menu");
        const rows = Array.from(menu.querySelectorAll("button[data-action]"));
        const styleToggle = menu.querySelector(".gtpc-style-toggle");
        const styleValue = styleToggle.querySelector(".gtpc-style-value");
        const styleList = menu.querySelector(".gtpc-style-list");
        const placementToggle = menu.querySelector(".gtpc-placement-toggle");
        const placementValue = placementToggle.querySelector(".gtpc-placement-value");
        const placementList = menu.querySelector(".gtpc-placement-list");
        const handles = Array.from(root.querySelectorAll(".gtpc-handle"));
        const hotkeys = ["", "", ""];
        const gameFont = getComputedStyle(document.body).fontFamily;
        northLetter.style.fontFamily = gameFont;
        cockpitLetter.style.fontFamily = gameFont;
        cockpitScale.style.fontFamily = gameFont;
        styleToggle.style.fontFamily = gameFont;
        placementToggle.style.fontFamily = gameFont;
        rows.forEach(row => { row.style.fontFamily = gameFont; });
        const styleChoices = styles.map(option => {
            const button = document.createElement("button");
            button.setAttribute("type", "button");
            button.style.fontFamily = gameFont;
            const preview = document.createElement("img");
            preview.className = "gtpc-style-preview";
            preview.alt = "";
            const label = document.createElement("span");
            label.textContent = option.label;
            button.appendChild(preview);
            button.appendChild(label);
            button.addEventListener("click", event => {
                eat(event);
                showChoices(null);
                engine.trigger(prefix + "setStyle", option.id);
            });
            styleList.appendChild(button);
            return { button, preview };
        });
        const placementButtons = ["Hovering", "Anchored"].map(name => {
            const button = document.createElement("button");
            button.type = "button";
            button.style.fontFamily = gameFont;
            button.textContent = name + " Compass";
            button.setAttribute("aria-current", String(name === "Hovering"));
            button.addEventListener("click", event => {
                eat(event);
                showChoices(null);
                engine.trigger(prefix + "setPlacement", name);
            });
            placementList.appendChild(button);
            return button;
        });

        let positionX = -1;
        let positionY = -1;
        let size = 92;
        let minimumSize = 64;
        let maximumSize = 240;
        let modifiers = 0;
        let gesture = null;
        let suppressClick = false;
        let anchored = false;
        let hudVisible = false;
        let toolbarTimer = 0;
        let toolbarButton = null;
        let toolbarSlotSize = 0;
        let menuOpen = false;
        let openChoices = null;
        let selectedStyle = styles[0];
        let mapNorthAngle = 0;
        let showNorthUp = false;
        let bounds = { x: 0, y: 0, size: 0 };

        function clamp(value, min, max) {
            return Math.min(Math.max(value, min), max);
        }

        function dimensions() {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const scale = clamp(height / 1080, 1, 2.4);
            return {
                width, height, scale,
                min: Math.min(minimumSize * scale, width, height),
                max: Math.min(maximumSize * scale, width, height)
            };
        }

        function placeMenu(view) {
            if (!menuOpen) return;
            const longest = Math.max(...hotkeys.map(label => label.length));
            const pad = 8 * view.scale;
            const width = Math.min((274 + longest * 7) * view.scale, view.width - 2 * pad);
            menu.style.width = width + "px";
            menu.style.fontSize = Math.round(14 * view.scale) + "px";
            const availableHeight = Math.max(0, (anchored ? bounds.y : view.height) - 2 * pad);
            menu.style.maxHeight = anchored ? availableHeight + "px" : "";
            if (openChoices) {
                const baseHeight = Math.max(0, menu.offsetHeight - openChoices.offsetHeight);
                const room = availableHeight - baseHeight;
                const listHeight = anchored ? room : Math.min(260 * view.scale, room);
                openChoices.style.maxHeight = Math.max(0, listHeight) + "px";
            }
            const left = clamp(bounds.x + bounds.size - width, pad, view.width - width - pad);
            menu.style.left = (left - bounds.x) + "px";
            if (anchored) {
                // Anchor through layout so opening the popup never depends on measuring its height first.
                menu.style.top = "auto";
                menu.style.bottom = (bounds.size + pad) + "px";
                return;
            }
            menu.style.bottom = "auto";
            const height = menu.offsetHeight;
            const below = bounds.y + bounds.size + pad;
            const top = below + height < view.height - pad
                ? below : Math.max(pad, bounds.y - height - pad);
            menu.style.top = (top - bounds.y) + "px";
        }

        function place(view, next) {
            bounds = next;
            root.style.left = next.x + "px";
            root.style.top = next.y + "px";
            root.style.width = next.size + "px";
            root.style.height = next.size + "px";
            sizeLabels();
            placeMenu(view);
        }

        function restoreLayout() {
            if (anchored) {
                if (hudVisible) syncToolbar();
                return;
            }
            const view = dimensions();
            const side = clamp(size * view.scale, view.min, view.max);
            const maxX = view.width - side;
            const maxY = view.height - side;
            place(view, {
                x: positionX < 0 ? Math.max(0, maxX - 26 * view.scale) : positionX * maxX,
                y: positionY < 0 ? Math.min(maxY, 100 * view.scale) : positionY * maxY,
                size: side
            });
        }

        function setLayout(x, y, diameter, min, max) {
            positionX = x;
            positionY = y;
            size = diameter;
            minimumSize = min;
            maximumSize = max;
            if (!gesture) restoreLayout();
        }

        function toolbarButtonSize(element) {
            if (!element) return 0;
            const rect = element.getBoundingClientRect();
            const side = Math.min(rect.width, rect.height);
            return side >= 12 && Math.max(rect.width, rect.height) <= side * 1.25 ? side : 0;
        }

        function syncToolbar() {
            let row = toolbarSlot.parentElement;
            if (!row || !document.body.contains(row) || !row.getBoundingClientRect().height) {
                row = Array.from(document.querySelectorAll(toolbarRowSelector))
                    .find(candidate => candidate.getBoundingClientRect().height > 0);
            }
            if (!row) {
                toolbarSlot.remove();
                root.style.display = "none";
                if (menuOpen) showMenu(false);
                return;
            }

            let side = toolbarButton && row.contains(toolbarButton) ? toolbarButtonSize(toolbarButton) : 0;
            if (!side) {
                toolbarButton = Array.from(row.querySelectorAll('button, [role="button"], [class*="button_"]'))
                    .find(element => toolbarButtonSize(element) > 0);
                side = toolbarButtonSize(toolbarButton) || row.parentElement.getBoundingClientRect().height * 0.64;
            }
            if (toolbarSlotSize !== side) {
                toolbarSlotSize = side;
                toolbarSlot.style.width = side + "px";
                toolbarSlot.style.height = side + "px";
                toolbarSlot.style.flexBasis = side + "px";
                toolbarSlot.style.marginRight = side * 0.28 + "px";
            }
            if (toolbarSlot.parentElement !== row) row.insertBefore(toolbarSlot, row.firstChild);

            // Keep the dial in the HUD layer and reserve its measured footprint in the native toolbar.
            const rect = toolbarSlot.getBoundingClientRect();
            const diameter = Math.min(rect.width, rect.height);
            const display = diameter > 0 ? "block" : "none";
            if (root.style.display !== display) root.style.display = display;
            if (diameter > 0 && (bounds.x !== rect.left || bounds.y !== rect.top || bounds.size !== diameter)) {
                place(dimensions(), { x: rect.left, y: rect.top, size: diameter });
            }
        }

        function trackToolbar() {
            window.clearInterval(toolbarTimer);
            if (!anchored || !hudVisible) {
                toolbarSlot.remove();
                root.style.display = hudVisible ? "block" : "none";
                return;
            }
            syncToolbar();
            // Native toolbars can be rebuilt or rescaled while the gameplay view stays open.
            toolbarTimer = window.setInterval(syncToolbar, 150);
        }

        function setPlacement(value) {
            const next = value === "Anchored";
            if (anchored === next) return;
            endGesture(false);
            showMenu(false);
            anchored = next;
            suppressClick = false;
            root.classList.toggle("gtpc-anchored", anchored);
            updateMarkerAppearance();
            placementValue.textContent = anchored ? "Anchored Compass" : "Hovering Compass";
            placementButtons.forEach((button, index) => button.setAttribute("aria-current", String((index === 1) === anchored)));
            trackToolbar();
            if (!anchored) restoreLayout();
            showHandles();
        }

        function showMenu(open) {
            menuOpen = open;
            menu.style.display = open ? "block" : "none";
            dial.setAttribute("aria-expanded", String(open));
            if (!open) showChoices(null);
            placeMenu(dimensions());
        }

        function showChoices(list) {
            if (list === styleList && !styleChoices[0].preview.hasAttribute("src")) {
                styleChoices.forEach(({ preview }, index) => {
                    preview.src = styleImageUrl(styles[index]);
                });
            }
            openChoices = list;
            styleList.style.display = list === styleList ? "block" : "none";
            placementList.style.display = list === placementList ? "block" : "none";
            styleToggle.setAttribute("aria-expanded", String(list === styleList));
            placementToggle.setAttribute("aria-expanded", String(list === placementList));
            placeMenu(dimensions());
        }

        function sizeLabels() {
            const fontScale = selectedStyle.id === "Wealthy" ? 0.062 : 0.08;
            northLetter.style.fontSize = Math.max(7, Math.round(bounds.size * fontScale)) + "px";
            cockpitLetter.style.fontSize = Math.max(7, Math.round(bounds.size * 0.078)) + "px";
            const degreeSize = Math.max(7, Math.round(bounds.size * 0.045)) * Math.min(1, bounds.size / 64);
            const edge = degreeSize * 1.25;
            cockpitScale.style.fontSize = degreeSize + "px";
            cockpitScale.classList.toggle("gtpc-compact-scale", bounds.size < 112);
            degreeLabels.forEach((label, index) => {
                const x = cockpitTicks[index] * bounds.size / 100;
                label.style.left = clamp(x, edge, bounds.size - edge) + "px";
            });
        }

        function placeMarker(element, [left, top, side]) {
            element.style.left = left + "%";
            element.style.top = top + "%";
            element.style.width = side + "%";
            element.style.height = side + "%";
        }

        function cockpitPosition(angle) {
            const tick = (clamp(angle, -180, 180) + 180) / 90;
            const index = Math.min(Math.floor(tick), cockpitTicks.length - 2);
            return cockpitTicks[index] + (cockpitTicks[index + 1] - cockpitTicks[index]) * (tick - index);
        }

        function orientMarkers() {
            const north = showNorthUp ? 0 : mapNorthAngle;
            const view = showNorthUp ? -mapNorthAngle : 0;
            if (selectedStyle.marker !== "cockpit") {
                needle.style.transform = "rotate(" + north + "deg)";
                northLetter.style.transform = "rotate(" + (-north) + "deg)";
                heading.style.transform = "rotate(" + view + "deg)";
                return;
            }

            const northPosition = cockpitPosition(north);
            needle.style.transform = "none";
            heading.style.transform = "none";
            needle.style.left = (northPosition - selectedStyle.box[2] / 2) + "%";
            heading.style.left = (cockpitPosition(view) - selectedStyle.headingBox[2] / 2) + "%";
            cockpitLetter.style.left = northPosition + "%";
            cockpitLetter.style.transform = northPosition < 20 ? "translateX(65%)" : "translateX(-165%)";

            const center = showNorthUp ? 0 : Math.round(-mapNorthAngle);
            degreeLabels.forEach((label, index) => {
                const degrees = (center + index * 90 - 180 + 360) % 360;
                const text = degrees + "°";
                if (label.textContent !== text) label.textContent = text;
            });
        }

        function styleImageUrl(option) {
            return artRoot + (option.file || option.id + ".png");
        }

        function updateMarkerAppearance() {
            const marker = selectedStyle.marker;
            let path = headingPaths[marker] || headingPaths.standard;
            if (anchored) {
                path = marker === "cockpit" ? headingPaths.anchoredCockpit : headingPaths.anchored;
            }
            headingArrow.setAttribute("d", path);
            const letterColor = anchored ? selectedStyle.letter : neonGreen;
            northLetter.style.color = letterColor;
            cockpitLetter.style.color = letterColor;
            const letterShadow = (anchored && selectedStyle.shadow) || "#07131f";
            northLetter.style.textShadow = "0 1px 2px " + letterShadow;
        }

        function setStyle(id) {
            selectedStyle = styles.find(option => option.id === id) || styles[0];
            const option = selectedStyle;
            const url = styleImageUrl(option);
            if (face.getAttribute("src") !== url) face.setAttribute("src", url);
            placeMarker(needle, option.box);
            placeMarker(heading, option.headingBox || option.box);
            northArrow.setAttribute("d", northPaths[option.marker || "pointer"]);
            northArrow.setAttribute("fill", option.arrow);
            northArrow.setAttribute("stroke", option.marker === "needle" ? "#321b10" : "#17171f");
            needleDetails.forEach(part => part.setAttribute("visibility", option.marker === "needle" ? "visible" : "hidden"));
            updateMarkerAppearance();
            const cockpit = option.marker === "cockpit";
            northLetter.style.display = cockpit ? "none" : "flex";
            cockpitLetter.style.display = cockpit ? "flex" : "none";
            cockpitScale.style.display = cockpit ? "block" : "none";
            styleChoices.forEach(({ button }, index) => button.setAttribute("aria-current", String(styles[index] === option)));
            styleValue.textContent = option.label;
            sizeLabels();
            orientMarkers();
            placeMenu(dimensions());
        }

        function setHotkeys(turn, restore, options) {
            [turn, restore, options].forEach((label, index) => {
                hotkeys[index] = label;
                const badge = rows[index].querySelector(".gtpc-key");
                badge.textContent = label;
                badge.style.display = label ? "block" : "none";
            });
            placeMenu(dimensions());
        }

        function showHandles() {
            root.classList.toggle("gtpc-resize", !anchored && (modifiers === 2 || Boolean(gesture && gesture.sx)));
        }

        function setState(visible, northAngle, northUp, mode, canTurn, canRestore) {
            if (hudVisible !== visible) {
                hudVisible = visible;
                trackToolbar();
            }
            if (!visible) {
                showMenu(false);
                endGesture(false);
            }
            mapNorthAngle = northAngle;
            showNorthUp = northUp;
            orientMarkers();
            rows[0].setAttribute("aria-disabled", String(!canTurn));
            rows[1].setAttribute("aria-disabled", String(!canRestore));
            modifiers = mode;
            showHandles();
        }

        function eat(event) {
            event.preventDefault();
            event.stopPropagation();
        }

        function beginGesture(event, sx, sy) {
            gesture = { x: event.clientX, y: event.clientY, start: bounds, sx, sy };
            capture.style.display = "block";
            capture.style.cursor = sx ? (sx === sy ? "nwse-resize" : "nesw-resize") : "move";
            showMenu(false);
            showHandles();
            eat(event);
        }

        function moveGesture(event) {
            if (!gesture) return;
            const view = dimensions();
            const dx = event.clientX - gesture.x;
            const dy = event.clientY - gesture.y;
            const { start, sx, sy } = gesture;
            if (!sx) {
                place(view, {
                    x: clamp(start.x + dx, 0, view.width - start.size),
                    y: clamp(start.y + dy, 0, view.height - start.size),
                    size: start.size
                });
            } else {
                const anchorX = sx < 0 ? start.x + start.size : start.x;
                const anchorY = sy < 0 ? start.y + start.size : start.y;
                const limit = Math.min(view.max,
                    sx < 0 ? anchorX : view.width - anchorX,
                    sy < 0 ? anchorY : view.height - anchorY);
                const side = clamp(start.size + (dx * sx + dy * sy) / 2, view.min, limit);
                place(view, {
                    x: sx < 0 ? anchorX - side : anchorX,
                    y: sy < 0 ? anchorY - side : anchorY,
                    size: side
                });
            }
            eat(event);
        }

        function endGesture(save) {
            if (!gesture) return;
            const start = gesture.start;
            gesture = null;
            capture.style.display = "none";
            showHandles();
            if (!save || (start.x === bounds.x && start.y === bounds.y && start.size === bounds.size)) {
                restoreLayout();
                return;
            }
            const view = dimensions();
            positionX = bounds.x / Math.max(1, view.width - bounds.size);
            positionY = bounds.y / Math.max(1, view.height - bounds.size);
            size = bounds.size / view.scale;
            engine.trigger(prefix + "saveLayout", positionX, positionY, size);
        }

        function releaseGesture(event) {
            if (!gesture || event.button !== 0) return;
            endGesture(true);
            eat(event);
        }

        function onBlur() {
            endGesture(false);
            showMenu(false);
        }

        function onResize() {
            endGesture(false);
            restoreLayout();
        }

        function outsidePress(event) {
            if (menuOpen && !root.contains(event.target)) showMenu(false);
        }

        dial.addEventListener("mousedown", event => {
            if (anchored || event.button !== 0) return;
            const ctrl = event.ctrlKey || modifiers > 0;
            const shift = event.shiftKey || modifiers === 2;
            suppressClick = ctrl;
            if (ctrl && !shift) beginGesture(event, 0, 0);
            else if (ctrl) eat(event);
        });
        dial.addEventListener("click", event => {
            if (!suppressClick && !(event.ctrlKey || modifiers > 0)) {
                if (anchored) syncToolbar();
                showMenu(!menuOpen);
            }
            suppressClick = false;
            eat(event);
        });

        handles.forEach(handle => {
            handle.addEventListener("mousedown", event => {
                if (anchored || event.button !== 0 || !(modifiers === 2 || (event.ctrlKey && event.shiftKey))) return;
                suppressClick = true;
                beginGesture(event, Number(handle.getAttribute("data-x")), Number(handle.getAttribute("data-y")));
            });
            handle.addEventListener("click", eat);
        });

        rows.forEach(row => row.addEventListener("click", event => {
            eat(event);
            if (row.getAttribute("aria-disabled") === "true") return;
            showMenu(false);
            engine.trigger(prefix + row.getAttribute("data-action"));
        }));
        styleToggle.addEventListener("click", event => {
            eat(event);
            showChoices(openChoices === styleList ? null : styleList);
        });
        placementToggle.addEventListener("click", event => {
            eat(event);
            showChoices(openChoices === placementList ? null : placementList);
        });

        document.addEventListener("mousedown", outsidePress, true);
        document.addEventListener("mousemove", moveGesture, true);
        document.addEventListener("mouseup", releaseGesture, true);
        window.addEventListener("blur", onBlur);
        window.addEventListener("resize", onResize);
        const listeners = [
            ["state", setState], ["layout", setLayout], ["hotkeys", setHotkeys], ["style", setStyle], ["placement", setPlacement]
        ].map(([name, handler]) => [name, handler, engine.on(prefix + name, handler)]);

        document.head.appendChild(style);
        document.body.appendChild(root);
        setStyle("Wealthy");
        window.gtpCompassHud = {
            dispose() {
                window.clearInterval(toolbarTimer);
                document.removeEventListener("mousedown", outsidePress, true);
                document.removeEventListener("mousemove", moveGesture, true);
                document.removeEventListener("mouseup", releaseGesture, true);
                window.removeEventListener("blur", onBlur);
                window.removeEventListener("resize", onResize);
                listeners.forEach(([name, handler, handle]) => {
                    if (handle && handle.clear) handle.clear();
                    else engine.off(prefix + name, handler);
                });
                toolbarSlot.remove();
                root.remove();
                style.remove();
                delete window.gtpCompassHud;
            }
        };
        engine.trigger(prefix + "ready");
    }

    if (document.body) install();
    else document.addEventListener("DOMContentLoaded", install, { once: true });
})();
