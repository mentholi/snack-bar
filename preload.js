const { ipcRenderer } = require("electron");
const path = require("path");

const {
  START_NOTIFICATION_SERVICE,
  NOTIFICATION_SERVICE_STARTED,
  NOTIFICATION_SERVICE_ERROR,
  NOTIFICATION_RECEIVED,
  TOKEN_UPDATED,
} = require("electron-push-receiver/src/constants");

console.log("*** PRELOAD");

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
  console.log("*************** NOTIFICATION_RECEIVED");
  // check to see if payload contains a body string, if it doesn't consider it a silent push
  if (serverNotificationPayload.notification.body) {
    // payload has a body, so show it to the user
    console.log(
      "******* Display notification",
      JSON.stringify(serverNotificationPayload)
    );
    let myNotification = new Notification(
      serverNotificationPayload.notification.title,
      {
        body: serverNotificationPayload.notification.body,
        icon: path.join(__dirname, "snack_bar.png"),
      }
    );

    myNotification.onclick = () => {
      console.log(
        "******* Notification clicked",
        JSON.stringify(serverNotificationPayload)
      );
    };
  } else {
    // payload has no body, so consider it silent (and just consider the data portion)
    console.log(
      "*******do something with the key/value pairs in the data",
      serverNotificationPayload.data
    );
  }
});

// Start service
const senderId = "456502178225"; // <-- replace with FCM sender ID from FCM web admin under Settings->Cloud Messaging
console.log("*******starting service and registering a client");
ipcRenderer.send(START_NOTIFICATION_SERVICE, senderId);
