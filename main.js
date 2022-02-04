const { app, BrowserWindow, ipcMain, Menu, Notification } = require("electron");
const { setup: setupPushReceiver } = require("electron-push-receiver");
const Store = require("electron-store");
const fetch = require("electron-fetch").default;
const path = require("path");

const INITIAL_WINDOW_SIZE = {
  width: 1100,
  height: 700,
};

let NOTIFICATIONS_INITIALIZED = false;

const USER_AGENT_POSTFIX = "Android/Look-a-like";

const BASE_URL = "https://service.giosg.com";

let waitForAccessToken;
const store = new Store();

store.set("giosg-mode", "desktop");
store.set("notifications-enabled", true);
store.set("open-conversation-on-notification-click", true);

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
    webSecurity: false,
    width: INITIAL_WINDOW_SIZE.width,
    height: INITIAL_WINDOW_SIZE.height,
  });
  loadMainDocument();

  waitForAccessToken = new Promise((resolve, reject) => {
    const tokenTimeout = setTimeout(() => {
      reject("Timeout getting access token");
    }, 60000);

    mainWindow.webContents.on("frame-created", function (event, details) {
      details.frame
        .executeJavaScript('window.localStorage.getItem("accessToken");', true)
        .then((result) => {
          if (result) {
            console.log(
              "*** Found token from FRAME",
              JSON.parse(result).access_token
            );
            clearTimeout(tokenTimeout);
            store.set("access_token", JSON.parse(result));
            resolve(JSON.parse(result));
          }
        });
    });

    mainWindow.webContents
      .executeJavaScript('window.localStorage.getItem("accessToken");', true)
      .then((result) => {
        if (result) {
          console.log(
            "*** Found token from MAIN",
            JSON.parse(result).access_token
          );
          clearTimeout(tokenTimeout);
          store.set("access_token", JSON.parse(result));
          resolve(JSON.parse(result));
        }
      });
  });

  // Initialize electron-push-receiver component. Should be called before 'did-finish-load'
  setupPushReceiver(mainWindow.webContents);

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  // Build menu
  buildMenu();

  // Emitted when the window is closed.
  mainWindow.on("closed", function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
};

function loadMainDocument() {
  store.get("giosg-mode") === "desktop"
    ? mainWindow.loadFile("index.html")
    : loadWebUrl("/bar");
}

function loadWebUrl(urlPath) {
  const url = BASE_URL + urlPath;
  mainWindow.loadURL(url, {
    userAgent: `${mainWindow.webContents.getUserAgent()} ${USER_AGENT_POSTFIX}`,
  });
}

function toggleMode(overridenMode) {
  const mode = overridenMode
    ? overridenMode
    : store.get("giosg-mode") === "desktop"
    ? "mobile"
    : "desktop";
  store.set("giosg-mode", mode);
}

function toggleNotifications() {
  const key = "notifications-enabled";
  store.set(key, !store.get(key));
}

function toggleOpenConvesationOnNotificationClick() {
  const key = "open-conversation-on-notification-click";
  store.set(key, !store.get(key));
}

// This needs to be set so that we can read access token from frame
app.commandLine.appendSwitch("disable-site-isolation-trials");

app.whenReady().then(() => {
  console.log("** App ready");
  createWindow();
  setupNotifications();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  // Example: if (process.platform !== "darwin") { ...
  // We however quit when the app window closes
  app.quit();
});

function showWelcomeNotification() {
  if (!NOTIFICATIONS_INITIALIZED) {
    new Notification({
      title: "Welcome to Snack Bar!",
      body: "Notifications enabled and working! 😎",
      icon: path.join(__dirname, "snack_bar.png"),
    }).show();
  }
  NOTIFICATIONS_INITIALIZED = true;
}

function setupNotifications() {
  // Main process
  ipcMain.handle("notifications-started", async (event, token) => {
    const accessToken = await waitForAccessToken;
    console.log("Got access token, ", accessToken);
    console.log(".-.------ Main process received FCM token", token);
    const SUBSCRIPTION_ID_KEY = "fcm_subscription_id";
    const subscription_id = store.get(SUBSCRIPTION_ID_KEY);
    console.log("**** Existing FCM subscription ID", subscription_id);
    const hasSubscription = !!subscription_id;
    const baseUrl =
      "https://service.giosg.com/api/notifications/v1/fcm_subscriptions/";
    url = hasSubscription ? `${baseUrl}${subscription_id}` : baseUrl;

    const payload = {
      registration_id: token,
      enabled: true,
      subscribed_events: ["pending_chat", "operator_chat", "new_message"],
    };
    fetch(url, {
      method: hasSubscription ? "PUT" : "POST",
      body: JSON.stringify(payload),
      headers: {
        Authorization: `Bearer ${accessToken.access_token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.text())
      .then((text) => {
        console.log("PUSH subscription response: ", text);
        const responseData = JSON.parse(text);
        showWelcomeNotification();
        console.log("---------", responseData.subscription_id);
        store.set(SUBSCRIPTION_ID_KEY, responseData.subscription_id);
      });
    return token;
  });

  ipcMain.handle("on-notification-click", async (event, payloadStr) => {
    const payload = JSON.parse(payloadStr);
    console.log("Ä***************ON MAIN", typeof payload, payload);

    // Force mobile mode to open specific channel when notification has been clicked.
    // This is because embedded cant be commanded to open new panel at the momen
    if (store.get("open-conversation-on-notification-click") === true) {
      toggleMode("mobile");
      loadWebUrl(payload.data.default_action_path);
    }

    return payload;
  });
}

function buildMenu() {
  const template = [
    {
      role: "appmenu",
    },
    {
      label: "Edit",
      submenu: [
        {
          type: "separator",
        },
        {
          role: "cut",
        },
        {
          role: "copy",
        },
        {
          role: "paste",
        },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Switch Giosg mode (Embedded / Mobile)",
          click: () => {
            toggleMode();
            loadMainDocument();
          },
          accelerator: "CmdOrCtrl+E",
        },
        {
          role: "reload",
        },
        {
          role: "toggledevtools",
        },
        {
          type: "separator",
        },
        {
          role: "resetzoom",
        },
        {
          role: "zoomin",
        },
        {
          role: "zoomout",
        },
        {
          type: "separator",
        },
        {
          role: "togglefullscreen",
        },
      ],
    },
    {
      label: "Notifications",
      submenu: [
        {
          label: "Show notifications",
          type: "checkbox",
          checked: store.get("notifications-enabled"),
          click: () => {
            toggleNotifications();
          },
        },
        {
          label: "Go to conversation on click",
          type: "checkbox",
          checked: store.get("open-conversation-on-notification-click"),
          click: () => {
            toggleOpenConvesationOnNotificationClick();
          },
        },
      ],
    },
    {
      role: "window",
      submenu: [
        {
          role: "minimize",
        },
        {
          role: "close",
        },
      ],
    },
    {
      role: "help",
      submenu: [
        {
          label: "Learn More",
          click: () => {
            commandDir.op;
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
