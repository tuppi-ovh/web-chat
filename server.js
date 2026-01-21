<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>ChatGPT WebApp</title>
<style>
body { font-family: sans-serif; max-width: 600px; margin: auto; }
#chat { border: 1px solid #ccc; padding: 10px; height: 400px; overflow-y: auto; margin-bottom: 10px; }
.user { color: blue; margin: 5px 0; }
.bot { color: green; margin: 5px 0; }
input { width: 80%; padding: 5px; }
button { padding: 5px 10px; }
</style>
</head>
<body>

<h2>ChatGPT WebApp</h2>
<div id="chat"></div>

<input id="input" placeholder="Écris ton message...">
<button onclick="send()">Envoyer</button>
<button onclick="clearChat()">Effacer chat</button>

<script>
const SECRET_TOKEN = process.env.ACCESS_TOKEN;

let chatHistory = JSON.parse(localStorage.getItem("chatHistory")) || [];

function renderChat() {
    const chat = document.getElementById("chat");
    chat.innerHTML = "";
    chatHistory.forEach(msg => {
        const div = document.createElement("div");
        div.className = msg.role;
        div.textContent = msg.role === "user" ? "Moi: " + msg.content : "Bot: " + msg.content;
        chat.appendChild(div);
    });
    chat.scrollTop = chat.scrollHeight;
}

async function send() {
    const input = document.getElementById("input");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";

    chatHistory.push({ role: "user", content: text });
    renderChat();

    try {
        const res = await fetch("https://web-chat-alpha-two.vercel.app", { // remplacer par l'URL de ton backend Vercel
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-secret": SECRET_TOKEN
            },
            body: JSON.stringify({ message: text })
        });

        const data = await res.json();
        chatHistory.push({ role: "assistant", content: data.reply });

        // garder les 50 derniers messages
        if (chatHistory.length > 50) chatHistory = chatHistory.slice(-50);
        localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
        renderChat();
    } catch (err) {
        console.error(err);
        chatHistory.push({ role: "assistant", content: "Erreur réseau / serveur" });
        renderChat();
    }
}

function clearChat() {
    chatHistory = [];
    localStorage.removeItem("chatHistory");
    renderChat();
}

// Initialisation
renderChat();
</script>

</body>
</html>
