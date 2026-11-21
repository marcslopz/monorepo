// In-memory SQLite with the subset of the Cloudflare D1 API the functions use:
// db.prepare(sql).bind(...args).all() / .first() / .run(), and db.batch([stmts]).
import { DatabaseSync } from "node:sqlite";

export function fakeD1() {
  const sqlite = new DatabaseSync(":memory:");
  const statement = (sql, args = []) => ({
    bind: (...values) => statement(sql, values),
    async all() {
      return { results: sqlite.prepare(sql).all(...args).map((row) => ({ ...row })), success: true };
    },
    async first() {
      const row = sqlite.prepare(sql).get(...args);
      return row ? { ...row } : null;
    },
    async run() {
      const info = sqlite.prepare(sql).run(...args);
      return { success: true, meta: { changes: Number(info.changes) } };
    },
  });
  return {
    prepare: (sql) => statement(sql),
    async batch(statements) {
      const out = [];
      for (const s of statements) out.push(await s.run());
      return out;
    },
  };
}
