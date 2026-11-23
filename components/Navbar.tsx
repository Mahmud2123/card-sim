// src/components/Navbar.tsx
export default function Navbar() {
  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      background: 'var(--surface)',
      borderBottom: '1px solid var(--line)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
          display: 'grid',
          placeItems: 'center',
          color: '#fff',
          fontWeight: 700,
          fontSize: '14px'
        }}>GC</div>
        <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.02em' }}>CardCheck</span>
      </div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>
        Secure Portal
      </div>
    </nav>
  );
}