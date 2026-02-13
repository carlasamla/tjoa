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

class AnalyticsStore {
  private searches: Map<string, SearchEvent> = new Map();
  private clicks: ClickEvent[] = [];
  private engagements: EngagementEvent[] = [];
  private dirty = false;

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, "utf-8");
        const data: AnalyticsData = JSON.parse(raw);
        data.searches.forEach((s) => this.searches.set(s.id, s));
        this.clicks = data.clicks || [];
        this.engagements = data.engagements || [];
      }
    } catch {
      // First run or corrupt file — start fresh
    }
  }

  private persist() {
    if (!this.dirty) return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const data: AnalyticsData = {
        searches: Array.from(this.searches.values()),
        clicks: this.clicks,
        engagements: this.engagements,
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      this.dirty = false;
    } catch (e) {
      console.error("Analytics persist error:", e);
    }
  }

  logSearch(event: SearchEvent): void {
    this.searches.set(event.id, event);
    this.dirty = true;
    this.persist();
  }

  logClick(searchId: string, link: string): void {
    const search = this.searches.get(searchId);
    if (search) {
      search.clicked = true;
    }
    this.clicks.push({ searchId, timestamp: Date.now(), link });
    this.dirty = true;
    this.persist();
  }

  logEngagement(event: EngagementEvent): void {
    this.engagements.push(event);
    this.dirty = true;
    this.persist();
  }

  getDashboardData(): { rows: DashboardRow[]; engagements: EngagementEvent[] } {
    const rows: DashboardRow[] = Array.from(this.searches.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((s) => {
        const click = this.clicks.find((c) => c.searchId === s.id);
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

    return { rows, engagements: this.engagements };
  }
}

// Singleton — survives across requests in the same server process
export const analytics = new AnalyticsStore();
