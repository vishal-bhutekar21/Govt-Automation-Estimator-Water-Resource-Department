import { Pool } from 'pg';

const STORE_ID = 'main';

let pool: Pool | null = null;

export function postgresEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL!.trim();
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? undefined : { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

export async function ensurePostgresStore(): Promise<void> {
  const client = getPool();
  await client.query(`
    CREATE TABLE IF NOT EXISTS valuation_store (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function loadPostgresPayload<T>(): Promise<T | null> {
  const result = await getPool().query<{ payload: T }>(
    'SELECT payload FROM valuation_store WHERE id = $1 LIMIT 1',
    [STORE_ID]
  );
  return result.rows[0]?.payload ?? null;
}

export async function savePostgresPayload(payload: unknown): Promise<void> {
  await getPool().query(
    `
      INSERT INTO valuation_store (id, payload, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE
      SET payload = EXCLUDED.payload,
          updated_at = NOW()
    `,
    [STORE_ID, JSON.stringify(payload)]
  );
}
