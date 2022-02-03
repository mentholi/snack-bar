const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  MenuItem,
  Notification,
} = require("electron");
const { setup: setupPushReceiver } = require("electron-push-receiver");
const Store = require("electron-store");
const fetch = require("electron-fetch").default;
const path = require("path");

const INITIAL_WINDOW_SIZE = {
  width: 1100,
  height: 700,
};

let CURRENT_MODE = "desktop"; // "mobile"

const USER_AGENT_POSTFIX = "Android/Look-a-like";

let waitForAccessToken;
const store = new Store();

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
  CURRENT_MODE === "desktop"
    ? mainWindow.loadFile("index.html")
    : mainWindow.loadURL("https://service.giosg.com/bar", {
        userAgent: `${mainWindow.webContents.getUserAgent()} ${USER_AGENT_POSTFIX}`,
      });
}

function toggleMode() {
  CURRENT_MODE = CURRENT_MODE === "desktop" ? "mobile" : "desktop";
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
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function showWelcomeNotification() {
  new Notification({
    title: "Welcome to Snack Bar!",
    body: "Notifications enabled and working! 😎",
    icon: path.join(__dirname, "snack_bar.png"),
  }).show();
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
}

/**
{"subscription_id":"b9c63823-c5cb-4ecd-a3aa-8b1282e2f063","subscribed_events":["Pending chat","Operator chat","New message"],"subscription_name":"<Device name>","enabled":true,"user_id":"7f9d2c80-4b1c-11e1-a687-00163e0c01f2","organization_id":"a17cea80-e397-11e0-b51a-00163e0c01f2","created_at":"2022-02-03T13:23:38.220434Z","registration_id":"fcPYwHufiZo:APA91bEf3CYnQtKB8Kronow0iXtqZfe8jAjUFoVMpunVvHhuc37pgvxHeWvOzTt9NV5GbBighWz1ycql1pAiN5gRaX0wV4XBvfWiSRTHlPTH4GNlITU9MUs_zSo_PzM48JTF-_VqApUH"}


 */

function buildMenu() {
  console.log(Menu.getApplicationMenu());
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
