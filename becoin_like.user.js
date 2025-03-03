// ==UserScript==
// @name         Beincom Auto-Clicker Like Button
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Automates liking posts on group.beincom.com
// @author       You
// @match        https://group.beincom.com/*
// @match        https://group.beincom.com/article/*
// @icon         none
// @grant        none
// ==/UserScript==

(function () {
    "use strict";
    
    const TARGET_BUTTON_TEXT = ["THÍCH", "LIKE"];

    setInterval(() => {
        try {
            // Lấy danh sách các section chứa nút "Like"
            const sections = document.querySelectorAll("section div.flex.w-full.items-center");

            sections.forEach((section) => {
                const buttons = section.querySelectorAll("button");
                
                if (buttons.length >= 3) {
                    const firstButton = buttons[0];
                    
                    if (firstButton.textContent && TARGET_BUTTON_TEXT.includes(firstButton.textContent.trim().toUpperCase())) {
                        firstButton.click();
                        console.log(`Clicked button with text "${firstButton.textContent.trim()}"`);
                    }
                }
            });

            // Click tất cả button không có class "text-purple-50"
            document.querySelectorAll(
                "#main-container > div > section > div.rounded-lg.bg-white > div:nth-child(3) > section.p-4 > div > div.flex.w-full.flex-col > div.flex.h-8.items-center.p-1 > div.flex.items-center.space-x-2 > div > button:not(.text-purple-50)"
            ).forEach((e) => {
                const text = e.textContent?.trim().toUpperCase();
                if (text && TARGET_BUTTON_TEXT.includes(text)) {
                    e.click();
                    console.log(`Clicked button with text "${text}"`);
                }
            });

        } catch (error) {
            console.error(`Error occurred: ${error.message}`);
        }
    }, 2000);
})();
