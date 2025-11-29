// ==UserScript==
// @name         Lazada SKU Helper - Copy nhanh SKU/Giá & thuộc tính
// @namespace    http://tampermonkey.net/
// @version      2025-03-09
// @description  Hiển thị SKU và thuộc tính đang chọn, copy một chạm, overlay kéo/thả, resize và nhớ vị trí/kích thước trên Lazada.
// @author       Bạn
// @match        https://www.lazada.vn/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lazada.vn
// @grant        none
// ==/UserScript==

(function () {
    "use strict";
    const DISPLAY_SKU = true;
    const COPY_BOTH_PRICE_SKU = false;
    const DISPLAY_SKU_TEXT = true;
    const DISPLAY_SEARCH_SKU = true;
    const setCustumerStyle = () => {
        const styleElement = document.createElement("style");
        styleElement.innerHTML = `
  .pdp-product-detail .height-limit {
    height: 100% !important;
  }
`;
        document.head.appendChild(styleElement);
    };
    setCustumerStyle();
    // Function to show a notification popup
    function showCopyNotification(message) {
        const notification = document.createElement("div");
        notification.textContent = message;
        notification.style.position = "fixed";
        notification.style.bottom = "40px";
        notification.style.right = "20px";
        notification.style.padding = "10px";
        notification.style.backgroundColor = "#28a745";
        notification.style.color = "#fff";
        notification.style.borderRadius = "5px";
        notification.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.1)";
        notification.style.zIndex = "1000";
        notification.style.fontSize = "14px";
        document.body.appendChild(notification);

        // Hide the notification after 2 seconds
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 2000);
    }
    const OVERLAY_ID = "lazada-sku-helper-overlay";
    const PRODUCT_PATH_REGEX = /^\/products\//;
    const overlayState = {
        sku: "",
        properties: [],
        selectedValues: [],
    };
    const OVERLAY_STORAGE_KEY = "lazada-sku-helper-overlay";
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const loadOverlayPrefs = () => {
        try {
            const raw = localStorage.getItem(OVERLAY_STORAGE_KEY);
            if (!raw) {
                return {};
            }
            const parsed = JSON.parse(raw);
            return typeof parsed === "object" && parsed ? parsed : {};
        } catch (error) {
            return {};
        }
    };
    const saveOverlayPrefs = (prefs) => {
        try {
            localStorage.setItem(OVERLAY_STORAGE_KEY, JSON.stringify(prefs || {}));
        } catch (error) {
            // ignore storage errors
        }
    };
    let overlayPrefs = loadOverlayPrefs();
    const normalizeText = (str) => (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
    const escapeAttr = (str) => (str || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const isSearchPage = () => location.pathname.includes("/catalog/") || location.search.includes("q=");
    const PROP_SELECTOR =
        "#module_sku-select .sku-prop, #module_sku-select [class*='sku-prop'], [data-spm-anchor-id*='sku'] .sku-prop, [data-spm-anchor-id*='sku'] .sku-attribute, .sku-attribute, .sku-prop, [data-sku-prop-id], [data-prop-id], [data-pid]";
    const CANDIDATE_SELECTOR = [
        "[data-sku-value-id]",
        "[data-vid]",
        "[data-value-id]",
        "[data-valueid]",
        "[data-value]",
        "[data-attr-value]",
        "[data-sku-id]",
        "[role='option']",
        "[role='radio']",
        "input[type='radio']",
        ".sku-variable-name",
        ".sku-variable-name-selected",
        ".sku-variable",
        ".sku-option-item",
        "span",
        "button",
        "li",
        "div",
        "a",
    ].join(", ");
    const findPropElement = (propData, propIndex) => {
        const propElements = Array.from(document.querySelectorAll(PROP_SELECTOR));
        if (!propElements.length) {
            return null;
        }
        const propId = (propData?.propId || propData?.pid || propData?.id || "").toString();
        const propName = normalizeText(propData?.name || "");
        const matched =
            propElements.find((el) => {
                const dataId = el.getAttribute("data-sku-prop-id") || el.getAttribute("data-prop-id") || el.getAttribute("data-pid");
                if (propId && dataId && dataId.toString() === propId) {
                    return true;
                }
                const label = el.querySelector(".sku-title, .sku-name, .sku-attr-title, .sku-prop-name, .sku-variable-name, .sku-property-name, .sku-attribute-name");
                return normalizeText(label?.textContent || "") === propName;
            }) || propElements[propIndex];
        return matched || null;
    };
    const collectCandidates = (propElement) => {
        const content = propElement?.querySelector(".sku-prop-content") || propElement;
        if (!content) {
            return [];
        }
        return Array.from(content.querySelectorAll(CANDIDATE_SELECTOR)).filter((el) => {
            if (el === content) {
                return false;
            }
            const text = normalizeText(el.textContent || "");
            const id =
                el.getAttribute("data-sku-value-id") ||
                el.getAttribute("data-vid") ||
                el.getAttribute("data-value-id") ||
                el.getAttribute("data-valueid") ||
                el.getAttribute("data-value") ||
                el.getAttribute("data-attr-value") ||
                el.getAttribute("data-sku-id");
            const isDisabled = el.closest("[aria-disabled='true'], .disabled");
            return !isDisabled && (id || text);
        });
    };
    const keepOverlayInViewport = (container) => {
        if (!container) {
            return;
        }
        const rect = container.getBoundingClientRect();
        const minGap = 8;
        const maxLeft = Math.max(minGap, window.innerWidth - rect.width - minGap);
        const maxTop = Math.max(minGap, window.innerHeight - rect.height - minGap);
        const nextLeft = clamp(rect.left, minGap, maxLeft);
        const nextTop = clamp(rect.top, minGap, maxTop);
        container.style.left = `${nextLeft}px`;
        container.style.top = `${nextTop}px`;
        container.style.right = "";
        overlayPrefs = {
            ...overlayPrefs,
            left: nextLeft,
            top: nextTop,
            width: rect.width,
            height: rect.height,
        };
        saveOverlayPrefs(overlayPrefs);
    };
    const applyOverlayPrefs = (container) => {
        const minGap = 8;
        const defaultWidth = 320;
        const minWidth = 220;
        const minHeight = 140;
        const width = Number.isFinite(overlayPrefs.width) && overlayPrefs.width > minWidth ? overlayPrefs.width : defaultWidth;
        const height = Number.isFinite(overlayPrefs.height) && overlayPrefs.height > minHeight ? overlayPrefs.height : null;
        const maxLeft = Math.max(minGap, window.innerWidth - width - minGap);
        const maxTop = Math.max(minGap, window.innerHeight - (height || container.offsetHeight || 300) - minGap);
        const left =
            Number.isFinite(overlayPrefs.left) && overlayPrefs.left >= 0
                ? clamp(overlayPrefs.left, minGap, maxLeft)
                : Math.max(minGap, window.innerWidth - width - 16);
        const top = Number.isFinite(overlayPrefs.top) && overlayPrefs.top >= 0 ? clamp(overlayPrefs.top, minGap, maxTop) : 16;
        container.style.width = `${width}px`;
        container.style.height = height ? `${height}px` : "";
        container.style.maxHeight = "calc(100vh - 32px)";
        container.style.left = `${left}px`;
        container.style.top = `${top}px`;
        container.style.right = "";
        overlayPrefs = { ...overlayPrefs, left, top, width, height };
        saveOverlayPrefs(overlayPrefs);
    };
    const setupOverlayDragResize = (container) => {
        if (!container || container.dataset.dragResizeBound === "true") {
            return;
        }
        container.dataset.dragResizeBound = "true";
        container.style.boxSizing = "border-box";
        const header = container.querySelector(".lazada-sku-helper-header");
        const resizerId = "lazada-sku-helper-resizer";
        if (header) {
            header.style.cursor = "move";
        }
        const resizer =
            container.querySelector(`#${resizerId}`) ||
            (() => {
                const el = document.createElement("div");
                el.id = resizerId;
                el.style.position = "absolute";
                el.style.width = "14px";
                el.style.height = "14px";
                el.style.right = "4px";
                el.style.bottom = "4px";
                el.style.cursor = "nwse-resize";
                el.style.borderRadius = "4px";
                el.style.background = "rgba(13, 110, 253, 0.25)";
                el.style.border = "1px solid rgba(13, 110, 253, 0.6)";
                container.appendChild(el);
                return el;
            })();

        let dragging = false;
        let resizing = false;
        let dragStart = null;

        const minWidth = 220;
        const minHeight = 140;

        const stopAll = () => {
            dragging = false;
            resizing = false;
            dragStart = null;
            document.removeEventListener("mousemove", onDrag);
            document.removeEventListener("mouseup", stopAll);
        };
        const onDrag = (event) => {
            if (!dragStart) {
                return;
            }
            if (dragging) {
                const nextLeft = clamp(dragStart.left + (event.clientX - dragStart.x), 8, window.innerWidth - container.offsetWidth - 8);
                const nextTop = clamp(dragStart.top + (event.clientY - dragStart.y), 8, window.innerHeight - container.offsetHeight - 8);
                container.style.left = `${nextLeft}px`;
                container.style.top = `${nextTop}px`;
                overlayPrefs = { ...overlayPrefs, left: nextLeft, top: nextTop };
                saveOverlayPrefs(overlayPrefs);
            } else if (resizing) {
                const nextWidth = clamp(dragStart.width + (event.clientX - dragStart.x), minWidth, window.innerWidth - container.offsetLeft - 8);
                const nextHeight = clamp(dragStart.height + (event.clientY - dragStart.y), minHeight, window.innerHeight - container.offsetTop - 8);
                container.style.width = `${nextWidth}px`;
                container.style.height = `${nextHeight}px`;
                overlayPrefs = { ...overlayPrefs, width: nextWidth, height: nextHeight };
                saveOverlayPrefs(overlayPrefs);
            }
        };
        const startDrag = (event) => {
            dragging = true;
            resizing = false;
            dragStart = {
                x: event.clientX,
                y: event.clientY,
                left: container.offsetLeft,
                top: container.offsetTop,
                width: container.offsetWidth,
                height: container.offsetHeight,
            };
            document.addEventListener("mousemove", onDrag);
            document.addEventListener("mouseup", stopAll);
            event.preventDefault();
        };
        const startResize = (event) => {
            resizing = true;
            dragging = false;
            dragStart = {
                x: event.clientX,
                y: event.clientY,
                left: container.offsetLeft,
                top: container.offsetTop,
                width: container.offsetWidth,
                height: container.offsetHeight,
            };
            document.addEventListener("mousemove", onDrag);
            document.addEventListener("mouseup", stopAll);
            event.preventDefault();
        };

        if (header) {
            header.addEventListener("mousedown", startDrag);
        }
        if (resizer) {
            resizer.addEventListener("mousedown", startResize);
        }
    };
    window.addEventListener("resize", () => {
        const container = document.getElementById(OVERLAY_ID);
        if (container) {
            keepOverlayInViewport(container);
        }
    });
    const isProductPage = () => PRODUCT_PATH_REGEX.test(location.pathname);
    let overlayInitialized = false;
    const removeOverlay = () => {
        const existing = document.getElementById(OVERLAY_ID);
        if (existing) {
            existing.remove();
        }
        overlayInitialized = false;
    };
    const ensureOverlay = () => {
        let container = document.getElementById(OVERLAY_ID);
        if (container) {
            applyOverlayPrefs(container);
            setupOverlayDragResize(container);
            return container;
        }

        container = document.createElement("div");
        container.id = OVERLAY_ID;
        container.style.position = "fixed";
        container.style.top = "16px";
        container.style.left = "16px";
        container.style.width = "320px";
        container.style.height = "";
        container.style.maxHeight = "calc(100vh - 32px)";
        container.style.overflowY = "auto";
        container.style.background = "rgba(255, 255, 255, 0.96)";
        container.style.border = "1px solid #e0e0e0";
        container.style.borderRadius = "12px";
        container.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.18)";
        container.style.padding = "12px";
        container.style.fontFamily = "Arial, sans-serif";
        container.style.fontSize = "13px";
        container.style.color = "#212121";
        container.style.zIndex = "99999";
        container.innerHTML = `
            <div class="lazada-sku-helper-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 8px;">
                <div style="font-weight: 700;">Lazada SKU Helper</div>
                <button type="button" data-action="close-overlay" style="border: none; background: transparent; font-size: 16px; line-height: 16px; cursor: pointer; color: #757575;">×</button>
            </div>
            <div id="${OVERLAY_ID}-content" style="display: flex; flex-direction: column; gap: 6px;"></div>
        `;
        document.body.appendChild(container);
        applyOverlayPrefs(container);
        setupOverlayDragResize(container);

        container.addEventListener("click", (event) => {
            const closeBtn = event.target.closest("[data-action='close-overlay']");
            if (closeBtn) {
                container.style.display = "none";
                return;
            }
            const selectTarget = event.target.closest("[data-select-prop]");
            if (selectTarget) {
                const propIndex = Number(selectTarget.getAttribute("data-select-prop"));
                const valueIndex = Number(selectTarget.getAttribute("data-select-value"));
                selectVariantFromOverlay(propIndex, valueIndex);
                return;
            }
            const copyTarget = event.target.closest("[data-copy-text]");
            if (copyTarget) {
                const text = (copyTarget.getAttribute("data-copy-text") || copyTarget.textContent || "").trim();
                if (!text) {
                    return;
                }
                navigator.clipboard
                    .writeText(text)
                    .then(() => showCopyNotification("Copied: " + text))
                    .catch((err) => console.error("Failed to copy:", err));
            }
        });

        overlayInitialized = true;
        return container;
    };
    const renderOverlay = () => {
        const container = ensureOverlay();
        const content = container.querySelector(`#${OVERLAY_ID}-content`);
        if (!content) {
            return;
        }

        const skuText = overlayState.sku || "Đang lấy SKU...";
        const props = overlayState.properties || [];
        const selectedValues = overlayState.selectedValues || [];
        const baseValueStyle =
            "padding: 2px 6px; background: #f5f7fa; border: 1px solid #e0e0e0; border-radius: 6px; cursor: pointer; transition: background-color 0.15s ease, transform 0.15s ease; user-select: none; display: inline-flex; align-items: center;";
        const selectedValueStyle =
            "background: linear-gradient(135deg, #e8f0ff, #f5faff); border-color: #0d6efd; color: #0b5ed7; font-weight: 700; box-shadow: 0 2px 6px rgba(13, 110, 253, 0.25); transform: translateY(-1px);";
        const selectedPairs = props
            .map((prop) => {
                const selIndex = selectedValues[prop.index];
                const selValue = prop.values?.[selIndex];
                if (!selValue) {
                    return null;
                }
                return `${prop.name}: ${selValue.name}`;
            })
            .filter(Boolean);
        const selectedValuesText = selectedPairs.join(" | ");
        const selectedDisplayText = selectedValuesText || "Chưa chọn thuộc tính";

        const propsHtml =
            props.length > 0
                ? props
                      .map((prop) => {
                          const valuesHtml = (prop.values || [])
                              .map((value) => {
                                  const isSelected = selectedValues[prop.index] === value.index;
                                  const valueStyle = `${baseValueStyle}${isSelected ? selectedValueStyle : ""}`;
                                  const selectedClass = isSelected ? " is-selected" : "";
                                  return `<span data-select-prop="${prop.index}" data-select-value="${value.index}" class="lazada-sku-helper-option${selectedClass}" style="${valueStyle}">${value.name}</span>`;
                              })
                              .join("");
                          return `
                <div style="padding: 8px; border: 1px solid #f0f0f0; border-radius: 8px;">
                    <div style="font-weight: 600; margin-bottom: 4px;">${prop.name}</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                        ${valuesHtml}
                    </div>
                </div>
            `;
                      })
                      .join("")
                : `<div style="color: #757575;">Chưa lấy được dữ liệu thuộc tính.</div>`;

        content.innerHTML = `
            <div style="display: flex; gap: 6px; align-items: center;">
                <span style="font-weight: 600; color: #757575; min-width: 48px;">SKU:</span>
                <span data-copy-text="${skuText}" style="cursor: pointer; color: #0d6efd; word-break: break-word;">${skuText}</span>
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
                <span style="font-weight: 600; color: #757575; min-width: 80px;">Đã chọn:</span>
                <span data-copy-text="${escapeAttr(selectedValuesText)}" style="cursor: pointer; color: #0d6efd; word-break: break-word;">${selectedDisplayText}</span>
            </div>
            <div style="font-weight: 700; margin-top: 4px;">Thuộc tính</div>
            ${propsHtml}
        `;
    };
    const updateOverlayState = (partialState) => {
        let changed = false;
        Object.keys(partialState).forEach((key) => {
            const current = overlayState[key];
            const next = partialState[key];
            if (JSON.stringify(current) !== JSON.stringify(next)) {
                overlayState[key] = next;
                changed = true;
            }
        });
        if (changed || !overlayInitialized) {
            renderOverlay();
        }
    };
    if (isProductPage()) {
        renderOverlay();
    }
    // Function to copy SKU and Price or individual elements
    function copySkuAndPrice(sku, price) {
        if (COPY_BOTH_PRICE_SKU) {
            const combinedText = `${price}\t${sku}`; // Combine SKU and price with tab character
            navigator.clipboard
                .writeText(combinedText)
                .then(() => {
                    console.log("SKU and price copied to clipboard:", combinedText);
                    showCopyNotification("Copied: " + combinedText); // Show notification
                })
                .catch((err) => console.error("Failed to copy SKU and price:", err));
        }
    }
    const findSkuText = () => {
        const specItems = document.querySelectorAll("#module_product_detail .pdp-mod-specification li");
        for (const item of specItems) {
            const title = (item.querySelector(".key-title") || item.firstElementChild)?.textContent || "";
            const normalizedTitle = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
            if (normalizedTitle === "SKU") {
                const valueEl = item.querySelector(".key-value") || item.lastElementChild;
                const valueText = valueEl ? valueEl.textContent.trim() : "";
                if (valueText) {
                    return valueText;
                }
            }
        }
        const fallback = document.querySelector("#module_product_detail > div > div > div.pdp-product-desc > div.pdp-mod-specification > div > ul > li:nth-child(2) > div");
        return fallback ? fallback.textContent.trim() : "";
    };
    const syncSkuToOverlay = () => {
        const skuText = findSkuText();
        if (skuText) {
            updateOverlayState({ sku: skuText });
        }
    };
    const selectVariantFromOverlay = (propIndex, valueIndex, retry = 6) => {
        if (!isProductPage()) {
            return;
        }
        const propData = overlayState.properties[propIndex];
        const valueData = propData?.values?.[valueIndex];
        if (!propData || !valueData) {
            return;
        }
        const expectedName = normalizeText(valueData.name || "");
        const expectedId = (valueData.valueId || valueData.vid || valueData.id || "").toString();
        const propElement = findPropElement(propData, propIndex);
        if (!propElement) {
            if (retry > 0) {
                setTimeout(() => selectVariantFromOverlay(propIndex, valueIndex, retry - 1), 150);
            }
            return;
        }

        const candidates = collectCandidates(propElement);
        if (!candidates.length) {
            if (retry > 0) {
                setTimeout(() => selectVariantFromOverlay(propIndex, valueIndex, retry - 1), 150);
            }
            return;
        }

        let targetOption =
            candidates.find((el) => {
                const id =
                    el.getAttribute("data-sku-value-id") ||
                    el.getAttribute("data-vid") ||
                    el.getAttribute("data-value-id") ||
                    el.getAttribute("data-valueid") ||
                    el.getAttribute("data-value") ||
                    el.getAttribute("data-attr-value") ||
                    el.getAttribute("data-sku-id");
                return expectedId && id && id.toString() === expectedId;
            }) || null;

        if (!targetOption && expectedName) {
            targetOption = candidates.find((el) => normalizeText(el.textContent || "") === expectedName) || null;
        }
        if (!targetOption && candidates[valueIndex]) {
            targetOption = candidates[valueIndex];
        }

        if (!targetOption) {
            if (retry > 0) {
                setTimeout(() => selectVariantFromOverlay(propIndex, valueIndex, retry - 1), 150);
            }
            return;
        }

        const clickTarget =
            targetOption.closest(
                "[data-sku-value-id], [data-vid], [data-value-id], [data-valueid], [data-value], [data-attr-value], [data-sku-id], span, button, li, div, a, label"
            ) || targetOption;
        const radio = clickTarget.matches("input[type='radio']") ? clickTarget : clickTarget.querySelector("input[type='radio']");
        ["pointerdown", "mousedown", "mouseup", "click"].forEach((type) => {
            clickTarget.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
        });
        if (radio) {
            radio.checked = true;
            radio.dispatchEvent(new Event("change", { bubbles: true }));
        }
        syncSkuToOverlay();
        syncSelectedValuesToOverlay();
        setTimeout(syncSkuToOverlay, 120);
        setTimeout(syncSkuToOverlay, 350);
        setTimeout(syncSkuToOverlay, 800);
        setTimeout(syncSelectedValuesToOverlay, 120);
        setTimeout(syncSelectedValuesToOverlay, 350);
        setTimeout(syncSelectedValuesToOverlay, 800);
    };
    const getSelectedValueIndex = (propData, propIndex) => {
        const propElement = findPropElement(propData, propIndex);
        if (!propElement) {
            return null;
        }
        const candidates = collectCandidates(propElement);
        if (!candidates.length) {
            return null;
        }
        const isSelectedCandidate = (el) => {
            if (el.getAttribute("aria-checked") === "true" || el.getAttribute("aria-selected") === "true") {
                return true;
            }
            const className = el.className || "";
            if (
                /\bselected\b/i.test(className) ||
                /\bactive\b/i.test(className) ||
                /\bchecked\b/i.test(className) ||
                /\bsku-variable-name-selected\b/i.test(className) ||
                /\bsku-option-item-selected\b/i.test(className)
            ) {
                return true;
            }
            const radio = el.matches("input[type='radio']") ? el : el.querySelector("input[type='radio']");
            return !!(radio && radio.checked);
        };
        const selectedCandidate = candidates.find((el) => isSelectedCandidate(el)) || null;
        if (!selectedCandidate) {
            return null;
        }
        const selectedId =
            selectedCandidate.getAttribute("data-sku-value-id") ||
            selectedCandidate.getAttribute("data-vid") ||
            selectedCandidate.getAttribute("data-value-id") ||
            selectedCandidate.getAttribute("data-valueid") ||
            selectedCandidate.getAttribute("data-value") ||
            selectedCandidate.getAttribute("data-attr-value") ||
            selectedCandidate.getAttribute("data-sku-id");
        const selectedIdText = selectedId ? selectedId.toString() : "";
        const selectedName = normalizeText(selectedCandidate.textContent || "");
        const values = propData.values || [];
        const idIndex = values.findIndex((value) => {
            const vid = (value.valueId || value.vid || value.id || value.valueid || value.value_id || "").toString();
            return vid && selectedIdText && vid === selectedIdText;
        });
        if (idIndex >= 0) {
            return idIndex;
        }
        if (selectedName) {
            const nameIndex = values.findIndex((value) => normalizeText(value.name || "") === selectedName);
            if (nameIndex >= 0) {
                return nameIndex;
            }
        }
        return null;
    };
    const syncSelectedValuesToOverlay = () => {
        if (!isProductPage()) {
            return;
        }
        const props = overlayState.properties || [];
        if (!props.length) {
            return;
        }
        const selectedIndexes = props.map((prop, index) => getSelectedValueIndex(prop, index));
        updateOverlayState({ selectedValues: selectedIndexes });
    };
    const displaySearchSKU = () => {
        if (!DISPLAY_SEARCH_SKU || !isSearchPage()) {
            return;
        }
        const cards = document.querySelectorAll(
            [
                "[data-tracking='product-card']",
                "[data-qa-locator='product-item']",
                "div[data-sku-simple]",
                "li[data-sku-simple]",
            ].join(", ")
        );
        cards.forEach((card) => {
            if (card.dataset.skuBadgeAdded) {
                return;
            }
            const sku =
                card.getAttribute("data-sku-simple") ||
                card.getAttribute("data-sku") ||
                card.dataset.skuSimple ||
                card.dataset.sku;
            if (!sku) {
                return;
            }
            const badge = document.createElement("div");
            badge.textContent = sku;
            badge.style.cursor = "pointer";
            badge.style.color = "#0b5ed7";
            badge.style.fontSize = "12px";
            badge.style.fontWeight = "600";
            badge.style.marginTop = "4px";
            badge.style.userSelect = "none";
            badge.addEventListener("click", () => {
                navigator.clipboard
                    .writeText(sku)
                    .then(() => showCopyNotification("SKU copied: " + sku))
                    .catch((err) => console.error("Failed to copy SKU:", err));
            });

            const targetElement =
                card.querySelector(".RfADt") ||
                card.querySelector(".Bm3ON") ||
                card.querySelector("[data-qa-locator='product-item']") ||
                card.firstElementChild;
            if (targetElement) {
                targetElement.insertAdjacentElement("afterend", badge);
                card.dataset.skuBadgeAdded = "true";
            }
        });
    };
    const displaySKU = () => {
        if (!isProductPage()) {
            return;
        }
        // Add event listeners to elements with the class 'key-value' for copying text
        document.querySelectorAll('.key-value').forEach((element) => {
            if (!element.dataset.eventAdded) {
                console.log('Add event click');
                element.addEventListener('click', function () {
                    const textContent = this.textContent;
                    navigator.clipboard
                        .writeText(textContent)
                        .then(() => {
                            console.log('Text copied to clipboard:', textContent);
                            showCopyNotification('SKU copied: ' + textContent); // Show notification
                        })
                        .catch((err) => console.error('Failed to copy text:', err));
                });
                element.dataset.eventAdded = 'true'; // Mark that event is added
            }
        });

        // In search page
        // Add SKU divs after elements with class 'RfADt' and enable copying the SKU text
        document.querySelectorAll('[data-tracking="product-card"]').forEach((e) => {
            const sku = e.getAttribute('data-sku-simple');
            if (sku) {
                const targetElement = e.querySelector('.RfADt');
                if (targetElement && !targetElement.dataset.skuDivAdded) {
                    console.log('Add SKU div');
                    // Check if the div was already added
                    const newDiv = document.createElement('div');
                    newDiv.textContent = sku;
                    newDiv.style.cursor = 'pointer'; // Add pointer cursor for clarity

                    // Add event listener to copy SKU text on click
                    newDiv.addEventListener('click', function () {
                        navigator.clipboard
                            .writeText(sku)
                            .then(() => {
                                console.log('SKU copied to clipboard:', sku);
                                showCopyNotification('SKU copied: ' + sku); // Show notification
                            })
                            .catch((err) => console.error('Failed to copy SKU:', err));
                    });

                    targetElement.insertAdjacentElement('afterend', newDiv);
                    targetElement.dataset.skuDivAdded = 'true'; // Mark that SKU div is added
                }
            }
        });

        // // Check and click the "Show More" button if it exists
        const showMoreButton = document.querySelector('#module_product_detail > div > div > div.expand-button.expand-cursor > button');
        if (showMoreButton) {
            const normalizedText = showMoreButton.textContent.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
            if (normalizedText === 'XEM THEM') {
                showMoreButton.click();
                console.log('Show More button clicked');
            }
        }
        syncSkuToOverlay();
        document.querySelectorAll("#module_sku-select .sku-prop-content").forEach((node) => {
            if (node.dataset.skuSyncAdded) {
                return;
            }
            node.addEventListener("click", () => {
                setTimeout(syncSkuToOverlay, 100);
                setTimeout(syncSelectedValuesToOverlay, 140);
            });
            node.dataset.skuSyncAdded = "true";
        });

        // Add Function Copy Price on click
        const priceElement = document.querySelector('#module_product_price_1 > div > div > span');
        if (priceElement && !priceElement.dataset.eventAdded) {
            console.log('Add event listener to price element');
            priceElement.addEventListener('click', function () {
                // Clean up price text: remove any periods, currency symbols, or extra spaces
                const priceText = this.textContent.replace(/[₫.,\s]/g, '').trim();
                if (COPY_BOTH_PRICE_SKU) {
                    const skuElement = document.querySelector('#module_product_detail > div > div > div.pdp-product-desc > div.pdp-mod-specification > div > ul > li:nth-child(2) > div');
                    const skuText = skuElement ? skuElement.textContent.trim() : 'N/A';
                    copySkuAndPrice(skuText, priceText);
                } else {
                    navigator.clipboard
                        .writeText(priceText)
                        .then(() => {
                            console.log('Price copied to clipboard:', priceText);
                            showCopyNotification('Price copied: ' + priceText); // Show notification
                        })
                        .catch((err) => console.error('Failed to copy price:', err));
                }
            });
            priceElement.dataset.eventAdded = 'true'; // Mark that event is added to avoid duplication
        }
    };

    const SKU_PROPS = [];
    const displaySKUText = () => {
        if (!isProductPage()) {
            return;
        }
        const jsonParse = (str) => {
            try {
                return JSON.parse(str);
            } catch (error) {
                return null;
            }
        };
        const getLazadaData = () => {
            if (SKU_PROPS.length > 0) {
                return SKU_PROPS;
            }
            const text = Array.from(document.querySelectorAll('script'))
                .filter((s) => s.textContent.includes('var __moduleData__'))
                .map((s) => s.textContent)
                .join("\\n");
            const regex = /var\s+__moduleData__\s*=\s*([.\s\S]*?)\s*var\s+__googleBot__\s*=\s*""\s*;/;
            const match = text.match(regex);
            if (match) {
                let extractedData = match[1].trim();
                if (extractedData.endsWith(';')) {
                    extractedData = extractedData.slice(0, -1);
                }
                const Vmodule = jsonParse(extractedData);
                if (
                    Vmodule &&
                    Vmodule.data &&
                    Vmodule.data.root &&
                    Vmodule.data.root.fields &&
                    Vmodule.data.root.fields.productOption &&
                    Vmodule.data.root.fields.productOption.skuBase &&
                    Array.isArray(Vmodule.data.root.fields.productOption.skuBase.properties)
                ) {
                    Vmodule.data.root.fields.productOption.skuBase.properties.forEach((property) => {
                        SKU_PROPS.push(property);
                    });
                }
            }
            return SKU_PROPS;
        };
        const props = getLazadaData();
        if (props.length === 0) {
            return;
        }
        const overlayProps = props.map((prop, propIndex) => ({
            name: prop.name,
            index: propIndex,
            propId: prop.pid || prop.propertyId || prop.pId || prop.id,
            values: (prop.values || []).map((value, valueIndex) => ({
                name: value.name,
                index: valueIndex,
                valueId: value.valueId || value.vid || value.id || value.valueid || value.value_id,
            })),
        }));
        updateOverlayState({ properties: overlayProps });
        syncSelectedValuesToOverlay();
    };

    // Set up an interval to check and add event listeners every 1 second
    setInterval(() => {
        displaySearchSKU();
        if (!isProductPage()) {
            removeOverlay();
            return;
        }
        if (!overlayInitialized) {
            renderOverlay();
        }
        if (DISPLAY_SKU) {
            displaySKU();
        }
        if (DISPLAY_SKU_TEXT) {
            displaySKUText();
        }
        syncSelectedValuesToOverlay();
    }, 1000);

    function scrollToElementAndBack() {
        const element = document.querySelector("#block-ZespOm9B6x9");
        if (!element) {
            setTimeout(scrollToElementAndBack, 1000);
            return;
        }

        const originalPosition = window.scrollY; // Lưu vị trí hiện tại

        // Cuộn đến phần tử
        element.scrollIntoView({ block: "center" });

        // Quay về vị trí cũ sau 0.5s
        setTimeout(() => {
            window.scrollTo({ top: originalPosition });
        }, 500);
    }
    scrollToElementAndBack();
})();
