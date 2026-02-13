export type SearchType = "product" | "stock";

export interface SearchEvent {
  id: string;
  type: SearchType;
  query: string;
  timestamp: number;
  resultName: string;
  resultLink: string;
  clicked: boolean;
}

export interface ClickEvent {
  searchId: string;
  timestamp: number;
  link: string;
}

export interface EngagementEvent {
  page: string;
  sessionId: string;
  duration: number;
  timestamp: number;
}

export interface AnalyticsData {
  searches: SearchEvent[];
  clicks: ClickEvent[];
  engagements: EngagementEvent[];
}

export interface DashboardRow {
  id: string;
  type: SearchType;
  query: string;
  timestamp: number;
  resultName: string;
  clicked: boolean;
  clickedAt: number | null;
}
