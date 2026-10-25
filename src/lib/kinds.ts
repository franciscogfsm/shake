/**
 * What a deal is for. Three on-chain rules cover them all:
 *  - Meet: released when the payer scans the payee's QR (both phones together).
 *  - Ship: released when the payer scans/approves, or 3 days after the payee marks it delivered/done.
 *  - Hold: a deposit that goes back to the payer on the end date unless the holder claims part of it.
 * Kinds only change the words, the defaults and which rule is used.
 */
export type Kind = "meet" | "ship" | "service" | "deposit" | "booking";
export type Mode = "Meet" | "Ship" | "Hold";

type KindInfo = {
  label: string;
  mode: Mode;
  fn: "lock" | "lock_ship" | "lock_hold";
  /** The big question on the new-deal screen. */
  ask: string;
  placeholder: string;
  payee: string;
  payeeHint: string;
  /** Default length of the deal, in days (Hold: the end date). */
  days: number;
  blurb: string;
};

export const KINDS: Record<Kind, KindInfo> = {
  meet: {
    label: "Buying, we meet",
    mode: "Meet",
    fn: "lock",
    ask: "What are you buying?",
    placeholder: "iPhone 13, 128GB",
    payee: "seller",
    payeeHint: "@rita on OLX",
    days: 1,
    blurb: "Held safely until you shake. Refunded if you don’t.",
  },
  ship: {
    label: "Buying, it’s shipped",
    mode: "Ship",
    fn: "lock_ship",
    ask: "What are you buying?",
    placeholder: "Nintendo Switch OLED",
    payee: "seller",
    payeeHint: "@joao on Vinted",
    days: 14,
    blurb: "The shake travels in the box: scan the QR inside when you open it. Released 3 days after delivery unless you open a problem.",
  },
  service: {
    label: "A job or service",
    mode: "Ship",
    fn: "lock_ship",
    ask: "What’s the job?",
    placeholder: "Paint the living room",
    payee: "pro",
    payeeHint: "Rui, painter",
    days: 30,
    blurb: "Paid when the work is done: you approve, or it releases 3 days after they mark it done unless you open a problem.",
  },
  deposit: {
    label: "Rental deposit",
    mode: "Hold",
    fn: "lock_hold",
    ask: "What’s the deposit for?",
    placeholder: "Flat T2, Rua Augusta 12",
    payee: "landlord",
    payeeHint: "Sra. Fernanda",
    days: 365,
    blurb: "Comes back to you on move-out day, by itself. The landlord can claim damage before then: you accept, or a neutral resolver splits it. Nobody can just keep it.",
  },
  booking: {
    label: "Booking or hire",
    mode: "Hold",
    fn: "lock_hold",
    ask: "What are you booking?",
    placeholder: "Van hire, 3 days",
    payee: "owner",
    payeeHint: "Lisbon Van Hire",
    days: 7,
    blurb: "A deposit for the car, the venue, the gear. It comes back to you on the end date unless the owner claims damage first.",
  },
};

export const KIND_ORDER: Kind[] = ["meet", "ship", "deposit", "service", "booking"];

/** The status words in link previews, read from the chain. */
export function previewStatus({ status, mode }: { status: string; mode: Mode }) {
  if (mode === "Hold")
    return ({ Locked: "deposit held ✓", Accepted: "deposit held ✓", Refunded: "deposit returned", Disputed: "claim open · frozen", Resolved: "claim settled", Released: "paid ✓" } as Record<string, string>)[status] ?? "deposit held ✓";
  return ({ Released: "released ✓", Refunded: "refunded", Shipped: "shipped · locked ✓", Delivered: "delivered · locked ✓", Disputed: "problem open · frozen", Resolved: "resolved" } as Record<string, string>)[status] ?? "locked for you ✓";
}

const DEFAULT: Record<Mode, Kind> = { Meet: "meet", Ship: "ship", Hold: "deposit" };

/** The kind shown for a deal: what the link says, if it matches the deal's on-chain rule. */
export function kindOf(mode: Mode, hint?: string | null): Kind {
  const k = hint as Kind;
  return k in KINDS && KINDS[k].mode === mode ? k : DEFAULT[mode];
}
