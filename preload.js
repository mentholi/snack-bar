const { ipcRenderer } = require("electron");
const path = require("path");
const Store = require("electron-store");

const {
  START_NOTIFICATION_SERVICE,
  NOTIFICATION_SERVICE_STARTED,
  NOTIFICATION_SERVICE_ERROR,
  NOTIFICATION_RECEIVED,
  TOKEN_UPDATED,
} = require("electron-push-receiver/src/constants");

console.log("*** PRELOAD");

const store = new Store();

ipcRenderer.on(NOTIFICATION_SERVICE_STARTED, (_, token) => {
  console.log("*******service successfully started", token);
  ipcRenderer.invoke("notifications-started", token).then((result) => {
    console.log("Sent to main", result);
  });
});

// Handle notification errors
ipcRenderer.on(NOTIFICATION_SERVICE_ERROR, (_, error) => {
  console.log("*******notification error", error);
});

// Send FCM token to backend
ipcRenderer.on(TOKEN_UPDATED, (_, token) => {
  console.log("*******token updated", token);
});

// Display notification
ipcRenderer.on(NOTIFICATION_RECEIVED, (_, serverNotificationPayload) => {
  console.log("***** NOTIFICATION_RECEIVED");
  // check to see if payload contains a body string, if it doesn't consider it a silent push
  if (serverNotificationPayload.notification.body) {
    const currentPath = window.document.location.pathname;

    // Skip if notifications are muted
    const isNotificationsEnabled = store.get("notifications-enabled");

    // Skip showing notification if app is visible
    const isDesktopModeAndVisible =
      store.get("giosg-mode") === "desktop" &&
      window.document.visibilityState === "visible";

    // Skip if mobile view and we are in correct view
    const isMobileModeAndVisible =
      store.get("giosg-mode") === "mobile" &&
      window.document.visibilityState === "visible" &&
      currentPath === serverNotificationPayload.data.default_action_path;

    // Logging here for debug purposes, this is useless otherwise
    if (!isNotificationsEnabled) {
      console.log("** Skipped showing notification as they are muted");
      return;
    } else if (isDesktopModeAndVisible) {
      console.log(
        "** Skipped showing notification as the app is visible on desktop mode"
      );
      return;
    } else if (isMobileModeAndVisible) {
      console.log(
        "** Skipped showing notification as the app is visible on mobile mode and channel is correct"
      );
      return;
    }

    const playSound =
      store.get("notifications-sounds") === "always" ||
      (store.get("notifications-sounds") === "mentions" &&
        isMention(serverNotificationPayload.notification.body));

    let myNotification = new Notification(
      serverNotificationPayload.notification.title,
      {
        body: serverNotificationPayload.notification.body,
        icon: path.join(__dirname, "snack_bar.png"),
        silent: !playSound,
      }
    );
    const payload = JSON.stringify(serverNotificationPayload);
    ipcRenderer.invoke("on-notification-showing", payload);

    myNotification.onclick = () => {
      const isCorrectPath =
        window.document.location.pathname ===
        serverNotificationPayload.data.default_action_path;
      console.log("******* Notification clicked", payload);
      // No need to reload view if we are on right place
      if (!isCorrectPath) {
        ipcRenderer.invoke("on-notification-click", payload);
      }
    };
  } else {
    // payload has no body, so consider it silent (and just consider the data portion)
    console.log(
      "*******do something with the key/value pairs in the data",
      serverNotificationPayload.data
    );
  }
});

function isMention(message) {
  const myFirstName = "@" + store.get("my-firstname");
  const myFullName = store.get("my-fullname");
  return (
    message.toLowerCase().indexOf(myFirstName.toLowerCase()) > -1 ||
    message.toLowerCase().indexOf(myFullName.toLowerCase()) > -1
  );
}

// Start service
const senderId = "456502178225"; // <-- replace with FCM sender ID from FCM web admin under Settings->Cloud Messaging
console.log("*******starting service and registering a client");
ipcRenderer.send(START_NOTIFICATION_SERVICE, senderId);
