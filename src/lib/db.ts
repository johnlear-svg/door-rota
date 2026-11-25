import { mkdir, readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

type GlobalDb = {
  __doorRotaPool?: pg.Pool;
  __doorRotaLocal?: Promise<PGlite>;
};

const g = globalThis as typeof globalThis & GlobalDb;

export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (databaseUrl !== "") {
    g.__doorRotaPool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    return (await g.__doorRotaPool.query(text, params)).rows as T[];
  }
  g.__doorRotaLocal ??= startLocal().catch((error: unknown) => {
    g.__doorRotaLocal = undefined;
    throw error;
  });
  return (await (await g.__doorRotaLocal).query<T>(text, params)).rows;
}

async function startLocal(): Promise<PGlite> {
  await mkdir(".data", { recursive: true });
  const db = new PGlite(".data/pglite");
  const files = (await readdir("migrations").catch(() => []))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    await db.exec(await readFile(`migrations/${file}`, "utf8"));
  }
  return db;
}
