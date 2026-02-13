export interface AffiliateProgram {
  advertiserId: string;
  enabled: boolean;
}

export interface AffiliateConfig {
  channelId: string;
  baseTrackingUrl: string;
  programs: Record<string, AffiliateProgram>;
}

export function normalizeRetailerName(name: string): string {
  return name.toLowerCase().replace(/[\s\-_.]+/g, "");
}

export function getAffiliateConfig(): AffiliateConfig {
  return {
    channelId: process.env.ADTRACTION_CHANNEL_ID || "",
    baseTrackingUrl: "https://track.adtraction.com/t/t",
    programs: {
      elgiganten: {
        advertiserId: process.env.ADTRACTION_ELGIGANTEN_ID || "",
        enabled: !!process.env.ADTRACTION_ELGIGANTEN_ID,
      },
      netonnet: {
        advertiserId: process.env.ADTRACTION_NETONNET_ID || "",
        enabled: !!process.env.ADTRACTION_NETONNET_ID,
      },
      webhallen: {
        advertiserId: process.env.ADTRACTION_WEBHALLEN_ID || "",
        enabled: !!process.env.ADTRACTION_WEBHALLEN_ID,
      },
      kjell: {
        advertiserId: process.env.ADTRACTION_KJELL_ID || "",
        enabled: !!process.env.ADTRACTION_KJELL_ID,
      },
      cdon: {
        advertiserId: process.env.ADTRACTION_CDON_ID || "",
        enabled: !!process.env.ADTRACTION_CDON_ID,
      },
      dustin: {
        advertiserId: process.env.ADTRACTION_DUSTIN_ID || "",
        enabled: !!process.env.ADTRACTION_DUSTIN_ID,
      },
      komplett: {
        advertiserId: process.env.ADTRACTION_KOMPLETT_ID || "",
        enabled: !!process.env.ADTRACTION_KOMPLETT_ID,
      },
      mediamarkt: {
        advertiserId: process.env.ADTRACTION_MEDIAMARKT_ID || "",
        enabled: !!process.env.ADTRACTION_MEDIAMARKT_ID,
      },
      ikea: {
        advertiserId: process.env.ADTRACTION_IKEA_ID || "",
        enabled: !!process.env.ADTRACTION_IKEA_ID,
      },
      avanza: {
        advertiserId: process.env.ADTRACTION_AVANZA_ID || "",
        enabled: !!process.env.ADTRACTION_AVANZA_ID,
      },
    },
  };
}
