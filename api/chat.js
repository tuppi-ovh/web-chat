const BACKEND_VERSION = "v3.0.0-vision";

const SYSTEM_PROMPT = `
Tu es ChatGPT, un assistant expert, rigoureux, pédagogue et précis.
Tu adaptes ton niveau à l’utilisateur, tu donnes des explications structurées,
des exemples concrets et tu vérifies la cohérence avant de répondre.
Toutes tes réponses doivent être formatées en Markdown clair.
`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const SECRET_TOKEN = process.env.ACCESS_TOKEN;
  const OPENAI_KEY = process.env.OPENAI_KEY;

  const userToken = req.headers["x-secret"];
  if (!userToken || userToken !== SECRET_TOKEN) {
    return res.status(403).json({ error: "Token invalide" });
  }

  const { history, message, imageBase64 } = req.body;

  if (!message || !Array.isArray(history)) {
    return res.status(400).json({ error: "history ou message manquant" });
  }

  let userContent = [{ type: "text", text: message }];

  if (imageBase64) {
    userContent.push({
      type: "image_base64",
      image_base64: imageBase64
    });
  }

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: userContent }
  ].slice(-51);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1",   // modèle vision stable
        messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: "OpenAI error", details: data });
    }

    const reply = data.choices[0].message.content;

    res.json({
      reply,
      backendVersion: BACKEND_VERSION
    });

  } catch (err) {
    res.status(500).json({ error: "Exception serveur", details: err.message });
  }
}
