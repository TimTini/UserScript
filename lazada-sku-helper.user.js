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
    const displaySKU = () => {
        // Add event listeners to elements with the class 'key-value' for copying text
        document.querySelectorAll(".key-value").forEach((element) => {
            if (!element.dataset.eventAdded) {
                console.log("Add event click");
                element.addEventListener("click", function () {
                    const textContent = this.textContent;
                    navigator.clipboard
                        .writeText(textContent)
                        .then(() => {
                            console.log("Text copied to clipboard:", textContent);
                            showCopyNotification("SKU copied: " + textContent); // Show notification
                        })
                        .catch((err) => console.error("Failed to copy text:", err));
                });
                element.dataset.eventAdded = "true"; // Mark that event is added
            }
        });

        // In search page
        // Add SKU divs after elements with class 'RfADt' and enable copying the SKU text
        document.querySelectorAll('[data-tracking="product-card"]').forEach((e) => {
            let sku = e.getAttribute("data-sku-simple");
            if (sku) {
                const targetElement = e.querySelector(".RfADt");
                if (targetElement && !targetElement.dataset.skuDivAdded) {
                    console.log("Add SKU div");
                    // Check if the div was already added
                    const newDiv = document.createElement("div");
                    newDiv.textContent = sku;
                    newDiv.style.cursor = "pointer"; // Add pointer cursor for clarity

                    // Add event listener to copy SKU text on click
                    newDiv.addEventListener("click", function () {
                        navigator.clipboard
                            .writeText(sku)
                            .then(() => {
                                console.log("SKU copied to clipboard:", sku);
                                showCopyNotification("SKU copied: " + sku); // Show notification
                            })
                            .catch((err) => console.error("Failed to copy SKU:", err));
                    });

                    targetElement.insertAdjacentElement("afterend", newDiv);
                    targetElement.dataset.skuDivAdded = "true"; // Mark that SKU div is added
                }
            }
        });

        // // Check and click the "Show More" button if it exists
        const showMoreButton = document.querySelector("#module_product_detail > div > div > div.expand-button.expand-cursor > button");
        if (showMoreButton && showMoreButton.textContent.trim() === "XEM THÊM") {
            showMoreButton.click();
            console.log("Show More button clicked");
        }

        // Add the SKU section as a child to the parent element
        const parentElement = document.querySelector("#module_sku-select > div");
        const childHTML = `
            <div style="padding-top: 25px;">
                <div>
                    <h6 style="display: inline-block; margin: 0; width: 92px; color: #757575; word-wrap: break-word; font-size: 14px; font-weight: 400; vertical-align: top; line-height: 18px;">SKU</h6>
                    <div style="display: inline-block;">
                        <div class="sku-prop-content-header">
                            <span class="sku-sync-value"></span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Thêm phần tử con vào cuối phần tử cha
        if (parentElement && !parentElement.dataset.childAdded) {
            console.log("Add child");
            parentElement.insertAdjacentHTML("beforeend", childHTML);
            console.log("Child HTML added");
            parentElement.dataset.childAdded = "true"; // Đánh dấu đã thêm child để tránh thêm nhiều lần
        }

        // Sync content from li:nth-child(2) to .sku-prop-content-header span
        const sourceElement = document.querySelector("#module_product_detail > div > div > div.pdp-product-desc > div.pdp-mod-specification > div > ul > li:nth-child(2) > div");
        const skuSyncElement = document.querySelector(".sku-prop-content-header .sku-sync-value");
        // process sync
        if (sourceElement && skuSyncElement && !skuSyncElement.dataset.synced) {
            console.log("Sync span");
            // Sync initial content
            skuSyncElement.textContent = sourceElement.textContent.trim();

            // Set up a MutationObserver to observe changes in li content
            const observer = new MutationObserver(() => {
                const newText = sourceElement.textContent.trim();
                skuSyncElement.textContent = newText;
                console.log("Span updated with new content:", newText);
            });

            observer.observe(sourceElement, { childList: true, subtree: true, characterData: true });

            // Mark that sync is set up
            skuSyncElement.dataset.synced = "true";
        }
        // Add Function Copy SKU Sync on click
        if (skuSyncElement && !skuSyncElement.dataset.eventAdded) {
            if (!skuSyncElement.dataset.eventAdded) {
                console.log("Add event click");
                skuSyncElement.addEventListener("click", function () {
                    const skuText = this.textContent;
                    if (COPY_BOTH_PRICE_SKU) {
                        // If both SKU and price need to be copied, find the price element
                        const priceElement = document.querySelector("#module_product_price_1 > div > div > span");
                        const priceText = priceElement ? priceElement.textContent.replace(/[₫.,\s]/g, "").trim() : "N/A";
                        copySkuAndPrice(skuText, priceText);
                    } else {
                        navigator.clipboard
                            .writeText(skuText)
                            .then(() => {
                                console.log("SKU text copied to clipboard:", skuText);
                                showCopyNotification("SKU copied: " + skuText); // Show notification
                            })
                            .catch((err) => console.error("Failed to copy SKU text:", err));
                    }
                });
                skuSyncElement.dataset.eventAdded = "true"; // Mark that event is added
            }
        }

        // Add Function Copy Price on click
        const priceElement = document.querySelector("#module_product_price_1 > div > div > span");
        if (priceElement && !priceElement.dataset.eventAdded) {
            console.log("Add event listener to price element");
            priceElement.addEventListener("click", function () {
                // Clean up price text: remove any periods, currency symbols, or extra spaces
                const priceText = this.textContent.replace(/[₫.,\s]/g, "").trim();
                if (COPY_BOTH_PRICE_SKU) {
                    const skuElement = document.querySelector("#module_product_detail > div > div > div.pdp-product-desc > div.pdp-mod-specification > div > ul > li:nth-child(2) > div");
                    const skuText = skuElement ? skuElement.textContent.trim() : "N/A";
                    copySkuAndPrice(skuText, priceText);
                } else {
                    navigator.clipboard
                        .writeText(priceText)
                        .then(() => {
                            console.log("Price copied to clipboard:", priceText);
                            showCopyNotification("Price copied: " + priceText); // Show notification
                        })
                        .catch((err) => console.error("Failed to copy price:", err));
                }
            });
            priceElement.dataset.eventAdded = "true"; // Mark that event is added to avoid duplication
        }
    };

    const SKU_PROPS = [];
    const displaySKUText = () => {
        const updateStyles = () => {
            const elements = document.querySelectorAll("#module_sku-select > div > div.sku-prop > div > div > div.sku-prop-content > span > div");
            elements.forEach((element) => {
                // Check if the element already has the 'data-style-updated' attribute
                if (!element.hasAttribute("data-style-updated")) {
                    if (element.querySelector("img")) {
                        // Apply styles if they haven't been applied yet
                        element.style.display = "inline-flex";
                        element.style.alignItems = "center";
                        element.style.justifyContent = "center";
                        element.style.paddingRight = "8px";
                        element.style.fontSize = "12px";
                        element.style.color = "#212121";
                        // Set the parent element's width to 'fit-content'
                        element.parentElement.style.width = "fit-content";
                    }
                    // Set a custom attribute to mark this element as styled
                    element.setAttribute("data-style-updated", "true");
                }
            });
        };
        const createSKUTextElement = (text) => {
            // Create a new span element
            const spanElement = document.createElement("span");

            // Set the styles for the span element
            spanElement.style.width = "100%";
            spanElement.style.textAlign = "center";
            spanElement.style.whiteSpace = "nowrap";
            spanElement.style.display = "inline-flex";
            spanElement.style.justifyContent = "center";
            spanElement.style.alignItems = "center";
            spanElement.style.paddingLeft = "8px";
            // Set the text inside the span element
            spanElement.textContent = text;

            // Return the created element
            return spanElement;
        };
        const jsonParse = (str) => {
            try {
                return JSON.parse(str);
            } catch (error) {
                return null;
            }
        };
        const getLazadaData = () => {
            if (SKU_PROPS.length > 0) {
                return;
            }
            const text = Array.from(document.querySelectorAll("script"))
                .filter((s) => s.textContent.includes("var __moduleData__"))
                .map((s) => s.textContent)
                .join("\n");
            const regex = /var\s+__moduleData__\s*=\s*([.\s\S]*?)\s*var\s+__googleBot__\s*=\s*""\s*;/;
            const match = text.match(regex);
            if (match) {
                let extractedData = match[1].trim();
                // Remove the last semicolon
                if (extractedData.endsWith(";")) {
                    extractedData = extractedData.slice(0, -1);
                }
                // Convert to JSON
                const Vmodule = jsonParse(extractedData);
                const properties = Vmodule.data.root.fields.productOption.skuBase.properties;
                properties.forEach((property) => {
                    SKU_PROPS.push(property);
                });
            }
        };

        const getSkuText = () => {
            // const elements = document.querySelectorAll("#module_sku-select > div > div.sku-prop > div > div > div.sku-prop-content > span > div");
            const propElements = document.querySelectorAll("#module_sku-select > div > div.sku-prop");
            propElements.forEach((propElement, prop_index) => {
                const handleElements = propElement.querySelectorAll("div > div > div.sku-prop-content > span > div");
                const propsData = SKU_PROPS[prop_index];
                handleElements.forEach((handleElement, index) => {
                    // Check if the SKU text has already been added
                    if (!handleElement.hasAttribute("data-sku-text-added")) {
                        const propData = propsData.values[index];
                        const skuName = propData.name;
                        const skuTextElement = createSKUTextElement(skuName);
                        handleElement.appendChild(skuTextElement);

                        // Set a custom attribute to mark that the SKU text has been added
                        handleElement.setAttribute("data-sku-text-added", "true");
                    }
                });
            });
        };
        getLazadaData();
        if (SKU_PROPS.length == 0) {
            return;
        }
        updateStyles();
        getSkuText();
    };
    // Set up an interval to check and add event listeners every 1 second
    setInterval(() => {
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
