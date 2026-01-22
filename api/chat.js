const BACKEND_VERSION = "v1.6.0-multichat";

const SYSTEM_PROMPT = `
Tu es ChatGPT, un assistant expert, rigoureux, pédagogue et précis.
Tu adaptes ton niveau à l’utilisateur, tu donnes des explications structurées,
des exemples concrets et tu vérifies la cohérence avant de répondre.
**Toutes tes réponses doivent être formatées en Markdown clair.**
`;

let chatHistory = [];

export default async function handler(req, res) {
  console.log("Backend version:", BACKEND_VERSION);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const SECRET_TOKEN = process.env.ACCESS_TOKEN;
  const OPENAI_KEY = process.env.OPENAI_KEY;

  if (!OPENAI_KEY) {
    return res.status(500).json({
      error: "OPENAI_KEY absente",
      backendVersion: BACKEND_VERSION
    });
  }

  const userToken = req.headers["x-secret"];
  if (!userToken || userToken !== SECRET_TOKEN) {
    return res.status(403).json({
      error: "Token invalide",
      backendVersion: BACKEND_VERSION
    });
  }

  const userMessage = req.body.message;
  if (!userMessage) {
    return res.status(400).json({
      error: "Message manquant",
      backendVersion: BACKEND_VERSION
    });
  }

  chatHistory.push({ role: "user", content: userMessage });
  if (chatHistory.length > 50) chatHistory = chatHistory.slice(-50);

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...chatHistory
  ];

  try {
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

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: "Erreur OpenAI",
        details: data,
        backendVersion: BACKEND_VERSION
      });
    }

    const reply = data.choices[0].message.content;
    chatHistory.push({ role: "assistant", content: reply });

    res.json({
      reply,
      backendVersion: BACKEND_VERSION,
      markdown: true
    });

  } catch (err) {
    return res.status(500).json({
      error: "Exception serveur",
      details: err.message,
      backendVersion: BACKEND_VERSION
    });
  }
}
