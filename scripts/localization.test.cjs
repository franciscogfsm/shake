const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve, dirname } = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");

const modules = new Map();
function load(path) {
  const file = resolve(__dirname, "../src/lib", path);
  if (modules.has(file)) return modules.get(file);
  const exports = {};
  modules.set(file, exports);
  const source = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, {
    exports, Intl, Error, Map, Set, BigInt, process: { env: {
      NEXT_PUBLIC_TOKEN_EUR: "euro-token", NEXT_PUBLIC_TOKEN_USD: "dollar-token",
      NEXT_PUBLIC_TOKEN_GBP: "pound-token", NEXT_PUBLIC_TOKEN_BRL: "real-token",
    } },
    require: (name) => load(resolve(dirname(file), `${name}.ts`)),
  });
  return exports;
}
const { parseAmount, isCentAmount } = load("amount.ts");
const { detectCountry, WORLD_COUNTRIES } = load("regions.ts");
const { toUnits, formatMoney, currencyOfToken, availableCurrencies } = load("config.ts");
const { currencyTotals } = load("totals.ts");

for (const [locale, input, expected] of [
  ["en-US", "1,234.56", 1234.56], ["pt-PT", "1 234,56", 1234.56],
  ["pt-BR", "1.234,56", 1234.56], ["de-DE", "1.234,56", 1234.56],
  ["fr-FR", "1 234,56", 1234.56], ["en-IN", "12,34,567.89", 1234567.89],
  ["ar-EG", "١٬٢٣٤٫٥٦", 1234.56], ["fa-IR", "۱٬۲۳۴٫۵۶", 1234.56],
  ["bn-BD", "১,২৩৪.৫৬", 1234.56], ["hi-IN", "१२३४.५६", 1234.56],
  ["ja-JP", "１２３４．５６", 1234.56], ["pt-BR", "12.50", 12.5],
  ["en-US", "12,50", 12.5], ["de-DE", "1.234", 1234],
]) {
  test(`${locale} parses ${input} without changing its value`, () => {
    assert.equal(parseAmount(input, locale), expected);
    assert.equal(toUnits(parseAmount(input, locale)), BigInt(Math.round(expected * 100)) * 100000n);
  });
}

for (const input of ["", "-12", "1e3", "Infinity", "1.005", "1,23,4", "1.2.3", "12 apples", "0x10", "1,2345", "12."]) {
  test(`rejects invalid or ambiguous US amount ${JSON.stringify(input)}`, () => assert.ok(Number.isNaN(parseAmount(input, "en-US"))));
}

test("cent validation prevents inconsistent funding and locking", () => {
  assert.ok(isCentAmount(0.29));
  assert.equal(toUnits(0.29), 2900000n);
  for (const amount of [NaN, Infinity, -1, 1.005]) assert.throws(() => toUnits(amount));
});

for (const [locale, region, currency] of [["en-AU", "AU", "USD"], ["en-CA", "CA", "USD"], ["pt-BR", "BR", "BRL"], ["en-GB", "GB", "GBP"], ["pt-PT", "PT", "EUR"], ["ar-EG", "EG", "USD"], ["en-IN", "IN", "USD"], ["zh-Hant-TW", "TW", "USD"]]) {
  test(`detects ${locale} while choosing only a supported settlement currency`, () => {
    const country = detectCountry([locale]);
    assert.equal(country.code, region);
    assert.equal(country.currency, currency);
    assert.equal(country.locale, locale);
  });
}

test("the region picker covers all 249 ISO regions without duplicates", () => {
  assert.equal(WORLD_COUNTRIES.length, 249);
  assert.equal(new Set(WORLD_COUNTRIES.map((c) => c.code)).size, 249);
  assert.equal(detectCountry(["invalid_locale", "pt-BR"]).code, "BR");
});

test("currency lookup preserves the token instead of defaulting unknown assets to EUR", () => {
  assert.equal(availableCurrencies().length, 4);
  assert.equal(currencyOfToken("dollar-token").code, "USD");
  assert.throws(() => currencyOfToken("unknown-token"), /unsupported currency/);
  for (const currency of ["EUR", "USD", "GBP", "BRL"]) {
    for (const locale of ["en-US", "pt-BR", "ar-EG", "en-IN"]) {
      const expected = new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(1234.56);
      // Compact product typography can omit the space before a currency symbol.
      // Locale digits, ordering, separators, currency and directional marks must match.
      assert.equal(formatMoney(1234.56, currency, locale).replace(/\s/g, ""), expected.replace(/\s/g, ""));
    }
  }
});

test("statistics keep asset amounts separate and exclude closed deals", () => {
  const result = currencyTotals([
    { type: "locked", dealId: "1", token: "EUR", amount: 50000000n },
    { type: "locked", dealId: "2", token: "USD", amount: 90000000n },
    { type: "locked", dealId: "3", token: "EUR", amount: 20000000n },
    { type: "released", dealId: "1", amount: 50000000n },
    { type: "locked", dealId: "4", amount: 10000000n },
  ]);
  assert.equal(result.openDeals, 3);
  assert.equal(result.totals.find((t) => t.token === "EUR").protectedNow, "20000000");
  assert.equal(result.totals.find((t) => t.token === "USD").protectedNow, "90000000");
  assert.equal(result.totals.length, 2);
});
