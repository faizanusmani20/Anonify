// ✅ FINAL app.js (Anonify with stylish toggle for notifications)

const firebaseConfig = {
  apiKey: "AIzaSyA9oBMvCQkU7415jC-uNu572M8NP4Oui04",
  authDomain: "kamuszone.firebaseapp.com",
  projectId: "kamuszone",
  storageBucket: "kamuszone.firebasestorage.app",
  messagingSenderId: "1028974184914",
  appId: "1:1028974184914:web:123bdcdf5210c3b350600b",
  measurementId: "G-KWQKMT1XZ7"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let user = "";
let roomId = "";
let typingTimeout = null;
window.allowNotifications = false;

firebase.auth().signInAnonymously().catch(error => {
  console.error("Auth error:", error);
});

function joinRoom() {
  const nameInput = document.getElementById("nameInput").value.trim();
  const roomInput = document.getElementById("roomInput").value.trim();

  if (!nameInput || !roomInput) {
    return alert("Enter name and room ID");
  }

  user = nameInput;
  roomId = roomInput;

  document.getElementById("login-screen").style.display = "none";
  document.getElementById("chat-screen").style.display = "block";

  document.getElementById("room-title").textContent = `Room: ${roomId}`;
  document.getElementById("username").value = user;

  document.getElementById("message").disabled = false;
  document.querySelector(".message-input button").disabled = false;
  document.getElementById("username").disabled = true;
  document.querySelector(".username button").disabled = true;

  // Init toggle state
  const notifBtn = document.getElementById("notif-btn");
  notifBtn.classList.remove("enabled", "disabled");
  notifBtn.classList.add("disabled");
  window.allowNotifications = false;

  listenForMessages();
  listenForTyping();
  trackPresence();
  listenForUsers();
}

function toggleNotification() {
  const btn = document.getElementById("notif-btn");
  if (!window.allowNotifications) {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        window.allowNotifications = true;
        btn.classList.remove("disabled");
        btn.classList.add("enabled");
        btn.textContent = "🔔 Notifications: On";
      } else {
        alert("Notifications blocked by browser.");
      }
    });
  } else {
    window.allowNotifications = false;
    btn.classList.remove("enabled");
    btn.classList.add("disabled");
    btn.textContent = "🔕 Notifications: Off";
  }
}

function startChat() {
  const input = document.getElementById('username');
  user = input.value.trim() || "Anonymous";
  input.disabled = true;
  document.getElementById('message').disabled = false;
  document.querySelector('.message-input button').disabled = false;
  document.querySelector(".username button").disabled = true;
}

function sendMessage() {
  const msgInput = document.getElementById("message");
  const text = msgInput.value.trim();
  if (!text || !roomId) return;

  const messageData = {
    name: user,
    message: text,
    time: Date.now(),
    status: "sent"
  };

  db.collection("rooms").doc(roomId).collection("messages")
    .add(messageData)
    .catch(() => {
      messageData.status = "failed";
      displayMessage(messageData);
    });

  msgInput.value = "";
  stopTyping();
}

function listenForMessages() {
  db.collection("rooms").doc(roomId).collection("messages").orderBy("time")
    .onSnapshot(snapshot => {
      const chatBox = document.getElementById("chat-box");
      chatBox.innerHTML = "";

      snapshot.forEach(doc => {
        const data = doc.data();
        const docId = doc.id;

        if (!window.keepChat && Date.now() - data.time > 20000) {
          db.collection("rooms").doc(roomId).collection("messages").doc(docId).delete();
          return;
        }

        if (data.name !== user && data.status !== "seen") {
          db.collection("rooms").doc(roomId).collection("messages").doc(docId).update({
            status: "seen"
          });
        }

        function handleNotificationSwitch() {
  const isChecked = document.getElementById("notifToggleSwitch").checked;
  window.allowNotifications = isChecked;

  if (isChecked && Notification.permission !== "granted") {
    Notification.requestPermission().then(permission => {
      if (permission !== "granted") {
        alert("Notifications are blocked.");
        document.getElementById("notifToggleSwitch").checked = false;
        window.allowNotifications = false;
      }
    });
  }
}


        displayMessage(data);

        if (
          window.allowNotifications &&
          Notification.permission === "granted" &&
          data.name !== user &&
          document.hidden
        ) {
          new Notification("Anonify", {
            body: `${data.name}: ${data.message}`,
            icon: "moon.png"
          });
        }
      });

      chatBox.scrollTop = chatBox.scrollHeight;
    });
}

function displayMessage(data) {
  const div = document.createElement("div");
  const isOwnMessage = data.name === user;

  div.className = "message " + (isOwnMessage ? "own" : "other");

  const time = new Date(data.time);
  const hours = time.getHours() % 12 || 12;
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const ampm = time.getHours() >= 12 ? 'PM' : 'AM';
  const formattedTime = `${hours}:${minutes} ${ampm}`;

  let statusEmoji = "";
  if (isOwnMessage) {
    if (data.status === "seen") statusEmoji = "✔️";
    else if (data.status === "failed") statusEmoji = "❌";
    else statusEmoji = "✓";
  }

  div.innerHTML = `
    <div><strong>${data.name}</strong>: ${data.message} ${statusEmoji}</div>
    <div class="timestamp">${formattedTime}</div>
  `;

  const chatBox = document.getElementById("chat-box");
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function showTyping() {
  if (!roomId) return;
  db.collection("rooms").doc(roomId).collection("typing").doc("status").set({ name: user });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(stopTyping, 2000);
}

function stopTyping() {
  if (!roomId) return;
  db.collection("rooms").doc(roomId).collection("typing").doc("status").delete();
}

function listenForTyping() {
  db.collection("rooms").doc(roomId).collection("typing").doc("status")
    .onSnapshot(doc => {
      const typing = document.getElementById("typing-indicator");
      if (doc.exists && doc.data().name !== user) typing.classList.remove("hidden");
      else typing.classList.add("hidden");
    });
}

function toggleMode() {
  document.body.classList.toggle("dark-mode");
  const icon = document.getElementById("theme-icon");
  icon.src = document.body.classList.contains("dark-mode") ? "sun.png" : "moon.png";
}

function trackPresence() {
  const userRef = db.collection("rooms").doc(roomId).collection("users").doc(user);
  userRef.set({ lastSeen: Date.now() });
  setInterval(() => userRef.set({ lastSeen: Date.now() }), 5000);
  window.addEventListener("beforeunload", () => userRef.delete());
}

function listenForUsers() {
  const userList = document.getElementById("user-list");
  setInterval(() => {
    const now = Date.now();
    db.collection("rooms").doc(roomId).collection("users").get().then(snapshot => {
      const activeUsers = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (now - data.lastSeen <= 10000) activeUsers.push(doc.id);
      });
      userList.innerText = activeUsers.length > 0
        ? `👥 In Room: ${activeUsers.join(", ")}`
        : "No one else is here.";
    });
  }, 5000);
}
function clearChat() {
  if (!roomId) return;

  const chatRef = db.collection("rooms").doc(roomId).collection("messages");

  // Get all messages in this room
  chatRef.get().then(snapshot => {
    const batch = db.batch();
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Commit batch deletion
    return batch.commit().then(() => {
      document.getElementById("chat-box").innerHTML = '';
    });
  }).catch(error => {
    console.error("Failed to clear chat:", error);
  });
}
