import fs from "fs";
import path from "path";
import type {
  SearchEvent,
  ClickEvent,
  EngagementEvent,
  AnalyticsData,
  DashboardRow,
} from "./analytics-types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "analytics.json");

function readFromDisk(): AnalyticsData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const data = JSON.parse(raw);
      return {
        searches: data.searches || [],
        clicks: data.clicks || [],
        engagements: data.engagements || [],
      };
    }
  } catch {
    // First run or corrupt file — start fresh
  }
  return { searches: [], clicks: [], engagements: [] };
}

function writeToDisk(data: AnalyticsData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Analytics persist error:", e);
  }
}

export const analytics = {
  logSearch(event: SearchEvent): void {
    const data = readFromDisk();
    data.searches.push(event);
    writeToDisk(data);
  },

  logClick(searchId: string, link: string): void {
    const data = readFromDisk();
    const search = data.searches.find((s) => s.id === searchId);
    if (search) {
      search.clicked = true;
    }
    data.clicks.push({ searchId, timestamp: Date.now(), link });
    writeToDisk(data);
  },

  logEngagement(event: EngagementEvent): void {
    const data = readFromDisk();
    data.engagements.push(event);
    writeToDisk(data);
  },

  getDashboardData(): { rows: DashboardRow[]; engagements: EngagementEvent[] } {
    const data = readFromDisk();
    const rows: DashboardRow[] = data.searches
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((s) => {
        const click = data.clicks.find((c) => c.searchId === s.id);
        return {
          id: s.id,
          type: s.type,
          query: s.query,
          timestamp: s.timestamp,
          resultName: s.resultName,
          clicked: s.clicked,
          clickedAt: click?.timestamp ?? null,
        };
      });

    return { rows, engagements: data.engagements };
  },
};
