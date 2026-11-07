export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const SECRET_TOKEN = process.env.ACCESS_TOKEN;
  const OPENAI_KEY = process.env.OPENAI_KEY;
  const userToken = req.headers["x-secret"];
  if (!userToken || userToken !== SECRET_TOKEN) return res.status(403).json({ error: "Token invalide" });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt manquant" });

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt,
        n: 1,
        size: "512x512",
        response_format: "b64_json"
      })
    });

    const data = await response.json();
    if (!data?.data?.[0]?.b64_json)
      return res.status(500).json({ error: "Erreur API image", details: data });

    res.json({ imageBase64: data.data[0].b64_json });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
}
