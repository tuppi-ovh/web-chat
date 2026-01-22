// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

// ===== VERSION =====
const BACKEND_VERSION = "v1.3.0-debug";

// ===== CONFIG =====
const SYSTEM_PROMPT = `
Tu es ChatGPT, un assistant expert, rigoureux, pédagogue et précis.
Tu adaptes ton niveau à l’utilisateur, tu donnes des explications structurées,
des exemples concrets et tu vérifies la cohérence avant de répondre.
`;

const SECRET_TOKEN = process.env.ACCESS_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;

let chatHistory = [];

// ===== LOG AU DEMARRAGE =====
console.log("=== BACKEND START ===");
console.log("Version :", BACKEND_VERSION);
console.log("ACCESS_TOKEN défini :", !!SECRET_TOKEN);
console.log("OPENAI_KEY défini   :", !!OPENAI_KEY);
console.log("=====================");

// ===== ENDPOINT CHAT =====
app.post("/chat", async (req, res) => {
  console.log("\n--- /chat ---");

  const userToken = req.headers["x-secret"];

  if (!userToken) {
    console.error("❌ Token manquant");
    return res.status(401).json({ error: "Token manquant" });
  }

  if (userToken !== SECRET_TOKEN) {
    console.error("❌ Token invalide :", userToken);
    return res.status(403).json({ error: "Token invalide" });
  }

  if (!OPENAI_KEY) {
    console.error("❌ OPENAI_KEY non définie");
    return res.status(500).json({ error: "OPENAI_KEY non définie" });
  }

  const userMessage = req.body.message;
  if (!userMessage) {
    console.error("❌ Message manquant");
    return res.status(400).json({ error: "Message manquant" });
  }

  console.log("Message utilisateur :", userMessage);

  chatHistory.push({ role: "user", content: userMessage });
  if (chatHistory.length > 50) chatHistory = chatHistory.slice(-50);

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...chatHistory
  ];

  try {
    console.log("➡️ Appel OpenAI...");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5.2",
        messages
      })
    });

    console.log("Statut OpenAI :", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Erreur OpenAI :", data);
      return res.status(500).json({
        error: "Erreur OpenAI",
        details: data,
        backendVersion: BACKEND_VERSION
      });
    }

    const reply = data.choices[0].message.content;
    console.log("Réponse OpenAI :", reply);

    chatHistory.push({ role: "assistant", content: reply });
    if (chatHistory.length > 50) chatHistory = chatHistory.slice(-50);

    res.json({
      reply,
      backendVersion: BACKEND_VERSION
    });

  } catch (err) {
    console.error("❌ Exception serveur :", err);
    res.status(500).json({
      error: "Exception serveur",
      details: err.message,
      backendVersion: BACKEND_VERSION
    });
  }
});

app.listen(3000, () => {
  console.log("Backend démarré sur http://localhost:3000");
});