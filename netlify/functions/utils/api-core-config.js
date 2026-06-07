/* BuildQuotes — API core configuration */
const { createApiCore } = require("../../../shared/api-core");

const api = createApiCore({
  keyPrefix: "bqte_",
  quotaField: "quotesPerMonth",
  maxBodyBytes: 10 * 1024 * 1024,
  maxRegistrationsPerHour: 3,
  quotaMessage: "Monthly quote limit reached.",
  upgradeUrl: "https://buildquotes.co/api/docs#pricing",
  enableRateLimiter: true,
  defaultCountUsage: true,
  tiers: {
    free:     { name: "Free",     quotesPerMonth: 25,    ratePerMinute: 5,   watermark: true,  logoEnabled: false },
    starter:  { name: "Starter",  quotesPerMonth: 500,   ratePerMinute: 30,  watermark: false, logoEnabled: true },
    pro:      { name: "Pro",      quotesPerMonth: 5000,  ratePerMinute: 150, watermark: false, logoEnabled: true },
    business: { name: "Business", quotesPerMonth: 25000, ratePerMinute: 500, watermark: false, logoEnabled: true },
  },
});

module.exports = api;
