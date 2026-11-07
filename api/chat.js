const BACKEND_VERSION = "v3.2-image-generation";

const SYSTEM_PROMPT = `
Tu es ChatGPT, un assistant expert, rigoureux, pédagogue et précis.
Tu adaptes ton niveau à l’utilisateur.
Tu formates toujours en Markdown.
Ne mets jamais ta réponse dans un bloc de code markdown ; répond en Markdown brut.
`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const SECRET_TOKEN = process.env.ACCESS_TOKEN;
  const OPENAI_KEY = process.env.OPENAI_KEY;

  if (!SECRET_TOKEN || req.headers["x-secret"] !== SECRET_TOKEN) {
    return res.status(403).json({ error: "Token invalide" });
  }

  if (!OPENAI_KEY) {
    return res.status(500).json({ error: "OPENAI_KEY manquant" });
  }

  const {
    history = [],
    message,
    imageBase64,
    imageMimeType = "image/png",
    model = "gpt-5.4"
  } = req.body || {};

  if (!["gpt-5.4", "gpt-image-1.5"].includes(model)) {
    return res.status(400).json({ error: "Modèle non autorisé" });
  }

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Message manquant" });
  }

  if (!Array.isArray(history)) {
    return res.status(400).json({ error: "Historique invalide" });
  }

  try {
    let endpoint;
    let payload;

    if (model === "gpt-image-1.5") {
      // Cette version génère depuis un texte.
      // La modification d'une image utiliserait /images/edits.
      if (imageBase64) {
        return res.status(400).json({
          error: "Retirez l’image jointe pour générer une nouvelle image."
        });
      }

      endpoint = "https://api.openai.com/v1/images/generations";
      payload = {
        model,
        prompt: message,
        n: 1,
        size: "1024x1024",
        quality: "medium",
        output_format: "jpeg",
        output_compression: 80
      };
    } else {
      const userContent = [{ type: "text", text: message }];

      if (imageBase64) {
        userContent.push({
          type: "image_url",
          image_url: {
            url: `data:${imageMimeType};base64,${imageBase64}`
          }
        });
      }

      // Ne transmettre que les champs attendus par l'API.
      const cleanHistory = history
        .filter(m =>
          m &&
          ["user", "assistant"].includes(m.role) &&
          typeof m.content === "string" &&
          m.content.trim()
        )
        .map(m => ({ role: m.role, content: m.content }));

      endpoint = "https://api.openai.com/v1/chat/completions";
      payload = {
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...cleanHistory,
          { role: "user", content: userContent }
        ]
      };
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Erreur OpenAI"
      });
    }

    if (model === "gpt-image-1.5") {
      const base64 = data.data?.[0]?.b64_json;

      if (!base64) {
        throw new Error("Aucune image reçue");
      }

      return res.json({
        reply: "Image générée.",
        image: `data:image/jpeg;base64,${base64}`,
        backendVersion: BACKEND_VERSION
      });
    }

    const reply = data.choices?.[0]?.message?.content;
    if (typeof reply !== "string") {
      throw new Error("Aucune réponse texte reçue");
    }

    return res.json({ reply, backendVersion: BACKEND_VERSION });
  } catch (err) {
    return res.status(500).json({
      error: "Exception serveur",
      details: err.message
    });
  }
}