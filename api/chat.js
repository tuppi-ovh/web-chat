const BACKEND_VERSION = "v3.1.1-vision-fixed";

const SYSTEM_PROMPT = `
Tu es ChatGPT, un assistant expert, rigoureux, pédagogue et précis.
Tu adaptes ton niveau à l’utilisateur.
Tu formates toujours en Markdown.
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

  let userContent = [{ type: "text", text: message }];

  if (imageBase64) {
    userContent.push({
      type: "image_url",
      image_url: {
        url: "data:image/png;base64," + imageBase64
      }
    });
  }

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: userContent }
  ];

  try {
    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-5.2",   // modèle vision le + sûr
          messages
        })
      }
    );

    const data = await response.json();
    console.log("OpenAI raw:", data);

    if (!response.ok) {
      return res.status(500).json({
        error: "OpenAI error",
        details: data
      });
    }

    const reply = data.choices[0].message.content;
    res.json({ reply, backendVersion: BACKEND_VERSION });

  } catch (err) {
    res.status(500).json({
      error: "Exception serveur",
      details: err.message
    });
  }
}
