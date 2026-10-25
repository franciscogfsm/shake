const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = ts.transpileModule(
  readFileSync(resolve(__dirname, "../src/lib/client/pitchSession.ts"), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText;

// Exercise the real hook with browser storage, network responses and wallet
// submission controlled independently. No funded accounts or network needed.
function session({ statuses = ["Accepted"], submit = async () => ({ hash: "release-tx" }) } = {}) {
  const slots = [], effects = [], calls = [];
  let cursor = 0, mounted = false, reads = 0;
  const storage = new Map([["shake.pitch.v1", JSON.stringify({ status: "ready", dealId: "123", joined: { at: "before" } })]]);
  class ApiError extends Error {}
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], (value) => { slots[i] = value; }];
    },
    useRef(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = { current: initial };
      return slots[i];
    },
    useCallback: (fn) => fn,
    useEffect(fn) { if (!mounted) effects.push(fn); },
  };
  const context = {
    exports: {}, Date, Error, setTimeout,
    localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) },
    fetch: async () => {
      const status = statuses[Math.min(reads++, statuses.length - 1)];
      return { ok: true, json: async () => ({
        deal: { id: "123", status, buyer: "buyer" },
        events: [{ type: status.toLowerCase(), at: "chain-time", txHash: "chain-tx" }],
      }) };
    },
    require(name) {
      if (name === "react") return react;
      if (name === "@/lib/config") return {};
      if (name === "./wallet") return {
        ApiError, getKeypair: () => ({ publicKey: () => "buyer" }),
        callDeal: async (...args) => { calls.push("release"); return submit(...args); },
        pitchApi: {
          secret: async () => ({ secret: "demo-secret" }),
          refund: async () => { calls.push("refund"); return { hash: "refund-tx" }; },
        },
      };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  };
  vm.runInNewContext(source, context);
  const render = () => { cursor = 0; return context.exports.usePitchSession(); };
  render();
  mounted = true;
  for (const effect of effects) effect();
  return { render, calls };
}

const flush = () => new Promise((done) => setImmediate(done));

for (const [status, outcome] of [["Released", "released"], ["Refunded", "refunded"]]) {
  test(`restoring a ${status} deal displays its actual receipt`, async () => {
    const h = session({ statuses: [status] });
    await flush();
    const { session: s } = h.render();
    assert.equal(s.status, "done");
    assert.equal(s.outcome, outcome);
    assert.equal(s.settled.hash, "chain-tx");
    assert.equal(h.calls.length, 0);
  });
}

test("a deal closed in another tab is not submitted again", async () => {
  const h = session({ statuses: ["Accepted", "Refunded"] });
  await flush();
  await h.render().shake();
  assert.equal(h.render().session.outcome, "refunded");
  assert.equal(h.calls.length, 0);
});

test("a lost submission response recovers the confirmed release", async () => {
  const h = session({ statuses: ["Accepted", "Accepted", "Released"], submit: async () => { throw new Error("Response lost"); } });
  await flush();
  await h.render().shake();
  assert.equal(h.render().session.outcome, "released");
  assert.equal(h.render().session.settled.hash, "chain-tx");
  assert.deepEqual(h.calls, ["release"]);
});

test("shake and refund cannot submit concurrently", async () => {
  let finish;
  const h = session({ submit: () => new Promise((resolve) => { finish = resolve; }) });
  await flush();
  const shake = h.render().shake();
  await flush();
  assert.equal(h.render().settling, true);
  await h.render().notYet();
  finish({ hash: "release-tx" });
  await shake;
  assert.deepEqual(h.calls, ["release"]);
  assert.equal(h.render().settling, false);
  assert.equal(h.render().session.outcome, "released");
});

test("a rejected open deal shows its error and remains retryable", async () => {
  const h = session({ submit: async () => { throw new Error("Network unavailable"); } });
  await flush();
  await assert.rejects(h.render().shake(), /Network unavailable/);
  assert.equal(h.render().session.status, "ready");
  assert.equal(h.render().session.error, "Network unavailable");
  assert.equal(h.render().settling, false);
});
