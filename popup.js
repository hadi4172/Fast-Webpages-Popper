window.onload = function () {
    let openPopupsBtn = document.querySelector("#open-popups-btn");
    let saveUrlsBtn = document.querySelector("#save-urls");
    let closePopupsBtn = document.querySelector("#close-popups-btn");

    console.log(`Running script`);

    saveUrlsBtn.addEventListener("click", function () {
        let urls = document.querySelector("#urlInput").value.split("\n");
        saveUrlsBtn.setAttribute("style", "");
        saveSettings("urls", urls);

        urls.forEach((url) => {
            loadSettings(url, (settings) => {
                if (settings) {
                    saveSettings(url, settings);
                } else {
                    saveSettings(url, null);
                }
            });
        });
    });

    openPopupsBtn.addEventListener("click", function () {
        openPopups();
    });

    closePopupsBtn.addEventListener("click", function () {
        chrome.windows.getAll({populate: true}, function (windows) {
          windows.forEach(function (window) {
            if (window.type === "popup") {
              chrome.windows.remove(window.id);
            }
          });
        });
      });

    chrome.storage.sync.get(null, function (items) {
        console.log(items);
    });

    document.getElementById("saveSettings").addEventListener("change", () => {
        saveSettings(
            "saveSettings",
            document.getElementById("saveSettings").checked
        );
    });

    urlInput.addEventListener("input", () => {
        console.log(`change`);
        // color border of save button in red
        saveUrlsBtn.setAttribute("style", "box-shadow: 0px 0px 2px 0px red;");
    });

    loadPage();
    // Load saved settings
    function loadPage() {
        loadSettings("saveSettings", (value) => {
            if (value !== null) {
                document.getElementById("saveSettings").checked = value;
            }
        });

        loadSettings("urls", (value) => {
            if (value !== null) {
                document.getElementById("urlInput").value = value.join("\n");
            }
        });
    }

    function saveSettings(url, settings) {
        chrome.storage.sync.set({ [url]: settings });
    }

    function loadSettings(url, callback) {
        chrome.storage.sync.get([url], (result) => {
            callback(result[url] || null);
        });
    }

    function openPopups() {
        console.log(`Running openPopups()`);
        const urls = document.getElementById("urlInput").value.split("\n");
        const chkSaveSettings = document.getElementById("saveSettings").checked;

        urls.forEach((url) => {
            chrome.windows.create(
                { width: 800, height: 600, url: url, type: "popup" },
                (window) => {
                    if (chkSaveSettings) {
                        // Check if there are saved settings for this URL and apply them
                        loadSettings(url, (settings) => {
                            if (settings) {
                                const { width, height, screenX, screenY } =
                                    settings;
                                chrome.windows.update(
                                    window.id,
                                    {
                                        height,
                                        width,
                                        left: screenX,
                                        top: screenY,
                                    },
                                    () => {
                                        console.log("updated");
                                    }
                                );
                            }
                        });

                        chrome.windows.onBoundsChanged.addListener(
                            (windowChanged) => {
                                // console.log(`windowChanged:`, windowChanged);

                                if (windowChanged.id === window.id) {
                                    
                                    saveSettings(url, {
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

                        console.log(`popup:`, window);
                    }
                }
            );
        });
    }
};
