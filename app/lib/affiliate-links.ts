import { getAffiliateConfig, normalizeRetailerName } from "./affiliate-config";

export function toAffiliateLink(
  directUrl: string,
  retailerName: string,
): { url: string; isAffiliate: boolean } {
  const config = getAffiliateConfig();

  if (!config.channelId) {
    return { url: directUrl, isAffiliate: false };
  }

  const normalized = normalizeRetailerName(retailerName);
  const program = config.programs[normalized];

  if (!program || !program.enabled) {
    return { url: directUrl, isAffiliate: false };
  }

  try {
    new URL(directUrl);
  } catch {
    return { url: directUrl, isAffiliate: false };
  }

  const encodedUrl = encodeURIComponent(directUrl);
  const affiliateUrl = `${config.baseTrackingUrl}?a=${program.advertiserId}&as=${config.channelId}&t=2&tk=1&url=${encodedUrl}`;

  return { url: affiliateUrl, isAffiliate: true };
}

export function toAvanzaAffiliateLink(
  directUrl: string,
): { url: string; isAffiliate: boolean } {
  return toAffiliateLink(directUrl, "avanza");
}
