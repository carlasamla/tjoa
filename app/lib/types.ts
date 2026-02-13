export interface UserPreferences {
  minPrice: number;
  maxPrice: number;
  qualityPriority: number; // 0 = cheapest, 50 = balanced, 100 = best quality
}

export interface ProductRecommendation {
  productName: string;
  price: string;
  reason: string;
  buyLink: string;
  imageUrl: string | null;
  retailer: string;
  isAffiliate?: boolean;
}

export interface RecommendRequest {
  query: string;
  preferences: UserPreferences;
  locale: string;
}

export interface RecommendResponse {
  success: boolean;
  recommendation?: ProductRecommendation;
  error?: string;
}

export interface StockPreferences {
  risk: number; // 0 = low, 50 = medium, 100 = high
  reward: number; // 0 = low, 50 = medium, 100 = high
  maxPrice: number;
}

export interface StockRecommendation {
  stockName: string;
  ticker: string;
  price: string;
  reason: string;
  buyLink: string;
  sector: string;
  type: "stock" | "crypto" | "certificate";
  isAffiliate?: boolean;
}

export interface StockResponse {
  success: boolean;
  recommendation?: StockRecommendation;
  error?: string;
}