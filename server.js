// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors()); // autorise ton frontend à appeler ce backend

// Historique stocké en mémoire pour démo (50 derniers messages max)
let chatHistory = [];

const SYSTEM_PROMPT = `
Tu es ChatGPT, un assistant expert, rigoureux, pédagogue et précis.
Tu adaptes ton niveau à l’utilisateur, tu donnes des explications structurées,
des exemples concrets et tu vérifies la cohérence avant de répondre.
`;

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) return res.status(400).json({ error: "Message manquant" });

  // Ajouter message utilisateur
  chatHistory.push({ role: "user", content: userMessage });
  if (chatHistory.length > 50) chatHistory = chatHistory.slice(-50);

  // Construire le tableau complet pour OpenAI
  const messages = [{ role: "system", content: SYSTEM_PROMPT }, ...chatHistory];

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5.2",
        messages
      })
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;

    // Ajouter réponse dans l'historique
    chatHistory.push({ role: "assistant", content: reply });
    if (chatHistory.length > 50) chatHistory = chatHistory.slice(-50);

    res.json({ reply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "Erreur serveur / OpenAI" });
  }
});

app.listen(3000, () => console.log("Backend démarré sur http://localhost:3000"));
