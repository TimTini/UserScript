// ==UserScript==
// @name         Skip wait to slowDownload
// @namespace    https://byte.io.vn/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://*.nexusmods.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=nexusmods.com
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    // Your code here...
    function isNexusModsUrl(url) {
        const regex = /^https:\/\/www\.nexusmods\.com\/[^\/]+\/mods\/[^\/]+\?.*tab=files.*$/;
        return regex.test(url);
    }
    function isNexusModsCollectionUrl(url) {
        const regex = /^https:\/\/next\.nexusmods\.com\/cyberpunk2077\/collections\/.*$/;
        return regex.test(url);
    }

    const urlParams = new URLSearchParams(location.search);

    if (isNexusModsUrl(location.href)) {
        console.log("Mod Download");
        const createNewButton = (uri) => {
            const btnSlowDownloadNow = btnSlowDownload.cloneNode(true);
            btnSlowDownloadNow.onclick = () => {
                location.href = uri;
            };
            btnSlowDownload.replaceWith(btnSlowDownloadNow);
            return btnSlowDownloadNow;
        };

        const ManualDownload = () => {
            // https://www.nexusmods.com/cyberpunk2077/mods/5266?tab=files&file_id=28345#ERROR-download-location-not-found
            if (!urlParams.has("file_id")) {
                return Promise.resolve(false);
            }
            if (!window.current_game_id) {
                return Promise.resolve(false);
            }
            const fileId = urlParams.get("file_id");
            const gameId = window.current_game_id;
            const body = `fid=${fileId}&game_id=${gameId}`;

            return fetch("https://www.nexusmods.com/Core/Libs/Common/Managers/Downloads?GenerateDownloadUrl", {
                headers: {
                    accept: "*/*",
                    "accept-language": "en-US,en;q=0.9,vi;q=0.8",
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "sec-ch-ua": '"Not.A/Brand";v="8", "Chromium";v="114", "Microsoft Edge";v="114"',
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": '"Windows"',
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "x-kl-ajax-request": "Ajax_Request",
                    "x-requested-with": "XMLHttpRequest",
                },
                referrer: location.href,
                referrerPolicy: "strict-origin-when-cross-origin",
                body: body,
                method: "POST",
                mode: "cors",
                credentials: "include",
            })
                .then((response) => response.json())
                .then((data) => data.url);
        };

        const btnSlowDownload = document.querySelector("#slowDownloadButton");
        if (btnSlowDownload) {
            const uri = btnSlowDownload.getAttribute("data-download-url");
            if (uri.includes("#ERROR")) {
                ManualDownload().then((url) => {
                    if (url) {
                        createNewButton(url).textContent = "SLOW DOWNLOAD MANUAL";
                    }
                });
            } else {
                createNewButton(uri).click();
            }
        }
    }
    if (isNexusModsCollectionUrl(location.href)) {
        console.log("Collection Download");
        const createDownloadCollectionButton = () => {
            let collectionHeader = document.querySelector(".collection-header__wrapper");
            let revisionSelector = document.querySelector(".collection-header__revision-selector  > div");
            let addToVortexButton = revisionSelector?.lastChild;
            if (!collectionHeader || !revisionSelector) return;

            collectionHeader.style.gridTemplateRows = "11rem 14rem auto auto";
            const collectionDownloadButton = addToVortexButton.cloneNode(true);
            collectionDownloadButton.querySelector("span").textContent = "Mod manager download";
            collectionDownloadButton.querySelector("svg").remove();
            collectionDownloadButton.querySelectorAll("a").forEach((a) => {
                // a.setAttribute("href", "javascript:void(0)");
                a.removeAttribute("href");
            });
            collectionDownloadButton.onclick = downloadCollection;
            revisionSelector.appendChild(collectionDownloadButton);
            return collectionDownloadButton;
        };
        const downloadCollection = () => {
            let gameDomain = window.__NEXT_DATA__.query.gameDomain;
            let collectionSlug = window.__NEXT_DATA__.query.collectionSlug;

            fetch("https://next.nexusmods.com/api/graphql", {
                headers: {
                    accept: "*/*",
                    "accept-language": "en-US,en;q=0.9,vi;q=0.8",
                    "api-version": "2023-09-05",
                    "content-type": "application/json",
                    "sec-ch-ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Microsoft Edge";v="122"',
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": '"Windows"',
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                },
                referrer: "https://next.nexusmods.com/" + gameDomain + "/collections/" + collectionSlug + "?tab=mods",
                referrerPolicy: "strict-origin-when-cross-origin",
                body:
                    '{"query":"query CollectionRevisionMods ($revision: Int, $slug: String!, $viewAdultContent: Boolean) { collectionRevision (revision: $revision, slug: $slug, viewAdultContent: $viewAdultContent) { externalResources { id, name, resourceType, resourceUrl }, modFiles { fileId, optional, file { fileId, name, scanned, size, sizeInBytes, version, mod { adultContent, author, category, modId, name, pictureUrl, summary, version, game { domainName }, uploader { avatar, memberId, name } } } } } }","variables":{"slug":"' +
                    collectionSlug +
                    '","viewAdultContent":true},"operationName":"CollectionRevisionMods"}',
                method: "POST",
                mode: "cors",
                credentials: "include",
            })
                .then((r) => r.json())
                .then((data) => {
                    let modFiles = data.data.collectionRevision.modFiles;
                    if (!modFiles) return;

                    let modLinks = modFiles.map((m) => `https://www.nexusmods.com/${gameDomain}/mods/${m.file.mod.modId}?tab=files&file_id=${m.fileId}&nmm=1`);
                    (async () => {
                        for (const modLink of modLinks) {
                            const response = await fetch(modLink, {
                                headers: {
                                    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                                    "accept-language": "en-US,en;q=0.9,vi;q=0.8",
                                    "cache-control": "max-age=0",
                                    "sec-ch-ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Microsoft Edge";v="122"',
                                    "sec-ch-ua-mobile": "?0",
                                    "sec-ch-ua-platform": '"Windows"',
                                    "sec-fetch-dest": "empty",
                                    "sec-fetch-mode": "cors",
                                    "sec-fetch-site": "same-origin",
                                },
                                referrerPolicy: "strict-origin-when-cross-origin",
                                body: null,
                                method: "GET",
                                mode: "cors",
                                credentials: "include",
                            });
                            const text = await response.text();
                            const parser = new DOMParser();
                            const htmlDoc = parser.parseFromString(text, "text/html");

                            // Find buttons with data-download-url attribute
                            const buttonsWithDataUrl = htmlDoc.querySelector("button[data-download-url]");
                            const downloadUrl = buttonsWithDataUrl.getAttribute("data-download-url");
                            console.log(downloadUrl); // or do something with the download URL
                        }
                    })();

                    // Fetch link bên dưới
                    // https://www.nexusmods.com/cyberpunk2077/mods/8737?tab=files&file_id=46530&nmm=1
                    // Query button bên dưới
                    // <button id="slowDownloadButton" class="rj-btn rj-btn-secondary rj-btn-full" data-download-url="nxm://cyberpunk2077/mods/8737/files/46530?key=8nvvVFVsavHc--hlSMoAfQ&expires=1711009941&user_id=204540026"><span>Slow download</span></button>
                    // lấy URL từ data-download-url
                    // nxm://cyberpunk2077/mods/8737/files/46530?key=8nvvVFVsavHc--hlSMoAfQ&expires=1711009941&user_id=204540026
                });
        };
        let ti = setInterval(() => {
            if (createDownloadCollectionButton()) {
                console.log("Handled!!");
                clearTimeout(ti);
            }
        }, 2000);
    }
})();
