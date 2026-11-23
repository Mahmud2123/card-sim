// src/app/scan/page.tsx
import Navbar from "@/components/Navbar";
import ScanPage from "@/components/ScanPage";

export default function Scan() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '520px', margin: '16px auto', padding: '0 20px' }}>
        <ScanPage />
      </main>
    </>
  );
}