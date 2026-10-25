import type { Country, CurrencyCode } from "./config";

// ISO region identifiers; formatting comes from the runtime's Unicode locale data.
const REGIONS = "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ");
const EURO_REGIONS = new Set("AD AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MC MT NL PT SI SK SM VA".split(" "));
const names = new Intl.DisplayNames(["en"], { type: "region" });

export const WORLD_COUNTRIES: Country[] = REGIONS.map((code) => ({
  code, name: names.of(code) ?? code, locale: `en-${code}`,
  // A supported settlement default, never an exchange rate or a claim of local fiat support.
  currency: (EURO_REGIONS.has(code) ? "EUR" : code === "GB" ? "GBP" : code === "BR" ? "BRL" : "USD") as CurrencyCode,
})).sort((a, b) => a.name.localeCompare(b.name, "en"));

export function detectCountry(languages: readonly string[]): Country {
  for (const language of languages) {
    try {
      const locale = new Intl.Locale(language);
      const region = locale.region ?? locale.maximize().region;
      const country = WORLD_COUNTRIES.find((c) => c.code === region);
      if (country) return { ...country, locale: locale.toString() };
    } catch { /* Ignore malformed browser preferences. */ }
  }
  return { ...WORLD_COUNTRIES.find((c) => c.code === "US")!, locale: "en-US" };
}
