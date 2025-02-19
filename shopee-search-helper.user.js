// ==UserScript==
// @name         Hỗ Trợ Tìm Kiếm Sản Phẩm Shopee
// @namespace    http://tampermonkey.net/
// @version      2024-03-15
// @description  Thêm bộ lọc tìm kiếm nhanh với chức năng gắn thẻ, tạm thời tắt chức năng sắp xếp sản phẩm theo doanh số bán ra.
// @author       TimTini
// @match        https://shopee.vn/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=shopee.vn
// @grant        none
// ==/UserScript==

(function () {
    "use strict";
    // Function to create and append a style tag with custom CSS
    const addCustomStyles = () => {
        // Create a style element
        const style = document.createElement("style");

        // Define your custom CSS rules
        const css = `
        .v-custom-tag-search {
            background-color: #ee4d2d;
            color: #fff;
            border: 1px solid #ee4d2d;
            border-radius: 3px;
            padding: 5px 10px;
            margin-right: 5px;
            display: inline-flex;
            align-items: center;
        }

        .v-custom-tag-close {
            background: transparent;
            border: none;
            color: #fff;
            margin-left: 8px;
            font-size: 14px;
            cursor: pointer;
        }

        .v-custom-tag-close:hover {
            color: #000;
        }
    `;

        // Add the CSS rules to the style element
        style.textContent = css;

        // Append the style element to the head of the document
        document.head.appendChild(style);
    };
    // Call the function to add the custom styles
    addCustomStyles();

    // Function to convert sales text to an integer
    const convertSalesTextToNumber = (text) => {
        let number = text
            .replace(/\./g, "")
            .replace(/,/g, ".")
            .match(/(\d+(\.\d+)?)(k?)/i);
        if (number) {
            let value = parseFloat(number[1]);
            if (number[3].toLowerCase() === "k") {
                value *= 1000;
            }
            return Math.round(value);
        }
        return 0;
    };

    // Hàm hiển thị thông báo
    function showMessage(message, duration = 3000) {
        const notification = document.createElement("div");
        notification.textContent = message;
        notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #4CAF50;
        color: white;
        padding: 10px;
        border-radius: 5px;
        z-index: 1000;
    `;
        document.body.appendChild(notification);

        let timeout = setTimeout(() => {
            document.body.removeChild(notification);
        }, duration);
        notification.onclick = () => {
            clearTimeout(timeout);
            document.body.removeChild(notification);
        };
    }

    // Function to sort the items based on sales
    const sortItems = () => {
        const ul = document.querySelector(".row.shopee-search-item-result__items");
        const listItems = Array.from(document.querySelectorAll("li.shopee-search-item-result__item"));
        listItems.sort((a, b) => {
            const getSoldValue = (li) => {
                const textElement = li.querySelector(".truncate.text-shopee-black87.text-xs.min-h-4");
                if (textElement) {
                    return convertSalesTextToNumber(textElement.textContent);
                }
                return 0;
            };

            return getSoldValue(b) - getSoldValue(a); // Sort in descending order
        });

        listItems.forEach((li) => ul.appendChild(li)); // Moves li to the end of the ul
    };

    class ProcuctSearchHelp {
        constructor() {
            this.names = [];
            this.init();
        }
        init() {
            this.filterProduct();
        }
        filterProduct = () => {
            const callAgain = () => {
                setTimeout(this.filterProduct, 1000);
            };
            const names = document.querySelectorAll(".v-custom-tag-search > span");
            this.names = Array.from(names).map((n) => n.textContent.trim());
            const listItems = Array.from(document.querySelectorAll("li.shopee-search-item-result__item"));
            console.log("filter product", this.names);
            if (this.names.length === 0) {
                listItems.forEach((li) => {
                    if (li.style?.display !== "block") {
                        li.style.display = "block";
                    }
                    li.dataset.processed = "true";
                });
                return callAgain();
            }
            listItems.forEach((li) => {
                const productNameEle = li.querySelector("div.whitespace-normal.line-clamp-2.break-words.min-h-\\[2\\.5rem\\].text-sm");
                if (productNameEle) {
                    const productName = productNameEle.textContent;
                    const productNameLower = productName.trim().toLowerCase();
                    const matchesAnyName = this.names.every((n) => productNameLower.includes(n.toLowerCase()));
                    if (matchesAnyName) {
                        if (li.style?.display !== "block") {
                            li.style.display = "block";
                        }
                    } else {
                        if (li.style?.display !== "none") {
                            li.style.display = "none";
                        }
                    }
                    li.dataset.processed = "true";
                }
            });
            return callAgain();
        };
    }

    const productSearchHelp = new ProcuctSearchHelp();

    /////////////////////////////////////////////////////
    // Add a new button to trigger sorting
    const addVBar = () => {
        const sortBar = document.querySelector(".shopee-sort-bar");
        const existingVBar = document.querySelector("#v-search");

        if (sortBar && !existingVBar) {
            // Your string
            const newElementString = `
<fieldset class="shopee-sort-bar v-shopee-sort-bar" style="border: 0px; margin-right: 0px; margin-left: 0px;">
    <div class="shopee-sort-bar__label">Tìm kiếm nhanh</div>
    <div class="shopee-sort-by-options">
        <section class="shopee-sort-by-options__option-group v-shopee-sort-by-options__option-group">
            <div role="search" autocomplete="off" class="shopee-searchbar">
                <div class="shopee-searchbar__main">
                    <div class="shopee-searchbar-input">
                        <input id="v-search" aria-label="" class="shopee-searchbar-input__input" maxlength="128"
                            placeholder="Search" autocomplete="off" aria-autocomplete="list"
                            aria-controls="shopee-searchbar-listbox" aria-expanded="false" role="combobox" value=""
                            data-listener-added_a4f4c6e9="true">
                    </div>
                </div>
            </div>
        </section>
    </div>
</fieldset>
`;

            const attachClickEvent = () => {
                const parent = sortBar.parentElement;
                const searchInput = parent.querySelector("#v-search");

                if (searchInput) {
                    // Function to create and append a tag element
                    const createTag = (inputValue) => {
                        // Create the tag element
                        const tag = document.createElement("div");
                        tag.className = "v-custom-tag-search";

                        // Create the text element
                        const text = document.createElement("span");
                        text.textContent = inputValue;

                        // Create the close button
                        const closeButton = document.createElement("button");
                        closeButton.className = "v-custom-tag-close";
                        closeButton.textContent = "x";
                        // Add event listener to remove the tag when the close button is clicked
                        closeButton.addEventListener("click", () => {
                            tag.remove();
                        });

                        // Append text and close button to the tag
                        tag.appendChild(text);
                        tag.appendChild(closeButton);

                        // Get the section where you want to append the tag
                        const section = document.querySelector(".v-shopee-sort-by-options__option-group");
                        section.appendChild(tag);
                    };
                    // Event listener for Tab and Enter key press
                    document.querySelector("#v-search").addEventListener("keydown", (event) => {
                        if (event.key === "Tab" || event.key === "Enter") {
                            event.preventDefault(); // Prevent default behavior (tabbing or submitting the form)

                            const inputElement = event.target;
                            const inputValue = inputElement.value.trim();

                            if (inputValue !== "") {
                                for (const name of inputValue.split(",")) {
                                    createTag(name.trim());
                                }
                                inputElement.value = ""; // Clear the input after creating the tag
                            }
                        }
                    });
                    console.log("Event attached successfully.");
                } else {
                    // Retry after 500 milliseconds
                    setTimeout(attachClickEvent, 500);
                }
            };
            // Insert the string as HTML right behind .shopee-sort-bar
            sortBar.insertAdjacentHTML("afterend", newElementString);
            attachClickEvent();
        }

        setTimeout(addVBar, 1000); // Retry after 2000 milliseconds (2 seconds)
    };

    const handleProductLinkAndSalesCopy = () => {
        // In Product Page
        const element = document.querySelector("[class='flex mnzVGI']");
        if (element && !element.dataset.v_product_copy_info) {
            element.addEventListener("click", () => {
                const copyText = [location.href];
                copyText.push(convertSalesTextToNumber(element.textContent));
                navigator.clipboard.writeText(copyText.join("\t")).then(() => {
                    showMessage("Đã sao chép!");
                });
                element.dataset.v_product_copy_info = "true";
            });
        }

        // In Search Page
        const productItem = document.querySelectorAll("li.shopee-search-item-result__item");
        productItem.forEach((item) => {
            const link = item.querySelector("a.contents");
            const sales = item.querySelector(".truncate.text-shopee-black87.text-xs.min-h-4");
            if (link && sales && !item.dataset.v_search_copy_info) {
                sales.addEventListener("click", (event) => {
                    event.stopPropagation(); // Prevent the click event from propagating to the link
                    event.preventDefault(); // Prevent the default behavior of the link if needed

                    const copyText = [link.href];
                    copyText.push(convertSalesTextToNumber(sales.textContent));
                    navigator.clipboard.writeText(copyText.join("\t")).then(() => {
                        showMessage("Đã sao chép!");
                    });
                });
            }
            item.dataset.v_search_copy_info = "true";
        });

        setTimeout(handleProductLinkAndSalesCopy, 1000); // Retry after 2000 milliseconds (2 seconds)
    };
    addVBar();
    handleProductLinkAndSalesCopy();
})();
