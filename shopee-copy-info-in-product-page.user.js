// ==UserScript==
// @name         Shopee Product Info Copier & Search Enhancer (In Product Page)
// @namespace    http://tampermonkey.net/
// @version      2025-02-25.02
// @description  Enhances Shopee's search functionality by auto-submitting the search form on paste and allowing users to copy product links and prices with a click. Includes notifications upon successful copy and ensures efficient handling of dynamic elements.
// @author       You
// @match        https://vn.xiapibuy.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=shopee.vn
// @grant        none
// @run-at       document-idle
// @grant        unsafeWindow
// ==/UserScript==

(function () {
    "use strict";
    console.log("Product Info Copier & Search Enhancer (In Product Page) loaded");

    const CHECK_INTERVAL = 1000;
    const NOTIFICATION_DURATION = 2000;

    function createGUINotification() {
        const existNotification = document.getElementById("vnotification");
        if (existNotification) return existNotification;

        const notification = document.createElement("div");
        notification.id = "vnotification";
        notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; background-color: #FE5621;
        color: #FEFDFD; padding: 10px 20px; border-radius: 5px;
        font-family: Arial, sans-serif; font-size: 14px; z-index: 9999;
        display: none; box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
        notification.textContent = "Đã sao chép thành công!";
        document.body.appendChild(notification);
        return notification;
    }
    function showNotification() {
        const notification = createGUINotification();
        setTimeout(() => (notification.style.display = "none"), NOTIFICATION_DURATION);
    }
    function convertPrice(stringPrice) {
        return stringPrice.replace("₫", "").replace(/\./g, "") * 1;
    }

    function _calculationDiscounts(link, price, discounts) {
        console.log("discounts", discounts);
        const discounts_amount = discounts.map((d) => {
            return Math.abs(convertPrice(d?.discountAmount));
        });
        const discounts_sum = discounts_amount.reduce((a, b) => a + b, 0);
        const content = `${link}\t${price}\t${discounts_sum}`;
        return content;
    }
    function handleProduct() {
        const product = document.querySelector("section.YTDXQ0");
        console.log(product);
        if ((product && product.getAttribute("data-event-set")) || !product) {
            return false;
        }
        console.log("handleProduct");
        const linkElement = location.href;
        const priceElement = product.querySelector("div > div:nth-child(3) > div > section > div > div.IZPeQz.B67UQ0");

        if (!linkElement || !priceElement) return false;
        console.log(linkElement, priceElement);
        priceElement.style.textDecoration = "underline";
        const eventClick = (event) => {
            event.preventDefault();
            const link = location.href;
            const price = priceElement.textContent.trim().replace("₫", "");

            // const discounts = findNodesByKey(document.querySelector(".ZA5sW5"), ["otherDiscounts"])?.otherDiscounts;
            // const discounts = getDiscounts();
            const discounts = getDiscounts_2();
            console.log("discounts", discounts);
            const content = discounts ? _calculationDiscounts(link, price, discounts) : `${link}\t${price}`;
            navigator.clipboard
                .writeText(content)
                .then(() => {
                    console.log("Copied to clipboard:", content);
                    showNotification();
                })
                .catch((err) => console.error("Failed to copy:", err));
        };

        priceElement.addEventListener("click", eventClick);
        product.setAttribute("data-event-set", "true");
        product.linkElement = linkElement;
        product.priceElement = priceElement;
        return true;
    }

    const getDiscounts_2 = () => {
        function _findNodeQuick(obj, keyToFind) {
            const jsonString = JSON.stringify(obj);

            // Kiểm tra nhanh nếu chuỗi key tồn tại
            if (!jsonString.includes(`"${keyToFind}"`)) {
                return null; // Không tồn tại key cần tìm
            }

            // Nếu tồn tại, duyệt qua object để tìm node
            function search(obj) {
                if (typeof obj !== "object" || obj === null) return null;

                if (obj.hasOwnProperty(keyToFind)) {
                    return obj[keyToFind];
                }

                for (const key in obj) {
                    const result = search(obj[key]);
                    if (result) return result;
                }

                return null;
            }

            return search(obj);
        }
        function _safeStringify(obj) {
            const seen = new WeakSet();
            return JSON.stringify(obj, (key, value) => {
                // Bỏ qua những đối tượng không thể truy cập (window hoặc iframe)
                if (typeof value === "object" && value !== null) {
                    if (seen.has(value)) {
                        return undefined; // Loại bỏ key gây lỗi
                    }
                    seen.add(value);

                    // Loại bỏ các thuộc tính không cần thiết nếu là window hoặc iframe
                    if (value instanceof Window) {
                        return undefined;
                    }
                }
                return value; // Giữ lại các giá trị hợp lệ
            });
        }

        const elem = document.querySelector(".ZA5sW5");
        const strJson = _safeStringify(elem);
        return _findNodeQuick(JSON.parse(strJson), "otherDiscounts");
    };

    const processPasteToSearch = () => {
        // Query the input element specifically within the Shopee Search Bar
        const input = document.querySelector(".shopee-searchbar-input__input");
        const form = document.querySelector(".shopee-searchbar");

        // Ensure both elements exist
        if (input && form) {
            if (input.getAttribute("data-event-set")) return;

            input.setAttribute("data-event-set", "true");
            // Add an event listener for the 'paste' event
            input.addEventListener("paste", function () {
                // Use a small delay to allow the pasted value to be added to the input
                setTimeout(function () {
                    if (input.value.trim() !== "") {
                        form.querySelector(".shopee-searchbar__search-button")?.click();
                    }
                }, 0);
            });
            input.timeoutId = null;
            // Add an event listener for the 'input' event
            input.addEventListener("input", function () {
                // Clear any existing timeout to prevent multiple triggers
                clearTimeout(input.timeoutId);

                // Set a new timeout to delay the search action
                input.timeoutId = setTimeout(function () {
                    if (input.value.trim() !== "") {
                        form.querySelector(".shopee-searchbar__search-button")?.click();
                    }
                }, 1500); // Delay for 1 second
            });
        }
    };

    const start = () => {
        try {
            handleProduct();
            processPasteToSearch();
        } catch (e) {
            console.log(e);
        }
        setTimeout(start, CHECK_INTERVAL);
    };
    start();
})();
