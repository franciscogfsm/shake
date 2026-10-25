// node scripts/scam-check.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const src = ts.transpileModule(readFileSync(new URL("../src/lib/scamCheck.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { checkText, verdict } = await import("data:text/javascript," + encodeURIComponent(src));
const ids = (t) => checkText(t).map((f) => f.id);

assert.ok(ids("Envio-te um pedido de dinheiro no MB WAY, é só aceitar").includes("mbway-request"));
assert.ok(ids("Clica no link para receber o pagamento").includes("link-pay"));
assert.ok(ids("Manda-me o código que recebeste por SMS").includes("code"));
assert.ok(ids("I already paid, here is the screenshot. Urgent please").includes("screenshot"));
assert.ok(ids("pay at https://olx-pagamentos.com/secure").includes("domain:olx-pagamentos.com"));
assert.equal(ids("see https://www.olx.pt/d/anuncio").length, 0);
assert.equal(verdict(checkText("Olá, ainda está disponível? Podemos encontrar no sábado.")), "clear");
assert.equal(verdict(checkText("Rápido, só hoje")), "warn");
console.log("scam-check ok");
