import crypto from "node:crypto";

// AES-256-GCM com chave do servidor (AI_ENC_KEY, 64 hex = 32 bytes). Server-only.
function key() {
  const k = process.env.AI_ENC_KEY;
  if (!k || k.length !== 64) throw new Error("AI_ENC_KEY ausente/!=32 bytes");
  return Buffer.from(k, "hex");
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

export function decrypt(blob: string): string {
  const [ivb, tagb, encb] = blob.split(".");
  const d = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivb, "base64"));
  d.setAuthTag(Buffer.from(tagb, "base64"));
  return Buffer.concat([d.update(Buffer.from(encb, "base64")), d.final()]).toString("utf8");
}
