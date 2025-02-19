// ==UserScript==
// @name         9gag Custom
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://9gag.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=9gag.com
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    // Your code here...
    console.log("9gag Custom");
    const SaveConfig = () => {
        // This function saves the configuration to localStorage.
        localStorage.setItem("VMy9gag", JSON.stringify(VMy9gag));
    };

    let VMy9gag = {};

    // This variable stores the configuration.
    if (localStorage.getItem("VMy9gag")) {
        // If there is a saved configuration, load it.
        VMy9gag = JSON.parse(localStorage.getItem("VMy9gag"));
        VMy9gag.viewedArticles = Array.from(new Set(VMy9gag.viewedArticles));
    } else {
        // If there is no saved configuration, create a new one with the default settings.
        VMy9gag.onlyShowVideo = true;
        VMy9gag.skipViewed = true;
        VMy9gag.viewedArticles = [];
        SaveConfig();
    }

    // Function to process an individual article
    const processArticle = (article) => {
        if (!location.href.includes("https://9gag.com/interest/girls")) return;
        // Get the href of the article.
        let linkArticle = article.querySelector("div.post-container  a")?.href;
        // If the article is a picture and the `onlyShowVideo` setting is enabled, remove it from the page.
        VMy9gag.onlyShowVideo &&
            article.querySelector("picture") &&
            (() => {
                console.log("Removed picture article ", linkArticle);
                article.remove();
                article = null;
            })();

        // If the article is a video, check if it has already been viewed.
        if (VMy9gag.skipViewed) {
            if (!article) return;
            let video = article.querySelector("video");
            if (video) {
                // If the video has been viewed, remove it from the page.
                if (VMy9gag.viewedArticles.includes(linkArticle)) {
                    if (!video?.skipViewed) {
                        console.log("Removed viewed article ", linkArticle);
                        article.remove();
                        article = null;
                    }
                } else {
                    // If the video has not been viewed, set the `skipViewed` property to true and add it to the list of viewed articles.
                    if (!video?.skipViewed) {
                        video.loop = false;
                        video.skipViewed = true;
                        video.onpause = function () {
                            console.log("Added view article ", linkArticle);
                            if (!VMy9gag.viewedArticles.includes(linkArticle)) {
                                VMy9gag.viewedArticles.push(linkArticle);
                                SaveConfig();
                            }
                            video.onpause = null;
                        };
                    }
                }
            }
        }
    };

    // Function to check if the element "#list-view-2" is found
    const checkForListView2 = () => {
        if (!location.href.includes("https://9gag.com/interest/girls")) return;
        const listView2 = document.querySelector("#list-view-2");
        if (listView2) {
            clearInterval(checkInterval);
            // If "#list-view-2" is found, start the MutationObserver and process existing articles
            const observer = new MutationObserver((mutationsList, observer) => {
                let newElemeentAdded = false;
                mutationsList.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        newElemeentAdded = true;
                        Array.from(node.querySelectorAll("article[id*=jsid-post-]")).map(processArticle);
                        console.log(node, node.childElementCount);
                        if (node.childElementCount == 0) {
                            node.remove();
                            node = null;
                        }
                    });
                });
                if (newElemeentAdded) {
                    const streams = listView2.querySelectorAll("div.list-stream[id*=stream-]");
                    if (streams.length > 50) {
                        for (let i = 0; i < 50; i++) {
                            console.log("Removed stream ", streams[i].id);
                            streams[i].remove();
                            streams[i] = null;
                        }
                    }
                }
            });
            observer.observe(listView2, { childList: true });
            listView2.querySelectorAll("div.list-stream > article[id*=jsid-post-]").forEach(processArticle);

            // // Event listener for arrow key presses (up and down)
            // document.addEventListener("keydown", handleKeyPress);
        }
    };

    // Function to handle arrow key presses (up and down)
    const handleKeyPress = (event) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
            return;
        }
        const listView2 = document.querySelector("#list-view-2");
        if (!listView2) return;

        const articles = listView2.querySelectorAll("div.list-stream > article[id*=jsid-post-]");
        let articleViewing = 0;
        if (location.hash === "") {
            articleViewing = 0;
        } else {
            articleViewing = Array.from(articles).findIndex((e) => "#" + e.id === location.hash);
        }

        // Arrow down key press
        if (event.key === "ArrowDown") {
            articleViewing = Math.min(articleViewing + 1, articles.length - 1);
        }
        // Arrow up key press
        else if (event.key === "ArrowUp") {
            articleViewing = Math.max(articleViewing - 1, 0);
        }
        // Scroll the viewing article into view
        if (articles[articleViewing]) {
            location.hash = articles[articleViewing].id;
            articles[articleViewing].scrollIntoView({ behavior: "smooth" });
            articles[articleViewing].setAttribute("articleViewing", "");
        }
    };

    // Start checking for "#list-view-2" element every 1000 milliseconds (1 second)
    const checkInterval = setInterval(checkForListView2, 1000);
})();
