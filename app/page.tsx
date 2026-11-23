// src/app/page.tsx
import Navbar from "@/components/Navbar";
import GiftCardChecker from "@/components/GiftCardChecker";

export default function Home() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '520px', margin: '16px auto', padding: '0 20px' }}>
        <GiftCardChecker />
      </main>
      <footer style={{ textAlign: 'center', padding: '0 20px 20px', fontSize: '12px', color: 'var(--muted)' }}>
        Secure portal. Not affiliated with any brand.
      </footer>
    </>
  );
}