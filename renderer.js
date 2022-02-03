// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
console.log("------------ RENDERER");
// const NOTIFICATION_TITLE = "Title";
// const NOTIFICATION_BODY =
//   "Notification from the Renderer process. Click to log to console.";
// const CLICK_MESSAGE = "Notification clicked!";

// new Notification(NOTIFICATION_TITLE, { body: NOTIFICATION_BODY }).onclick =
//   () => (document.getElementById("output").innerText = CLICK_MESSAGE);

/*
// Listen for service successfully started
window.ipcRenderer.on(
  window.pushConstants.NOTIFICATION_SERVICE_STARTED,
  (_, token) => {
    console.log("*******service successfully started", token);
  }
);

// Handle notification errors
window.ipcRenderer.on(
  window.pushConstants.NOTIFICATION_SERVICE_ERROR,
  (_, error) => {
    console.log("*******notification error", error);
  }
);

// Send FCM token to backend
window.ipcRenderer.on(window.pushConstants.TOKEN_UPDATED, (_, token) => {
  console.log("*******token updated", token);
});

// Display notification
window.ipcRenderer.on(
  window.pushConstants.NOTIFICATION_RECEIVED,
  (_, serverNotificationPayload) => {
    // check to see if payload contains a body string, if it doesn't consider it a silent push
    if (serverNotificationPayload.notification.body) {
      // payload has a body, so show it to the user
      console.log("*******display notification", serverNotificationPayload);
      let myNotification = new Notification(
        serverNotificationPayload.notification.title,
        {
          body: serverNotificationPayload.notification.body,
        }
      );

      myNotification.onclick = () => {
        console.log("*******Notification clicked");
      };
    } else {
      // payload has no body, so consider it silent (and just consider the data portion)
      console.log(
        "*******do something with the key/value pairs in the data",
        serverNotificationPayload.data
      );
    }
  }
);

// Start service
const senderId = "614732670654"; // <-- replace with FCM sender ID from FCM web admin under Settings->Cloud Messaging
console.log("*******starting service and registering a client");
window.ipcRenderer.send(
  window.pushConstants.START_NOTIFICATION_SERVICE,
  senderId
);
*/
