// ==UserScript==
// @name         Script Copy SKU, Giá và Hiển thị Option Text trên Lazada
// @namespace    http://tampermonkey.net/
// @version      2024-08-29
// @description  Click để Copy SKU, Giá, hiển thị text tùy chọn và click nút "Xem thêm" trên Lazada
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
    };
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
            return container;
        }

        container = document.createElement("div");
        container.id = OVERLAY_ID;
        container.style.position = "fixed";
        container.style.top = "16px";
        container.style.right = "16px";
        container.style.width = "320px";
        container.style.maxHeight = "70vh";
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
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="font-weight: 700;">Lazada SKU Helper</div>
                <button type="button" data-action="close-overlay" style="border: none; background: transparent; font-size: 16px; line-height: 16px; cursor: pointer; color: #757575;">×</button>
            </div>
            <div id="${OVERLAY_ID}-content" style="display: flex; flex-direction: column; gap: 6px;"></div>
        `;
        document.body.appendChild(container);

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

        const propsHtml =
            props.length > 0
                ? props
                      .map(
                          (prop) => `
                <div style="padding: 8px; border: 1px solid #f0f0f0; border-radius: 8px;">
                    <div style="font-weight: 600; margin-bottom: 4px;">${prop.name}</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                        ${prop.values
                            .map(
                                (value) =>
                                    `<span data-select-prop="${prop.index}" data-select-value="${value.index}" style="padding: 2px 6px; background: #f5f7fa; border: 1px solid #e0e0e0; border-radius: 6px; cursor: pointer; transition: background-color 0.15s ease; user-select: none;">${value.name}</span>`
                            )
                            .join("")}
                    </div>
                </div>
            `
                      )
                      .join("")
                : `<div style="color: #757575;">Chưa lấy được dữ liệu thuộc tính.</div>`;

        content.innerHTML = `
            <div style="display: flex; gap: 6px; align-items: center;">
                <span style="font-weight: 600; color: #757575; min-width: 48px;">SKU:</span>
                <span data-copy-text="${skuText}" style="cursor: pointer; color: #0d6efd; word-break: break-word;">${skuText}</span>
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
        const normalize = (str) => (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
        const propData = overlayState.properties[propIndex];
        const valueData = propData?.values?.[valueIndex];
        if (!propData || !valueData) {
            return;
        }
        const expectedName = normalize(valueData.name || "");
        const expectedId = (valueData.valueId || valueData.vid || valueData.id || "").toString();
        const propName = normalize(propData.name || "");
        const propId = (propData.propId || propData.pid || propData.id || "").toString();

        const propSelector =
            "#module_sku-select .sku-prop, #module_sku-select [class*='sku-prop'], [data-spm-anchor-id*='sku'] .sku-prop, [data-spm-anchor-id*='sku'] .sku-attribute, .sku-attribute, .sku-prop, [data-sku-prop-id], [data-prop-id], [data-pid]";
        const propElements = Array.from(document.querySelectorAll(propSelector));
        if (!propElements.length) {
            if (retry > 0) {
                setTimeout(() => selectVariantFromOverlay(propIndex, valueIndex, retry - 1), 150);
            }
            return;
        }

        const propElement =
            propElements.find((el) => {
                const dataId =
                    el.getAttribute("data-sku-prop-id") ||
                    el.getAttribute("data-prop-id") ||
                    el.getAttribute("data-pid");
                if (propId && dataId && dataId.toString() === propId) {
                    return true;
                }
                const label = el.querySelector(".sku-title, .sku-name, .sku-attr-title, .sku-prop-name, .sku-variable-name, .sku-property-name, .sku-attribute-name");
                return normalize(label?.textContent || "") === propName;
            }) || propElements[propIndex];
        if (!propElement) {
            return;
        }

        const content = propElement.querySelector(".sku-prop-content") || propElement;
        const candidates = Array.from(
            content.querySelectorAll(
                [
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
                ].join(", ")
            )
        ).filter((el) => {
            if (el === content) {
                return false;
            }
            const text = normalize(el.textContent || "");
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
            targetOption = candidates.find((el) => normalize(el.textContent || "") === expectedName) || null;
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
        setTimeout(syncSkuToOverlay, 120);
        setTimeout(syncSkuToOverlay, 350);
        setTimeout(syncSkuToOverlay, 800);
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
            node.addEventListener("click", () => setTimeout(syncSkuToOverlay, 100));
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
    };

    // Set up an interval to check and add event listeners every 1 second
    setInterval(() => {
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
