let selectedPage = 1;

loadSettings("selectedChannel", (value) => {
    if (value) {
        selectedPage = value;
    }
});

function saveSettings(url, settings, local = false) {
    chrome.storage[local ? "local" : "sync"].set({ [url]: settings });
}

function loadSettings(url, callback, local = false) {
    chrome.storage[local ? "local" : "sync"].get([url], (result) => {
        callback(result[url] || null);
    });
}

function appendElementsToSettingsArr(url, value, local = false) {
    chrome.storage[local ? "local" : "sync"].get([url], (result) => {
        const settings = result[url] || [];
        settings.push(...value);
        chrome.storage[local ? "local" : "sync"].set({ [url]: settings });
    });
}

window.onload = function () {
    let openPopupsBtn = document.querySelector("#open-popups-btn");
    let saveUrlsBtn = document.querySelector("#save-urls");
    let closePopupsBtn = document.querySelector("#close-popups-btn");
    let saveInstructions = document.querySelector("#save-instructions");

    console.log(`Running script`);

    initChannelButtons();

    saveUrlsBtn.addEventListener("click", function () {
        let urls = document.querySelector("#urlInput").value.split("\n");
        saveUrlsBtn.setAttribute("style", "");
        saveSettings(`urls [${selectedPage}]`, urls);

        urls.forEach((url) => {
            let urlStrPage = `${url} [${selectedPage}]`;
            loadSettings(urlStrPage, (settings) => {
                if (settings) {
                    saveSettings(urlStrPage, settings);
                } else {
                    saveSettings(urlStrPage, null);
                }
            });
        });
    });

    openPopupsBtn.addEventListener("click", function () {
        openPopups();
    });

    closePopupsBtn.addEventListener("click", function () {
        loadSettings(
            `openPopupsID [${selectedPage}]`,
            async (value) => {
                async function closePopups() {
                    return new Promise((resolve, reject) => {
                        if (value) {
                            let removedCount = 0;
                            value.forEach((id) => {
                                chrome.windows.remove(id, () => {
                                    console.log(`closed popup:`, id);
                                    removedCount++;
                                    if (removedCount === value.length) {
                                        resolve();
                                    }
                                });
                            });
                        }
                    });
                }

                await closePopups().then(() => {
                    saveSettings(`openPopupsID [${selectedPage}]`, [], true);
                    console.log(`closed`);
                });
            },
            true
        );

        // chrome.windows.getAll({ populate: true }, function (windows) {
        //     windows.forEach(function (window) {
        //         if (window.type === "popup") {
        //             chrome.windows.remove(window.id);
        //         }
        //     });
        // });
    });

    chrome.storage.sync.get(null, function (items) {
        console.log("sync storage : ", items);
    });

    chrome.storage.local.get(null, function (items) {
        console.log("local storage : ", items);
    });

    document.getElementById("saveSettings").addEventListener("change", () => {
        const value = document.getElementById("saveSettings").checked;
        saveSettings(`saveSettings [${selectedPage}]`, value);

        if (value !== true) {
            saveInstructions.style.opacity = 0;
        } else {
            saveInstructions.style.opacity = 1;
        }
    });

    urlInput.addEventListener("input", () => {
        console.log(`change`);
        // color border of save button in red
        saveUrlsBtn.setAttribute("style", "box-shadow: 0px 0px 2px 0px red;");
    });

    loadPage();
    // Load saved settings
    function loadPage() {
        loadSettings(`saveSettings [${selectedPage}]`, (value) => {
            if (value !== null) {
                document.getElementById("saveSettings").checked = value;
                if (value !== true) {
                    saveInstructions.style.opacity = 0;
                } else {
                    saveInstructions.style.opacity = 1;
                }
            } else {
                document.getElementById("saveSettings").checked = false;
                saveInstructions.style.opacity = 0;
            }
        });

        loadSettings(`urls [${selectedPage}]`, (value) => {
            if (value !== null) {
                document.getElementById("urlInput").value = value.join("\n");
            } else {
                document.getElementById("urlInput").value = "";
            }
        });
    }

    async function openPopups() {
        console.log(`Running openPopups()`);
        const urls = document.getElementById("urlInput").value.split("\n");
        const chkSaveSettings = document.getElementById("saveSettings").checked;

        let openedPopupsId = [];

        async function openEveryUrl() {
            return new Promise((resolve, reject) => {
                urls.forEach((url) => {
                    let urlStrPage = `${url} [${selectedPage}]`;

                    loadSettings(urlStrPage, (settings) => {
                        let width, height, screenX, screenY;
                        if (settings) {
                            ({ width, height, screenX, screenY } = settings);
                        }

                        if (!chkSaveSettings || !settings) {
                            width = 800;
                            height = 600;
                            screenX = undefined;
                            screenY = undefined;
                        }

                        chrome.windows.create(
                            {
                                width,
                                height,
                                left: screenX,
                                top: screenY,
                                url: url,
                                type: "popup",
                            },
                            (window) => {
                                if (chkSaveSettings) {
                                    chrome.windows.onBoundsChanged.addListener(
                                        (windowChanged) => {
                                            // console.log(`windowChanged:`, windowChanged);

                                            if (
                                                windowChanged.id === window.id
                                            ) {
                                                saveSettings(urlStrPage, {
                                                    width: windowChanged.width,
                                                    height: windowChanged.height,
                                                    screenX: windowChanged.left,
                                                    screenY: windowChanged.top,
                                                });

                                                console.log(
                                                    "New window size: " +
                                                        windowChanged.width +
                                                        " x " +
                                                        windowChanged.height
                                                );
                                                console.log(
                                                    "New window position: " +
                                                        windowChanged.left +
                                                        ", " +
                                                        windowChanged.top
                                                );
                                            }
                                        }
                                    );

                                }

                                console.log(`popup:`, window);

                                openedPopupsId.push(window.id);

                                if (openedPopupsId.length === urls.length) {
                                    resolve();
                                }
                            }
                        );
                    });
                });
            });
        }

        await openEveryUrl().then(() => {
            console.log(`openedPopupsId:`, openedPopupsId);
            appendElementsToSettingsArr(
                `openPopupsID [${selectedPage}]`,
                openedPopupsId,
                true
            );
        });
    }

    function initChannelButtons() {
        const channelButtons = document.querySelectorAll(".chanBtns input");
        channelButtons.forEach((channelButton) => {
            channelButton.addEventListener("click", () => {
                let channelNumber = parseInt(channelButton.getAttribute("num"));
                changeToChannel(channelNumber);
                saveSettings("selectedChannel", channelNumber);
            });
        });

        loadSettings("selectedChannel", (value) => {
            if (value) {
                changeToChannel(value);
            }
        });
    }

    function changeToChannel(channelNumber) {
        selectedPage = channelNumber;
        loadPage();

        const channelButton = document.querySelector(`#chan${channelNumber}`);
        channelButton.checked = true;
    }
};
