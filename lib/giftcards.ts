// src/lib/giftcards.ts

export type BrandId = "apple" | "razer" | "xbox" | "sephora" | "ebay" | "steam" | "playstation";

export interface Brand {
  id: BrandId;
  name: string;
  len: number;
  type: "digits" | "alnum";
  prefix?: string;
  pin?: number;
  rule: string;
  placeholder?: string;
}

export const BRANDS: Brand[] = [
  { id: "apple", name: "Apple", len: 16, type: "alnum", prefix: "X", rule: "16 characters, must start with X (letters and numbers)", placeholder: "X1234ABCD5678EFGH" },
  { id: "razer", name: "Razer", len: 16, type: "digits", rule: "16 digits" },
  { id: "xbox", name: "Xbox", len: 25, type: "digits", rule: "25 digits" },
  { id: "sephora", name: "Sephora", len: 16, type: "digits", pin: 8, rule: "16 digits (plus 8-digit PIN)" },
  { id: "ebay", name: "eBay", len: 13, type: "digits", rule: "13 digits" },
  { id: "steam", name: "Steam", len: 15, type: "digits", rule: "15 digits" },
  { id: "playstation", name: "PlayStation", len: 12, type: "digits", rule: "12 digits" },
];

export const MIN_AMT = 0.01;
export const MAX_AMT = 1000;

export type StatusKey = "active" | "empty" | "blocked" | "expired" | "notfound";
export type Tone = "ok" | "warn" | "bad";

export const STATUS: Record<StatusKey, { label: string; tone: Tone }> = {
  active: { label: "Active", tone: "ok" },
  empty: { label: "Active (no balance)", tone: "warn" },
  blocked: { label: "Blocked", tone: "bad" },
  expired: { label: "Expired", tone: "warn" },
  notfound: { label: "Not found", tone: "bad" },
};

export interface Errors {
  brand: string;
  num: string;
  pin: string;
  amount: string;
}

export interface CheckResult {
  brand: string;
  last4: string;
  status: StatusKey;
  balance: number | null;
  message: string;
  amount: number;
  reference: string;
  checkedAt: string;
}

export const getBrand = (id: string) => BRANDS.find((b) => b.id === id);

export const money = (n: number) => "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export function cleanNumber(b: Brand, v: string): string {
  const s = v.replace(/[\s-]/g, "");
  if (b.type === "alnum") return s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, b.len);
  return s.replace(/\D/g, "").slice(0, b.len);
}

export function validateNumber(b: Brand, v: string): string {
  if (!v) return "Enter the card number.";
  if (b.type === "digits" && !/^\d+$/.test(v)) return "Card number must contain digits only.";
  if (b.type === "alnum" && !/^[A-Z0-9]+$/.test(v)) return "Card number can only contain uppercase letters and numbers.";
  if (b.prefix && v.charAt(0) !== b.prefix) return `${b.name} card numbers must start with ${b.prefix}.`;
  if (v.length !== b.len) return `${b.name} card numbers are ${b.len} ${b.type === "digits" ? "digits" : "characters"} (you entered ${v.length}).`;
  return "";
}

export function validatePin(v: string): string {
  if (!v) return "Enter the PIN.";
  if (!/^\d+$/.test(v)) return "PIN must contain digits only.";
  if (v.length !== 8) return `PIN must be exactly 8 digits (you entered ${v.length}).`;
  return "";
}

export function validateAmount(v: string): string {
  if (!v) return "Enter the card amount.";
  if (!/^(0|[1-9]\d{0,3})(\.\d{1,2})?$/.test(v)) return "Enter a valid amount like 50 or 50.25 (no leading zeros).";
  const n = parseFloat(v);
  if (n < MIN_AMT || n > MAX_AMT) return "Amount must be between $0.01 and $1,000.00.";
  return "";
}

export function validateAll(brandId: string, number: string, pin: string, amount: string): Errors {
  const e: Errors = { brand: "", num: "", pin: "", amount: "" };
  const b = getBrand(brandId);
  if (!b) {
    e.brand = "Select a valid card type.";
    return e;
  }
  e.num = validateNumber(b, number);
  e.pin = b.pin ? validatePin(pin) : "";
  e.amount = validateAmount(amount);
  return e;
}

export const hasErrors = (e: Errors) => Boolean(e.brand || e.num || e.pin || e.amount);

/** The fake "issuer". Returns exactly the amount entered as the balance. */
export function simulate(b: Brand, n: string, p: string, amt: number): { status: StatusKey; balance: number | null; message: string } {
  return { status: "active", balance: amt, message: "Your card is active and ready to use." };
}