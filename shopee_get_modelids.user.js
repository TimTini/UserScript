// ==UserScript==
// @name         Shopee Model Extractor
// @namespace    http://tampermonkey.net/
// @version      2025-02-26
// @description  Trích xuất model sản phẩm trên Shopee và gửi dữ liệu về giao diện điều khiển để xử lý.
// @author       TimTini
// @match        https://vn.xiapibuy.com/*?*tide_model=*
// @match        https://example.com/start_model
// @icon         https://www.google.com/s2/favicons?sz=64&domain=shopee.vn
// @run-at       document-idle
// @grant        unsafeWindow
// ==/UserScript==

(function () {
    "use strict"; // Enable strict mode

    const IS_DEBUG_MODE = true;
    const KEY_PRODUCT = "tide_model"; // Key to check in the URL query
    const CHECK_INTERVAL = 1000; // Interval for checking in milliseconds
    const MODEL_SELECTOR = ".flex.KIoPj6.W5LiQM"; // Selector for the model element
    const PROCUCT_NOTFOUND_SELECTOR = "[role='main'] > .product-not-exist__content > .product-not-exist__text";
    const SHOPEE_URLS_ORIGIN = ["https://shopee.vn", "https://vn.xiapibuy.com"];
    const GUI_URLS = ["https://example.com/start_model"];

    // Class to handle URL query parameters
    class VRL {
        constructor(url) {
            this.url = new URL(url);
        }
        setparam(key, value) {
            this.url.searchParams.set(key, value);
        }
        getparam(key) {
            return this.url.searchParams.get(key);
        }
        removeparam(key) {
            this.url.searchParams.delete(key);
            return this.url.toString(); // Return the updated URL string
        }
    }

    const logDebug = (...args) => {
        if (IS_DEBUG_MODE) {
            console.log(...args);
        }
    };

    logDebug({ debug: IS_DEBUG_MODE });
    const IsWebGui = () => {
        return GUI_URLS.includes(location.href);
    };
    // Function to check if the URL contains the required key
    const Check_Request = () => {
        const url = new VRL(window.location.href);
        return !!url.getparam(KEY_PRODUCT) || IsWebGui();
    };

    if (!Check_Request()) {
        console.log("Script Not Started", "Shopee Model Extractor");
        return;
    } // Exit if the key is not present

    console.log("Script Started", "Shopee Model Extractor"); // Log script start

    //##########GUI##########
    const _v = {
        task: null,
        history: [],
    };
    const Create_GUI = () => {
        document.querySelectorAll("style").forEach((style) => style.remove());
        // Replace the entire HTML content
        document.documentElement.innerHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Textarea App</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
          }
          textarea {
            width: 80%;
            height: 200px;
            padding: 10px;
            font-size: 16px;
            border: 1px solid #ccc;
            border-radius: 5px;
          }
          textarea:focus {
            outline: none;
            border-color: #007BFF;
            box-shadow: 0 0 5px rgba(0, 123, 255, 0.5);
          }
          button {
            padding: 10px 20px;
            font-size: 16px;
            background-color: #007BFF;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
          }
          button:hover {
            background-color: #0056b3;
          }
        </style>
      </head>
      <body>
        <textarea id="input" placeholder="Enter your input here..." disabled></textarea>
        <button id="process" disabled>Process</button>
        <textarea id="output" placeholder="Output will appear here..." disabled></textarea>
      </body>
      </html>
    `;
    };
    const Create_Event = () => {
        const inputEle = document.getElementById("input");
        const outputEle = document.getElementById("output");
        const processEle = document.getElementById("process");
        if (!inputEle || !outputEle || !processEle) {
            setTimeout(() => {
                Create_Event();
            }, 1000);
            return;
        }
        inputEle.disabled = false;
        outputEle.disabled = false;
        processEle.disabled = false;
        // End Test data

        processEle.addEventListener("click", () => {
            _v.task = new Task(inputEle, outputEle, processEle);
            _v.task.process();
        });
    };

    class Task {
        constructor(inputEle, outputEle, processEle) {
            this.history = [];
            this.index = -1;
            this.inputEle = inputEle;
            this.outputEle = outputEle;
            this.processEle = processEle;
            this.urls = [];
            this.vindow = null;

            this.outputEle.value = "";
            this.urls = this.inputEle.value
                .split("\n")
                .map((url) => url.trim())
                .filter((url) => url.length > 0);
            let temp_index = 0;
            this.structureOutput = [];
            this.urls.forEach((element) => {
                this.structureOutput.push({
                    index: temp_index,
                    url: element,
                    url_tide: "",
                    result: "",
                });
                temp_index++;
            });
        }
        isSameUrl(url_str, tide_url_str) {
            return tide_url_str.includes(url_str);
        }
        showProcess() {
            if (this.index >= this.urls.length) {
                document.querySelector("title").textContent = "Done";
            } else {
                document.querySelector("title").textContent = `${this.index + 1}/${this.urls.length}`;
            }
        }
        saveHistory(data) {
            const text = data.text;
            const url_tide = data.url;
            const isExists = this.history.some((item) => item.url === url_tide);
            if (isExists) {
                return;
            }
            _v.history.push({
                url: this.urls[this.index],
                url_tide: url_tide,
                text: text,
            });
        }
        loadHistory(url) {
            const data = _v.history.find((item) => item.url === url);
            if (!data) {
                return;
            }
            return data;
        }
        openWindow(url) {
            console.log("Open window", url);
            this.vindow = window.open(url, "_blank");
        }
        closeWindow() {
            console.log("Close window");
            if (this.vindow) {
                this.vindow.close();
            }
            this.vindow = null;
        }
        process() {
            this.index += 1;
            this.showProcess();
            if (this.index >= this.urls.length) {
                console.log("All URLs have been processed");
                this.processEle.disabled = false;
                this.processEle.textContent = "Process";
                return;
            }
            this.processEle.disabled = true;
            this.processEle.textContent = "Processing...";
            console.log("Processing", this.index, this.urls[this.index]);
            // Check if data is available in history
            const historyData = this.loadHistory(this.urls[this.index]);
            if (historyData) {
                console.log("Data found in history", historyData);
                this.output(historyData);
                // Process next URL
                this.process();
            } else {
                const vurl = new VRL(this.urls[this.index]);
                vurl.setparam(KEY_PRODUCT, true);
                this.openWindow(vurl.url.href);
            }
        }
        output(data) {
            // text
            const text = data.text;
            // url_tide
            const url_tide = data.url_tide;
            // Output result
            this.structureOutput[this.index].result = text;
            this.structureOutput[this.index].url_tide = url_tide;
            // Check if URL is the same
            if (this.isSameUrl(this.structureOutput[this.index].url, url_tide)) {
                // Output result
                this.outputEle.value = this.structureOutput.map((item) => `${item.result}\t`).join("\n");
            } else {
                // Output error result
                this.outputEle.value = this.structureOutput.map((item) => `URL không giống, check lại code!! [${item.url}] - [${result_url}]`);
            }
        }
    }
    const gui_start = () => {
        // Create GUI
        Create_GUI();
        // Create Event
        Create_Event(_v);
        // Listen for messages
        window.addEventListener("message", (event) => {
            if (!SHOPEE_URLS_ORIGIN.includes(event.origin)) {
                console.warn("Blocked message from:", event.origin);
                return;
            }
            console.log("Received data", event.data, "\norigin", event.origin);
            // Output result
            _v.task.output(event.data);
            // Save history
            _v.task.saveHistory(event.data);
            // Close window
            _v.task.closeWindow();
            // Process next URL
            _v.task.process();
        });
    };

    //##########Shopee##########
    // Function to extract discounts from the page
    const extractModels = () => {
        function findKeyInJsonObject(jsonString, keyToFind) {
            const jsonObject = JSON.parse(jsonString);

            function search(jsonObject) {
                if (typeof jsonObject !== "object" || jsonObject === null) return null;
                if (jsonObject.hasOwnProperty(keyToFind)) return jsonObject[keyToFind];

                for (const key in jsonObject) {
                    const result = search(jsonObject[key]);
                    if (result) return result;
                }
                return null;
            }
            return search(jsonObject);
        }

        function serializeObjectToJson(obj) {
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

        const modelElement = document.querySelector(MODEL_SELECTOR); // Find the target element
        if (!modelElement) return null;
        logDebug(modelElement);
        const jsonString = serializeObjectToJson(modelElement);
        return findKeyInJsonObject(jsonString, "models");
    };
    // Function to send a message to the opener window
    const SendMessage = (data) => {
        window.opener.postMessage({ text: data, url_tide: location.href }, "https://example.com"); // Post message to example.com
        console.log("Sent message to example.com:", data); // Log the sent message
    };
    const shopee_start = () => {
        try {
            const is_notfound = document.querySelector(PROCUCT_NOTFOUND_SELECTOR);
            const oriUrl = new VRL(location.href).removeparam(KEY_PRODUCT);
            if (is_notfound) {
                SendMessage(`${oriUrl}\tNA\tNon exist`);
            }

            const models = extractModels();
            if (models) {
                const models_info = models.map((model) => {
                    return {
                        link: oriUrl,
                        option: model.name,
                        id: model.modelid,
                    };
                });
                const content = models_info.map((model) => `${model.link}\t${model.option}\t${model.id}`).join("\n");
                SendMessage(content);
            }
        } catch (error) {}
        setTimeout(shopee_start, CHECK_INTERVAL);
    };
    //##########-Main-##########
    // Check if the current page is the GUI page
    if (IsWebGui()) {
        logDebug("GUI Page");
        // If it's the GUI page, create the GUI
        gui_start();
    } else {
        logDebug("Shopee Page");
        // If it's not the GUI page, start the script
        shopee_start();
    }
})();
