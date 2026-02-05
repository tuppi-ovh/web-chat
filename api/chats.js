import crypto from "crypto";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const BACKEND_VERSION = "v1-ovh-object-storage-sync";

function getS3() {
  return new S3Client({
    region: process.env.OVH_S3_REGION || "rbx",
    endpoint: process.env.OVH_S3_ENDPOINT || "https://s3.rbx.io.cloud.ovh.net",
    credentials: {
      accessKeyId: process.env.OVH_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.OVH_S3_SECRET_ACCESS_KEY,
    },
    // OVH S3: path-style est souvent le plus compatible
    forcePathStyle: true,
  });
}

function tokenToKey(token) {
  // Ne jamais utiliser le token brut comme nom de fichier
  const h = crypto.createHash("sha256").update(token).digest("hex");
  return `chats/${h}.json`;
}

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf-8");
}

export default async function handler(req, res) {
  const SECRET_TOKEN = process.env.ACCESS_TOKEN;
  const userToken = req.headers["x-secret"];

  if (!userToken || userToken !== SECRET_TOKEN) {
    return res.status(403).json({ error: "Token invalide" });
  }

  const Bucket = process.env.OVH_S3_BUCKET;
  if (!Bucket) return res.status(500).json({ error: "OVH_S3_BUCKET manquant" });

  const s3 = getS3();
  const Key = tokenToKey(userToken);

  if (req.method === "GET") {
    try {
      const out = await s3.send(new GetObjectCommand({ Bucket, Key }));
      const text = await streamToString(out.Body);
      const json = JSON.parse(text);
      return res.json({ chats: json, backendVersion: BACKEND_VERSION });
    } catch (e) {
      // Si l'objet n'existe pas encore → renvoyer vide
      const msg = String(e?.name || e?.Code || e?.message || e);
      if (msg.includes("NoSuchKey") || msg.includes("NotFound")) {
        return res.json({ chats: null, backendVersion: BACKEND_VERSION });
      }
      return res.status(500).json({ error: "S3 read error", details: msg });
    }
  }

  if (req.method === "PUT") {
    try {
      const { chats, updatedAt } = req.body || {};
      if (!Array.isArray(chats)) {
        return res.status(400).json({ error: "`chats` doit être un tableau" });
      }

      const payload = JSON.stringify(
        { chats, updatedAt: updatedAt || Date.now() },
        null,
        0
      );

      await s3.send(
        new PutObjectCommand({
          Bucket,
          Key,
          Body: payload,
          ContentType: "application/json; charset=utf-8",
          // Optionnel: éviter le cache intermédiaire
          CacheControl: "no-store",
        })
      );

      return res.json({ ok: true, backendVersion: BACKEND_VERSION });
    } catch (e) {
      return res.status(500).json({ error: "S3 write error", details: String(e?.message || e) });
    }
  }

  return res.status(405).json({ error: "GET/PUT only" });
}