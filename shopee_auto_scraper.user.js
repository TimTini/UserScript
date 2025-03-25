// ==UserScript==
// @name         Shopee Discount Extractor
// @namespace    http://tampermonkey.net/
// @version      2025-03-25
// @description  Tự động quét và trích xuất thông tin giảm giá trên Shopee, sau đó gửi dữ liệu về trang gốc mở nó.
// @author       You
// @match        https://vn.xiapibuy.com/*
// @match        https://shopee.vn/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=shopee.vn
// @grant        none
// @run-at       document-idle
// @grant        unsafeWindow
// ==/UserScript==

(function () {
    "use strict"; // Enable strict mode

    const KEY_PRODUCT = "tide"; // Key to check in the URL query
    const CHECK_INTERVAL = 1000; // Interval for checking in milliseconds

    // Constants for query selectors
    const PRODUCT_SECTION_SELECTOR = "section.YTDXQ0";
    const PRICE_ELEMENT_SELECTOR = "div > div:nth-child(3) > div > section > div > div.IZPeQz.B67UQ0";
    const DISCOUNT_ELEMENT_SELECTOR = ".ZA5sW5";
    // document.querySelector("#sll2-normal-pdp-main > div > div > div > div > div")
    const PROCUCT_NOTFOUND_SELECTOR = "[role='main'] > .product-not-exist__content > .product-not-exist__text";

    // Class to handle URL query parameters
    class VRL {
        constructor(url) {
            this.url = new URL(url); // Initialize URL object
        }
        setparam(key, value) {
            this.url.searchParams.set(key, value); // Set or update a query parameter
        }
        getparam(key) {
            return this.url.searchParams.get(key); // Get the value of a query parameter
        }
    }

    // Function to check if the URL contains the required key
    const Check_Request = () => {
        const url = new VRL(window.location.href);
        return !!url.getparam(KEY_PRODUCT);
    };

    if (!Check_Request()) return; // Exit if the key is not present

    console.log("Script Started", "Shopee Discount Extractor"); // Log script start

    // Function to send a message to the opener window
    const SendMessage = (data) => {
        window.opener.postMessage({ text: data, url_tide: location.href }, "https://example.com"); // Post message to example.com
        console.log("Sent message to example.com:", data); // Log the sent message
    };

    // Function to extract discounts from the page
    const getDiscounts = () => {
        function _findNodeQuick(obj, keyToFind) {
            const jsonString = JSON.stringify(obj);
            if (!jsonString.includes(`"${keyToFind}"`)) return null; // Key not found

            function search(obj) {
                if (typeof obj !== "object" || obj === null) return null;
                if (obj.hasOwnProperty(keyToFind)) return obj[keyToFind];

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
                if (typeof value === "object" && value !== null) {
                    if (seen.has(value)) return undefined;
                    seen.add(value);
                    if (value instanceof Window) return undefined;
                }
                return value;
            });
        }

        const elem = document.querySelector(DISCOUNT_ELEMENT_SELECTOR); // Find the target element
        if (!elem) return null;

        const strJson = _safeStringify(elem);
        return _findNodeQuick(JSON.parse(strJson), "otherDiscounts");
    };
    function convertPrice(stringPrice) {
        return stringPrice.replace("₫", "").replace(/\./g, "") * 1;
    }
    // Function to calculate the total discount amount
    function _calculationDiscounts(link, price, discounts) {
        console.log("discounts", discounts); // Log discounts
        const discounts_amount = discounts.map((d) => Math.abs(convertPrice(d?.discountAmount) || 0));
        const discounts_sum = discounts_amount.reduce((a, b) => a + b, 0);
        return `${link}\t${price}\t${discounts_sum}`;
    }

    // Function to get the product price and discounts
    const GetPrice = () => {
        const product = document.querySelector(PRODUCT_SECTION_SELECTOR);
        const is_notfound = document.querySelector(PROCUCT_NOTFOUND_SELECTOR);
        const link = location.href;
        if (is_notfound) {
            return `${link}\tNA\tNA\tNon exist`;
        }
        if (!product) return false;
        // if (!product.getAttribute("data-event-set")) return false;
        const priceElement = product.querySelector(PRICE_ELEMENT_SELECTOR);
        if (!link || !priceElement) return false;
        const price = priceElement.textContent.trim().replace("₫", "");
        const discounts = getDiscounts();
        return discounts ? _calculationDiscounts(link, price, discounts) : `${link}\t${price}`;
    };

    // Main function to execute the logic
    const main = () => {
        try {
            const content = GetPrice();
            if (content) {
                SendMessage(content);
                console.log("Sent message to example.com:", content);
            }
        } catch (err) {}
        // Run the main function at the specified interval
        setTimeout(main, CHECK_INTERVAL);
    };
    main();
})();
