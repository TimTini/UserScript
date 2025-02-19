// ==UserScript==
// @name         Custom setTimeout setInterval
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://*/*
// @icon
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    // Your code here...
    // Backup the original setTimeout and setInterval functions
    const originalSetTimeout = setTimeout;
    const originalSetInterval = setInterval;
    // Backup the original getTime function
    const originalGetTime = Date.prototype.getTime;

    // Overwrite the getTime function
    Date.prototype.getTime = function () {
        return originalGetTime.call(this) - 100;
    };

    // Overwrite the global setTimeout function
    setTimeout = (callback, delay, ...args) => {
        // Your custom logic here before calling the original function
        // console.log(`Custom setTimeout called with delay ${delay} ms`);
        // Call the original setTimeout function
        return originalSetTimeout(callback, delay + (100).args);
    };

    //     // Overwrite the global setInterval function
    setInterval = (callback, interval, ...args) => {
        // Your custom logic here before calling the original function
        // console.log(`Custom setInterval called with interval ${interval} ms`);
        // Call the original setInterval function
        return originalSetInterval(callback, interval + 100, ...args);
    };
})();
