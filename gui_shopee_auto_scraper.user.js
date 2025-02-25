// ==UserScript==
// @name         Shopee auto scraper
// @namespace    http://tampermonkey.net/
// @version      2025-02-16.01
// @description  Xử lý danh sách URL Shopee, mở từng URL, thu thập dữ liệu và xuất kết quả dưới dạng danh sách.
// @author       You
// @match        https://example.com/start
// @icon         https://www.google.com/s2/favicons?sz=64&domain=shopee.vn
// @grant        none
// @run-at       document-idle
// @grant        unsafeWindow
// ==/UserScript==

(function () {
    "use strict";
    const SHOPEE_URLS_ORIGIN = ["https://shopee.vn", "https://vn.xiapibuy.com"];
    const _v = {
        task: null,
        history: [],
    };
    const testurls = [];
    // Your code here...
    const Create_GUI = () => {
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
        // Start Test data
        inputEle.value = testurls.join("\n");
        // End Test data

        processEle.addEventListener("click", () => {
            _v.task = new Task(inputEle, outputEle, processEle);
            _v.task.process();
        });
    };

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
        removeparam(key) {
            this.url.searchParams.delete(key); // Remove a query parameter
        }
    }
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
                vurl.setparam("tide", true);
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
            this.outputEle.value = this.structureOutput.map((item) => `${item.url}\t${item.result}\t`).join("\n");
        }
    }
    // Create GUI
    Create_GUI();
    // Create Event
    Create_Event();
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
})();
