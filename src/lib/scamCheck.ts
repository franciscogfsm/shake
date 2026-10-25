/** Pattern checker for second-hand deal chats (PT + EN). Runs on the phone; nothing is sent anywhere. */
export type Flag = { id: string; level: "danger" | "warn"; title: string; why: string };

const RULES: { id: string; level: Flag["level"]; re: RegExp; title: string; why: string }[] = [
  {
    id: "mbway-request",
    level: "danger",
    re: /(pedido de (dinheiro|pagamento)|pedir dinheiro|aceita(r)? o pedido|request money|accept the request|mb ?way.{0,40}(código|code|pin|aceit|accept))/i,
    title: "The MB WAY “request money” trick",
    why: "To receive money you never accept a request or type your PIN. Accepting a request sends money out of your account.",
  },
  {
    id: "code",
    level: "danger",
    re: /(código|codigo|code|pin|otp).{0,30}(sms|recebe|received|send me|envia|manda|dita)|(manda|envia|send me).{0,20}(código|codigo|code)/i,
    title: "They want a code from your phone",
    why: "Codes sent by SMS or your bank are keys to your account. Nobody needs one to pay you.",
  },
  {
    id: "link-pay",
    level: "danger",
    re: /(clica|carrega|click|tap|abre|open).{0,30}(link|ligação).{0,40}(receber|recebe|receive|pagamento|payment|dinheiro|money)|(link|ligação).{0,30}(para receber|to receive)/i,
    title: "“Click this link to receive the money”",
    why: "Receiving money never needs you to open a link and type card details. This is the most common fake-checkout scam on OLX and Vinted.",
  },
  {
    id: "courier",
    level: "danger",
    re: /(ctt|dhl|ups|dpd|seur|correios|courier|transportadora|estafeta).{0,60}(pag|pay|taxa|fee|confirm)/i,
    title: "A courier “needs a fee” to deliver",
    why: "Real couriers don't collect fees through a chat link. Fake courier pages steal card details.",
  },
  {
    id: "screenshot",
    level: "warn",
    re: /(comprovativo|print|screenshot|captura|já (paguei|transferi|enviei)|already (paid|sent|transferred)|payment (is )?pending|pagamento pendente)/i,
    title: "Proof by screenshot",
    why: "A screenshot can be edited in seconds. Only money you can check yourself is real: ask for a SHAKE link.",
  },
  {
    id: "urgency",
    level: "warn",
    re: /(urgente|urgent|rápido|rapido|hoje mesmo|right now|asap|só hoje|today only|imediatamente|immediately|antes que|before someone else|último|last chance)/i,
    title: "Pressure to hurry",
    why: "Rushing you is how scams skip your second thought. A real buyer can wait for you to check.",
  },
  {
    id: "off-platform",
    level: "warn",
    re: /(whatsapp|telegram|signal|e-?mail|fora da (app|plataforma)|outside the app).{0,40}(fala|falamos|talk|contact|contacta|add me|adiciona)/i,
    title: "Moving you off the app",
    why: "Scammers leave OLX or Vinted chats to escape their protections and reports.",
  },
  {
    id: "overpay",
    level: "warn",
    re: /(pago (a )?mais|pay (you )?(more|extra)|devolve(s)? a diferença|refund the difference|send back the (rest|difference))/i,
    title: "Overpayment and “send back the difference”",
    why: "The first payment bounces later; the money you send back doesn't.",
  },
];

const OFFICIAL = ["olx.pt", "olx.com", "vinted.pt", "vinted.com", "vinted.fr", "vinted.es", "mbway.pt", "ctt.pt", "shake-lake.vercel.app"];

export function checkText(text: string): Flag[] {
  const flags: Flag[] = RULES.filter((r) => r.re.test(text)).map(({ id, level, title, why }) => ({ id, level, title, why }));
  for (const m of text.matchAll(/\b((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,})(?:\/\S*)?/gi)) {
    const host = m[1].replace(/^https?:\/\//i, "").toLowerCase();
    const official = OFFICIAL.some((d) => host === d || host.endsWith(`.${d}`));
    // look-alikes put the brand in a domain it doesn't own (olx-pagamentos.com, vinted.secure-pay.net)
    if (!official && /(olx|vinted|mbway|ctt|shake)/.test(host))
      flags.push({ id: `domain:${host}`, level: "danger", title: `Look-alike link: ${host}`, why: "It uses a brand name but isn't that brand's official site." });
  }
  return flags;
}

export const verdict = (flags: Flag[]) => (flags.some((f) => f.level === "danger") ? "danger" : flags.length ? "warn" : "clear");
