// ==UserScript==
// @name         Beincom Auto-Clicker Like Button
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Automates a task on group.beincom.com by simulating clicks on elements with three SVG icons
// @author       You
// @match        https://group.beincom.com/*
// @icon         none
// @grant        none
// ==/UserScript==

(function () {
    "use strict";
    setInterval(() => {
        try {
            document
                .querySelectorAll(
                    "div.flex.w-full.items-center"
                )
                .forEach((e) => {
                    if (e.querySelectorAll("svg").length === 3) {
                        e.querySelector("svg").parentNode.click();
                    }
                });
        } catch (error) {}
    }, 1000);
});
