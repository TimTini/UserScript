// ==UserScript==
// @name         Beincom Auto-Clicker Like Button
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Automates a task on group.beincom.com by simulating clicks on elements with three SVG icons
// @author       You
// @match        https://group.beincom.com/*
// @icon         none
// @grant        none
// ==/UserScript==

// Anonymous self-invoking function to encapsulate the code
(function () {
    "use strict";
    const TARGET_BUTTON_TEXT = ["THÍCH", "LIKE"];
    // Set interval to run every 1 second
    setInterval(() => {
        try {
            // Select all sections with div elements that have class 'flex w-full items-center'
            const sections = document.querySelectorAll("section div.flex.w-full.items-center");

            // Filter the sections to only include those with at least 3 buttons and a button with text "Thích"
            const filteredSections = Array.from(sections).filter((section) => {
                const buttons = section.querySelectorAll("button");
                return buttons.length >= 3 && TARGET_BUTTON_TEXT.includes(buttons[0].textContent?.toUpperCase());
            });

            // Click the first button with text "Thích" in each filtered section
            filteredSections.forEach((section) => {
                const button = section.querySelector("button");
                if (button) {
                    button.click();
                    console.log(`Clicked button with text "Thích" in section`);
                }
            });
        } catch (error) {
            console.error(`Error occurred: ${error.message}`);
        }
    }, 1000);
})();
