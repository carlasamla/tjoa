import { neon } from "@neondatabase/serverless";
import type {
  SearchEvent,
  EngagementEvent,
  DashboardRow,
} from "./analytics-types";

function getSQL() {
  return neon(process.env.POSTGRES_URL!);
}

let tablesReady: Promise<void> | null = null;

async function ensureTables(): Promise<void> {
  const sql = getSQL();
  await sql`
    CREATE TABLE IF NOT EXISTS searches (
      id          TEXT PRIMARY KEY,
      type        TEXT NOT NULL CHECK (type IN ('product', 'stock')),
      query       TEXT NOT NULL,
      timestamp   BIGINT NOT NULL,
      result_name TEXT NOT NULL,
      result_link TEXT NOT NULL,
      clicked     BOOLEAN NOT NULL DEFAULT FALSE
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS clicks (
      id          SERIAL PRIMARY KEY,
      search_id   TEXT NOT NULL REFERENCES searches(id),
      timestamp   BIGINT NOT NULL,
      link        TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS engagements (
      id          SERIAL PRIMARY KEY,
      page        TEXT NOT NULL,
      session_id  TEXT NOT NULL,
      duration    INTEGER NOT NULL,
      timestamp   BIGINT NOT NULL
    )
  `;
}

function getTablesReady(): Promise<void> {
  if (!tablesReady) {
    tablesReady = ensureTables();
  }
  return tablesReady;
}

export const analytics = {
  async logSearch(event: SearchEvent): Promise<void> {
    await getTablesReady();
    const sql = getSQL();
    await sql`
      INSERT INTO searches (id, type, query, timestamp, result_name, result_link, clicked)
      VALUES (${event.id}, ${event.type}, ${event.query}, ${event.timestamp},
              ${event.resultName}, ${event.resultLink}, ${event.clicked})
    `;
  },

  async logClick(searchId: string, link: string): Promise<void> {
    await getTablesReady();
    const sql = getSQL();
    await sql`UPDATE searches SET clicked = TRUE WHERE id = ${searchId}`;
    await sql`
      INSERT INTO clicks (search_id, timestamp, link)
      VALUES (${searchId}, ${Date.now()}, ${link})
    `;
  },

  async logEngagement(event: EngagementEvent): Promise<void> {
    await getTablesReady();
    const sql = getSQL();
    await sql`
      INSERT INTO engagements (page, session_id, duration, timestamp)
      VALUES (${event.page}, ${event.sessionId}, ${event.duration}, ${event.timestamp})
    `;
  },

  async getDashboardData(): Promise<{
    rows: DashboardRow[];
    engagements: EngagementEvent[];
  }> {
    await getTablesReady();
    const sql = getSQL();

    const searchRows = await sql`
      SELECT DISTINCT ON (s.id)
        s.id,
        s.type,
        s.query,
        s.timestamp,
        s.result_name AS "resultName",
        s.clicked,
        c.timestamp   AS "clickedAt"
      FROM searches s
      LEFT JOIN clicks c ON c.search_id = s.id
      ORDER BY s.id, c.timestamp DESC
    `;

    const engagementRows = await sql`
      SELECT page, session_id AS "sessionId", duration, timestamp
      FROM engagements
      ORDER BY timestamp DESC
    `;

    const rows: DashboardRow[] = searchRows
      .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
      .map((r) => ({
        id: r.id as string,
        type: r.type as DashboardRow["type"],
        query: r.query as string,
        timestamp: Number(r.timestamp),
        resultName: r.resultName as string,
        clicked: r.clicked as boolean,
        clickedAt: r.clickedAt ? Number(r.clickedAt) : null,
      }));

    const engagements: EngagementEvent[] = engagementRows.map((r) => ({
      page: r.page as string,
      sessionId: r.sessionId as string,
      duration: Number(r.duration),
      timestamp: Number(r.timestamp),
    }));

    return { rows, engagements };
  },
};
