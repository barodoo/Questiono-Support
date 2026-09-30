export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Pages
      if (path === "/" || path === "/support") {
        return html(SUPPORT_PAGE);
      }

      if (path === "/admin") {
        return html(ADMIN_PAGE);
      }

      // -----------------------------
      // USER: CREATE TICKET
      // -----------------------------
      if (path === "/api/tickets" && request.method === "POST") {
        const body = await request.json();

        const username = String(body.username || "").trim();
        const message = String(body.message || "").trim();

        if (!username || !message) {
          return json({ error: "Username and message are required" }, 400);
        }

        const ticketId =
          Date.now().toString(36) +
          Math.random().toString(36).slice(2, 8);

        const now = new Date().toISOString();

        await env.DB.prepare(
          `INSERT INTO tickets
           (id, username, status, created_at, updated_at)
           VALUES (?, ?, 'open', ?, ?)`
        )
          .bind(ticketId, username, now, now)
          .run();

        await env.DB.prepare(
          `INSERT INTO messages
           (id, ticket_id, sender, message, created_at)
           VALUES (?, ?, ?, ?, ?)`
        )
          .bind(
            crypto.randomUUID(),
            ticketId,
            "user",
            message,
            now
          )
          .run();

        return json({
          success: true,
          ticket: {
            id: ticketId,
            username,
            status: "open",
            created_at: now,
            updated_at: now
          }
        });
      }

      // -----------------------------
      // USER: GET TICKETS
      // -----------------------------
      if (path === "/api/tickets" && request.method === "GET") {
        const username = String(url.searchParams.get("username") || "").trim();

        if (!username) {
          return json({ error: "Username is required" }, 400);
        }

        const result = await env.DB.prepare(
          `SELECT *
           FROM tickets
           WHERE username = ?
           ORDER BY updated_at DESC`
        )
          .bind(username)
          .all();

        return json({
          tickets: result.results || []
        });
      }

      // -----------------------------
      // USER: CLOSE TICKET
      // -----------------------------
      if (
        path.startsWith("/api/tickets/") &&
        path.endsWith("/close") &&
        request.method === "POST"
      ) {
        const parts = path.split("/");
        const ticketId = parts[3];

        if (!ticketId) {
          return json({ error: "Ticket ID is required" }, 400);
        }

        const now = new Date().toISOString();

        await env.DB.prepare(
          `UPDATE tickets
           SET status = 'closed',
               updated_at = ?
           WHERE id = ?`
        )
          .bind(now, ticketId)
          .run();

        return json({
          success: true
        });
      }

      // -----------------------------
      // USER: GET TICKET + MESSAGES
      // -----------------------------
      if (
        path.startsWith("/api/tickets/") &&
        request.method === "GET"
      ) {
        const ticketId = path.split("/")[3];

        const ticket = await env.DB.prepare(
          `SELECT *
           FROM tickets
           WHERE id = ?`
        )
          .bind(ticketId)
          .first();

        if (!ticket) {
          return json({ error: "Ticket not found" }, 404);
        }

        const messages = await env.DB.prepare(
          `SELECT *
           FROM messages
           WHERE ticket_id = ?
           ORDER BY created_at ASC`
        )
          .bind(ticketId)
          .all();

        return json({
          ticket,
          messages: messages.results || []
        });
      }

      // -----------------------------
      // USER: SEND MESSAGE
      // -----------------------------
      if (
        path.startsWith("/api/tickets/") &&
        request.method === "POST"
      ) {
        const ticketId = path.split("/")[3];
        const body = await request.json();

        const message = String(body.message || "").trim();

        if (!message) {
          return json({ error: "Message is required" }, 400);
        }

        const ticket = await env.DB.prepare(
          `SELECT *
           FROM tickets
           WHERE id = ?`
        )
          .bind(ticketId)
          .first();

        if (!ticket) {
          return json({ error: "Ticket not found" }, 404);
        }

        if (ticket.status === "closed") {
          return json({ error: "Ticket is closed" }, 400);
        }

        const now = new Date().toISOString();

        await env.DB.prepare(
          `INSERT INTO messages
           (id, ticket_id, sender, message, created_at)
           VALUES (?, ?, 'user', ?, ?)`
        )
          .bind(
            crypto.randomUUID(),
            ticketId,
            message,
            now
          )
          .run();

        await env.DB.prepare(
          `UPDATE tickets
           SET status = 'open',
               updated_at = ?
           WHERE id = ?`
        )
          .bind(now, ticketId)
          .run();

        return json({
          success: true
        });
      }

      // -----------------------------
      // ADMIN: ALL TICKETS
      // -----------------------------
      if (
        path === "/api/admin/tickets" &&
        request.method === "GET"
      ) {
        const result = await env.DB.prepare(
          `SELECT *
           FROM tickets
           ORDER BY updated_at DESC`
        ).all();

        return json({
          tickets: result.results || []
        });
      }

      // -----------------------------
      // ADMIN: GET TICKET
      // -----------------------------
      if (
        path.startsWith("/api/admin/tickets/") &&
        request.method === "GET"
      ) {
        const ticketId = path.split("/")[4];

        const ticket = await env.DB.prepare(
          `SELECT *
           FROM tickets
           WHERE id = ?`
        )
          .bind(ticketId)
          .first();

        if (!ticket) {
          return json({ error: "Ticket not found" }, 404);
        }

        const messages = await env.DB.prepare(
          `SELECT *
           FROM messages
           WHERE ticket_id = ?
           ORDER BY created_at ASC`
        )
          .bind(ticketId)
          .all();

        return json({
          ticket,
          messages: messages.results || []
        });
      }

      // -----------------------------
      // ADMIN: SEND MESSAGE
      // -----------------------------
      if (
        path.startsWith("/api/admin/tickets/") &&
        request.method === "POST"
      ) {
        const ticketId = path.split("/")[4];
        const body = await request.json();

        const message = String(body.message || "").trim();

        if (!message) {
          return json({ error: "Message is required" }, 400);
        }

        const ticket = await env.DB.prepare(
          `SELECT *
           FROM tickets
           WHERE id = ?`
        )
          .bind(ticketId)
          .first();

        if (!ticket) {
          return json({ error: "Ticket not found" }, 404);
        }

        if (ticket.status === "closed") {
          return json({ error: "Ticket is closed" }, 400);
        }

        const now = new Date().toISOString();

        await env.DB.prepare(
          `INSERT INTO messages
           (id, ticket_id, sender, message, created_at)
           VALUES (?, ?, 'admin', ?, ?)`
        )
          .bind(
            crypto.randomUUID(),
            ticketId,
            message,
            now
          )
          .run();

        await env.DB.prepare(
          `UPDATE tickets
           SET status = 'answered',
               updated_at = ?
           WHERE id = ?`
        )
          .bind(now, ticketId)
          .run();

        return json({
          success: true
        });
      }

      // -----------------------------
      // ADMIN: CLOSE TICKET
      // -----------------------------
      if (
        path.startsWith("/api/admin/close/") &&
        request.method === "POST"
      ) {
        const ticketId = path.split("/")[4];

        const now = new Date().toISOString();

        await env.DB.prepare(
          `UPDATE tickets
           SET status = 'closed',
               updated_at = ?
           WHERE id = ?`
        )
          .bind(now, ticketId)
          .run();

        return json({
          success: true
        });
      }

      return new Response("Not Found", {
        status: 404
      });
    } catch (error) {
      return json(
        {
          error: error.message || "Internal Server Error"
        },
        500
      );
    }
  }
};


// ==========================================
// HELPERS
// ==========================================

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

function html(content) {
  return new Response(content, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8"
    }
  });
}


// ==========================================
// SUPPORT PAGE
// ==========================================

const SUPPORT_PAGE = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Support</title>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #0f1117;
  color: #fff;
}

button,
input,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

#login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-box {
  width: 100%;
  max-width: 420px;
  background: #181b24;
  border: 1px solid #292e3b;
  border-radius: 16px;
  padding: 30px;
}

.login-box h1 {
  margin-top: 0;
}

.login-box input {
  width: 100%;
  padding: 14px;
  border: 1px solid #343a48;
  border-radius: 10px;
  background: #101219;
  color: white;
  outline: none;
  margin: 12px 0;
}

.login-box button {
  width: 100%;
  padding: 13px;
  border: 0;
  border-radius: 10px;
  background: #5865f2;
  color: white;
}

#app {
  display: none;
  height: 100vh;
}

.sidebar {
  width: 300px;
  background: #151821;
  border-right: 1px solid #292e3b;
  display: flex;
  flex-direction: column;
}

.sidebar-top {
  padding: 18px;
  border-bottom: 1px solid #292e3b;
}

.sidebar-top h2 {
  margin: 0 0 5px;
}

.username {
  color: #9299aa;
  font-size: 14px;
}

.sidebar-actions {
  padding: 12px;
}

.new-ticket {
  width: 100%;
  padding: 12px;
  border: 0;
  border-radius: 9px;
  background: #5865f2;
  color: white;
}

.ticket-list {
  flex: 1;
  overflow-y: auto;
}

.ticket {
  padding: 15px;
  border-bottom: 1px solid #252936;
  cursor: pointer;
}

.ticket:hover {
  background: #1d212c;
}

.ticket.active {
  background: #252a38;
}

.ticket-title {
  font-weight: bold;
  margin-bottom: 5px;
}

.ticket-status {
  font-size: 12px;
  color: #9299aa;
}

.logout {
  margin: 12px;
  padding: 10px;
  border: 1px solid #343a48;
  border-radius: 9px;
  background: transparent;
  color: white;
}

.chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-header {
  height: 70px;
  padding: 15px 20px;
  border-bottom: 1px solid #292e3b;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chat-title {
  font-weight: bold;
}

.close-ticket {
  border: 1px solid #843838;
  background: #351b1b;
  color: #ff9d9d;
  padding: 9px 13px;
  border-radius: 8px;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.message {
  max-width: 75%;
  margin-bottom: 14px;
  padding: 11px 14px;
  border-radius: 12px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

.message.user {
  margin-left: auto;
  background: #5865f2;
}

.message.admin {
  margin-right: auto;
  background: #252a36;
}

.message-info {
  font-size: 11px;
  opacity: .65;
  margin-bottom: 4px;
}

.composer {
  display: flex;
  gap: 10px;
  padding: 15px;
  border-top: 1px solid #292e3b;
}

.composer textarea {
  flex: 1;
  resize: none;
  min-height: 45px;
  max-height: 140px;
  padding: 12px;
  border: 1px solid #343a48;
  border-radius: 10px;
  background: #11141b;
  color: white;
  outline: none;
}

.composer button {
  width: 90px;
  border: 0;
  border-radius: 10px;
  background: #5865f2;
  color: white;
}

.empty {
  color: #777f91;
  text-align: center;
  padding: 40px;
}

.modal {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.65);
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-box {
  width: 100%;
  max-width: 500px;
  background: #181b24;
  border: 1px solid #292e3b;
  border-radius: 15px;
  padding: 22px;
}

.modal textarea {
  width: 100%;
  min-height: 130px;
  resize: vertical;
  background: #101219;
  color: white;
  border: 1px solid #343a48;
  border-radius: 10px;
  padding: 12px;
  margin: 12px 0;
}

.modal-actions {
  display: flex;
  gap: 10px;
}

.modal-actions button {
  flex: 1;
  padding: 11px;
  border-radius: 9px;
  border: 0;
}

.create {
  background: #5865f2;
  color: white;
}

.cancel {
  background: #292e38;
  color: white;
}

.closed {
  padding: 15px;
  text-align: center;
  color: #9299aa;
  border-top: 1px solid #292e3b;
}

@media(max-width:700px) {
  .sidebar {
    width: 220px;
  }

  .message {
    max-width: 90%;
  }
}
</style>
</head>

<body>

<div id="login">
  <div class="login-box">
    <h1>Support</h1>
    <p>Sign in with your username.</p>

    <input
      id="usernameInput"
      type="text"
      placeholder="Username"
      maxlength="50"
    >

    <button id="loginButton">Sign In</button>
  </div>
</div>

<div id="app">

  <aside class="sidebar">

    <div class="sidebar-top">
      <h2>Support</h2>
      <div class="username" id="currentUsername"></div>
    </div>

    <div class="sidebar-actions">
      <button class="new-ticket" id="newTicketButton">
        + New Ticket
      </button>
    </div>

    <div class="ticket-list" id="ticketList"></div>

    <button class="logout" id="logoutButton">
      Sign Out
    </button>

  </aside>

  <main class="chat">

    <div class="chat-header">
      <div class="chat-title" id="chatTitle">
        Select a ticket
      </div>

      <button
        class="close-ticket"
        id="closeTicketButton"
        style="display:none"
      >
        Close Ticket
      </button>
    </div>

    <div class="messages" id="messages">
      <div class="empty">
        Select a ticket to start.
      </div>
    </div>

    <div class="composer" id="composer" style="display:none">
      <textarea
        id="messageInput"
        placeholder="Write a message..."
      ></textarea>

      <button id="sendButton">
        Send
      </button>
    </div>

  </main>
</div>


<div class="modal" id="newTicketModal">

  <div class="modal-box">

    <h2>New Ticket</h2>

    <textarea
      id="newTicketMessage"
      placeholder="Describe your problem..."
    ></textarea>

    <div class="modal-actions">

      <button class="cancel" id="cancelModal">
        Cancel
      </button>

      <button class="create" id="createTicketButton">
        Create
      </button>

    </div>

  </div>

</div>


<script>
var username = "";
var currentTicket = null;
var refreshTimer = null;

var login = document.getElementById("login");
var app = document.getElementById("app");

var usernameInput = document.getElementById("usernameInput");
var currentUsername = document.getElementById("currentUsername");

var ticketList = document.getElementById("ticketList");
var messages = document.getElementById("messages");

var chatTitle = document.getElementById("chatTitle");
var composer = document.getElementById("composer");
var messageInput = document.getElementById("messageInput");

var closeTicketButton =
  document.getElementById("closeTicketButton");

var newTicketModal =
  document.getElementById("newTicketModal");

var newTicketMessage =
  document.getElementById("newTicketMessage");


function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function formatDate(value) {
  try {
    return new Date(value).toLocaleString();
  } catch (e) {
    return value;
  }
}


function showApp() {
  login.style.display = "none";
  app.style.display = "flex";

  currentUsername.textContent = username;

  loadTickets();

  if (!refreshTimer) {
    refreshTimer = setInterval(function() {
      loadTickets(true);
    }, 3000);
  }
}


function signIn() {
  var value = usernameInput.value.trim();

  if (!value) {
    alert("Enter a username.");
    return;
  }

  username = value;

  localStorage.setItem(
    "support_username",
    username
  );

  showApp();
}


function signOut() {
  localStorage.removeItem("support_username");

  username = "";
  currentTicket = null;

  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  app.style.display = "none";
  login.style.display = "flex";

  usernameInput.value = "";
}


async function loadTickets(silent) {
  if (!username) return;

  try {
    var response = await fetch(
      "/api/tickets?username=" +
      encodeURIComponent(username)
    );

    var data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to load tickets");
    }

    renderTickets(data.tickets || []);

    if (
      currentTicket &&
      (data.tickets || []).some(function(t) {
        return t.id === currentTicket;
      })
    ) {
      if (silent) {
        loadTicket(currentTicket, true);
      }
    } else if (!currentTicket && data.tickets.length > 0) {
      openTicket(data.tickets[0].id);
    }

  } catch (error) {
    console.error(error);
  }
}


function renderTickets(tickets) {
  if (!tickets.length) {
    ticketList.innerHTML =
      '<div class="empty">No tickets yet.</div>';
    return;
  }

  ticketList.innerHTML = tickets.map(function(ticket) {

    var active =
      ticket.id === currentTicket
        ? " active"
        : "";

    return (
      '<div class="ticket' +
      active +
      '" data-ticket-id="' +
      escapeHtml(ticket.id) +
      '">' +

        '<div class="ticket-title">' +
          escapeHtml(ticket.id) +
        '</div>' +

        '<div class="ticket-status">' +
          escapeHtml(ticket.status) +
        '</div>' +

      '</div>'
    );

  }).join("");

  var elements =
    ticketList.querySelectorAll(".ticket");

  elements.forEach(function(element) {
    element.addEventListener("click", function() {
      openTicket(
        element.getAttribute("data-ticket-id")
      );
    });
  });
}


async function openTicket(ticketId) {
  currentTicket = ticketId;

  renderTicketsFromCurrent();

  await loadTicket(ticketId, false);
}


function renderTicketsFromCurrent() {
  var elements =
    ticketList.querySelectorAll(".ticket");

  elements.forEach(function(element) {
    var id =
      element.getAttribute("data-ticket-id");

    if (id === currentTicket) {
      element.classList.add("active");
    } else {
      element.classList.remove("active");
    }
  });
}


async function loadTicket(ticketId, silent) {
  try {
    var response =
      await fetch("/api/tickets/" + encodeURIComponent(ticketId));

    var data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Ticket not found");
    }

    if (currentTicket !== ticketId) {
      return;
    }

    chatTitle.textContent =
      "Ticket " + data.ticket.id;

    renderMessages(data.messages || []);

    if (data.ticket.status === "closed") {
      composer.style.display = "none";
      closeTicketButton.style.display = "none";

      messages.innerHTML +=
        '<div class="closed">This ticket is closed.</div>';

    } else {
      composer.style.display = "flex";
      closeTicketButton.style.display = "block";
    }

  } catch (error) {
    if (!silent) {
      alert(error.message);
    }
  }
}


function renderMessages(list) {
  if (!list.length) {
    messages.innerHTML =
      '<div class="empty">No messages.</div>';
    return;
  }

  messages.innerHTML = list.map(function(message) {

    return (
      '<div class="message ' +
      escapeHtml(message.sender) +
      '">' +

        '<div class="message-info">' +
          escapeHtml(message.sender) +
          " • " +
          escapeHtml(formatDate(message.created_at)) +
        '</div>' +

        escapeHtml(message.message) +

      '</div>'
    );

  }).join("");

  messages.scrollTop = messages.scrollHeight;
}


async function sendMessage() {
  if (!currentTicket) return;

  var message = messageInput.value.trim();

  if (!message) return;

  messageInput.value = "";

  try {
    var response = await fetch(
      "/api/tickets/" +
      encodeURIComponent(currentTicket),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: message
        })
      }
    );

    var data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to send");
    }

    await loadTicket(currentTicket, false);
    await loadTickets(true);

  } catch (error) {
    alert(error.message);
  }
}


async function closeCurrentTicket() {
  if (!currentTicket) return;

  if (!confirm("Close this ticket?")) {
    return;
  }

  try {
    var response = await fetch(
      "/api/tickets/" +
      encodeURIComponent(currentTicket) +
      "/close",
      {
        method: "POST"
      }
    );

    var data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to close ticket");
    }

    await loadTicket(currentTicket, false);
    await loadTickets(true);

  } catch (error) {
    alert(error.message);
  }
}


function openNewTicket() {
  newTicketMessage.value = "";
  newTicketModal.style.display = "flex";
  newTicketMessage.focus();
}


function closeNewTicket() {
  newTicketModal.style.display = "none";
}


async function createTicket() {
  var message =
    newTicketMessage.value.trim();

  if (!message) {
    alert("Write a message first.");
    return;
  }

  try {
    var response = await fetch(
      "/api/tickets",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: username,
          message: message
        })
      }
    );

    var data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Failed to create ticket"
      );
    }

    closeNewTicket();

    await loadTickets(false);

    if (data.ticket) {
      openTicket(data.ticket.id);
    }

  } catch (error) {
    alert(error.message);
  }
}


document
  .getElementById("loginButton")
  .addEventListener("click", signIn);

usernameInput.addEventListener(
  "keydown",
  function(event) {
    if (event.key === "Enter") {
      signIn();
    }
  }
);


document
  .getElementById("logoutButton")
  .addEventListener("click", signOut);


document
  .getElementById("newTicketButton")
  .addEventListener("click", openNewTicket);


document
  .getElementById("cancelModal")
  .addEventListener("click", closeNewTicket);


document
  .getElementById("createTicketButton")
  .addEventListener("click", createTicket);


document
  .getElementById("sendButton")
  .addEventListener("click", sendMessage);


closeTicketButton.addEventListener(
  "click",
  closeCurrentTicket
);


messageInput.addEventListener(
  "keydown",
  function(event) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  }
);


// Restore username after refresh
window.addEventListener("load", function() {
  var saved =
    localStorage.getItem("support_username");

  if (saved) {
    username = saved;
    showApp();
  }
});
</script>

</body>
</html>
`;


// ==========================================
// ADMIN PAGE
// ==========================================

const ADMIN_PAGE = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Support Admin</title>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #0f1117;
  color: white;
}

button,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

#app {
  height: 100vh;
  display: flex;
}

.sidebar {
  width: 310px;
  background: #151821;
  border-right: 1px solid #292e3b;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #292e3b;
}

.sidebar-header h2 {
  margin: 0;
}

.ticket-list {
  flex: 1;
  overflow-y: auto;
}

.ticket {
  padding: 15px;
  border-bottom: 1px solid #252936;
  cursor: pointer;
}

.ticket:hover {
  background: #1d212c;
}

.ticket.active {
  background: #252a38;
}

.ticket-id {
  font-weight: bold;
}

.ticket-user {
  color: #9ba2b2;
  margin-top: 5px;
}

.ticket-status {
  font-size: 12px;
  color: #777f91;
  margin-top: 5px;
}

.chat {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.header {
  height: 70px;
  padding: 15px 20px;
  border-bottom: 1px solid #292e3b;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-title {
  font-weight: bold;
}

.close {
  background: #351b1b;
  color: #ff9d9d;
  border: 1px solid #843838;
  padding: 9px 13px;
  border-radius: 8px;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.message {
  max-width: 75%;
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  white-space: pre-wrap;
  word-break: break-word;
}

.message.user {
  margin-right: auto;
  background: #252a36;
}

.message.admin {
  margin-left: auto;
  background: #5865f2;
}

.info {
  font-size: 11px;
  opacity: .6;
  margin-bottom: 5px;
}

.composer {
  display: flex;
  gap: 10px;
  padding: 15px;
  border-top: 1px solid #292e3b;
}

.composer textarea {
  flex: 1;
  min-height: 45px;
  max-height: 150px;
  resize: none;
  background: #11141b;
  color: white;
  border: 1px solid #343a48;
  border-radius: 10px;
  padding: 12px;
  outline: none;
}

.composer button {
  width: 90px;
  border: 0;
  border-radius: 10px;
  background: #5865f2;
  color: white;
}

.closed {
  padding: 15px;
  text-align: center;
  color: #9299aa;
  border-top: 1px solid #292e3b;
}

.empty {
  padding: 40px;
  text-align: center;
  color: #777f91;
}

@media(max-width:700px) {
  .sidebar {
    width: 220px;
  }

  .message {
    max-width: 90%;
  }
}
</style>
</head>

<body>

<div id="app">

  <aside class="sidebar">

    <div class="sidebar-header">
      <h2>Support Admin</h2>
    </div>

    <div class="ticket-list" id="ticketList"></div>

  </aside>

  <main class="chat">

    <div class="header">

      <div class="header-title" id="headerTitle">
        Select a ticket
      </div>

      <button
        class="close"
        id="closeButton"
        style="display:none"
      >
        Close Ticket
      </button>

    </div>

    <div class="messages" id="messages">
      <div class="empty">
        Select a ticket.
      </div>
    </div>

    <div
      class="composer"
      id="composer"
      style="display:none"
    >

      <textarea
        id="messageInput"
        placeholder="Reply to user..."
      ></textarea>

      <button id="sendButton">
        Send
      </button>

    </div>

  </main>

</div>


<script>
var currentTicket = null;
var refreshTimer = null;

var ticketList =
  document.getElementById("ticketList");

var messages =
  document.getElementById("messages");

var headerTitle =
  document.getElementById("headerTitle");

var composer =
  document.getElementById("composer");

var messageInput =
  document.getElementById("messageInput");

var closeButton =
  document.getElementById("closeButton");


function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function formatDate(value) {
  try {
    return new Date(value).toLocaleString();
  } catch (e) {
    return value;
  }
}


async function loadTickets() {
  try {
    var response =
      await fetch("/api/admin/tickets");

    var data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Failed to load tickets"
      );
    }

    renderTickets(data.tickets || []);

    if (currentTicket) {
      loadTicket(currentTicket, true);
    }

  } catch (error) {
    console.error(error);
  }
}


function renderTickets(tickets) {
  if (!tickets.length) {
    ticketList.innerHTML =
      '<div class="empty">No tickets.</div>';
    return;
  }

  ticketList.innerHTML =
    tickets.map(function(ticket) {

      var active =
        ticket.id === currentTicket
          ? " active"
          : "";

      return (
        '<div class="ticket' +
        active +
        '" data-id="' +
        escapeHtml(ticket.id) +
        '">' +

          '<div class="ticket-id">' +
            escapeHtml(ticket.id) +
          '</div>' +

          '<div class="ticket-user">' +
            escapeHtml(ticket.username) +
          '</div>' +

          '<div class="ticket-status">' +
            escapeHtml(ticket.status) +
          '</div>' +

        '</div>'
      );

    }).join("");

  var elements =
    ticketList.querySelectorAll(".ticket");

  elements.forEach(function(element) {

    element.addEventListener(
      "click",
      function() {

        openTicket(
          element.getAttribute("data-id")
        );

      }
    );

  });
}


async function openTicket(ticketId) {
  currentTicket = ticketId;

  renderTicketActive();

  await loadTicket(ticketId, false);
}


function renderTicketActive() {
  var elements =
    ticketList.querySelectorAll(".ticket");

  elements.forEach(function(element) {

    if (
      element.getAttribute("data-id") ===
      currentTicket
    ) {
      element.classList.add("active");
    } else {
      element.classList.remove("active");
    }

  });
}


async function loadTicket(ticketId, silent) {
  try {

    var response =
      await fetch(
        "/api/admin/tickets/" +
        encodeURIComponent(ticketId)
      );

    var data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Ticket not found"
      );
    }

    if (currentTicket !== ticketId) {
      return;
    }

    headerTitle.textContent =
      "Ticket " +
      data.ticket.id +
      " • " +
      data.ticket.username;

    renderMessages(data.messages || []);

    if (data.ticket.status === "closed") {

      composer.style.display = "none";
      closeButton.style.display = "none";

      messages.innerHTML +=
        '<div class="closed">This ticket is closed.</div>';

    } else {

      composer.style.display = "flex";
      closeButton.style.display = "block";

    }

  } catch (error) {

    if (!silent) {
      alert(error.message);
    }

  }
}


function renderMessages(list) {

  if (!list.length) {
    messages.innerHTML =
      '<div class="empty">No messages.</div>';
    return;
  }

  messages.innerHTML =
    list.map(function(message) {

      return (
        '<div class="message ' +
        escapeHtml(message.sender) +
        '">' +

          '<div class="info">' +
            escapeHtml(message.sender) +
            " • " +
            escapeHtml(
              formatDate(message.created_at)
            ) +
          '</div>' +

          escapeHtml(message.message) +

        '</div>'
      );

    }).join("");

  messages.scrollTop =
    messages.scrollHeight;
}


async function sendMessage() {

  if (!currentTicket) {
    return;
  }

  var message =
    messageInput.value.trim();

  if (!message) {
    return;
  }

  messageInput.value = "";

  try {

    var response =
      await fetch(
        "/api/admin/tickets/" +
        encodeURIComponent(currentTicket),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: message
          })
        }
      );

    var data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Failed to send"
      );
    }

    await loadTicket(
      currentTicket,
      false
    );

    await loadTickets();

  } catch (error) {
    alert(error.message);
  }
}


async function closeCurrentTicket() {

  if (!currentTicket) {
    return;
  }

  if (!confirm("Close this ticket?")) {
    return;
  }

  try {

    var response =
      await fetch(
        "/api/admin/close/" +
        encodeURIComponent(currentTicket),
        {
          method: "POST"
        }
      );

    var data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Failed to close"
      );
    }

    await loadTicket(
      currentTicket,
      false
    );

    await loadTickets();

  } catch (error) {
    alert(error.message);
  }
}


document
  .getElementById("sendButton")
  .addEventListener(
    "click",
    sendMessage
  );


closeButton.addEventListener(
  "click",
  closeCurrentTicket
);


messageInput.addEventListener(
  "keydown",
  function(event) {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }

  }
);


loadTickets();


refreshTimer =
  setInterval(
    loadTickets,
    3000
  );
</script>

</body>
</html>
`;
