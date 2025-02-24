// ==UserScript==
// @name         Beincom Auto-Clicker Like Button
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Automates a task on group.beincom.com by simulating clicks on elements with three SVG icons
// @author       You
// @match        https://group.beincom.com/*
// @icon         none
// @grant        none
// ==/UserScript==

(function () {
    "use strict";
    setInterval(() => {
        document
            .querySelectorAll(
                "#main-container > div > section > div:nth-child(4) > div > div:nth-child(1) > div> div > div > div.flex.flex-col.gap-y-4 > div:nth-child(1) > div > div.flex.w-full.items-center"
            )
            .forEach((e) => {
                if (e.querySelectorAll("svg").length === 3) {
                    e.querySelector("svg").parentNode.click();
                }
            });
    }, 1000);
});
