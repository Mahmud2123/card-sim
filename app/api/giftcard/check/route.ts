// src/app/api/giftcard/check/route.ts
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getBrand, hasErrors, simulate, validateAll, type CheckResult } from "@/lib/giftcards";

export const runtime = "nodejs";

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeReference(): string {
  const bytes = randomBytes(8);
  let out = "SIM-";
  for (const byte of bytes) out += REF_ALPHABET[byte % REF_ALPHABET.length];
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Added 'attempt' from the frontend
  const { brand, number, pin = "", amount, attempt = 0 } = body as Record<string, unknown>;
  if (typeof brand !== "string" || typeof number !== "string" || typeof pin !== "string" || typeof amount !== "string") {
    return NextResponse.json({ error: "brand, number, pin and amount must be strings." }, { status: 400 });
  }

  const errors = validateAll(brand, number, pin, amount);
  if (hasErrors(errors)) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  const b = getBrand(brand)!;
  const amt = parseFloat(amount);

  await sleep(900 + Math.random() * 800);
  let sim = simulate(b, number, b.pin ? pin : "", amt);

  // Force fail on the very first attempt (Attempt 0)
  if (attempt === 0) {
    sim = { status: "notfound", balance: null, message: "We couldn't find a card matching these details. Check the number and try again." };
  }

  const result: CheckResult = {
    brand: b.name,
    last4: number.slice(-4),
    status: sim.status,
    balance: sim.balance,
    message: sim.message,
    amount: amt,
    reference: makeReference(),
    checkedAt: new Date().toISOString(),
  };
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}