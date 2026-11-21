// POST /api/patches/redo  { id, play, author, deviceId } → reactivates an undone patch (records who did it;
// undone_by/_at are kept as history of the last undo).
import { ensureSchema, json, badRequest, noDb, readJson, isSlug, isWho } from "../patches.js";

export async function onRequestPost({ request, env }) {
  const missing = noDb(env);
  if (missing) return missing;
  const body = await readJson(request);
  if (typeof body?.id !== "string" || !body.id) return badRequest("id");
  if (!isSlug(body.play)) return badRequest("play");
  if (!isWho(body)) return badRequest("author/deviceId");
  await ensureSchema(env.DB);
  const found = await env.DB
    .prepare("SELECT undone FROM patches WHERE id = ? AND play = ? AND consolidated_at IS NULL")
    .bind(body.id, body.play)
    .first();
  if (!found) return json({ error: "not found" }, 404);
  if (found.undone) {
    await env.DB
      .prepare("UPDATE patches SET undone = 0, redone_by = ?, redone_device_id = ?, redone_at = ? WHERE id = ?")
      .bind(body.author, body.deviceId, new Date().toISOString(), body.id)
      .run();
  }
  return json({ ok: true });
}
