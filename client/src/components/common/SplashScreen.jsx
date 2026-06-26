import { useEffect, useState } from 'react';

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('enter'); // enter → visible → exit

  useEffect(() => {
    // Give the logo time to shine, then fade out
    const show  = setTimeout(() => setPhase('exit'), 2200);
    const done  = setTimeout(() => onDone?.(), 2800);
    return () => { clearTimeout(show); clearTimeout(done); };
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 60% 40%, #2e1065 0%, #1a0533 45%, #0d0118 100%)',
        transition: 'opacity 0.6s ease',
        opacity: phase === 'exit' ? 0 : 1,
        pointerEvents: phase === 'exit' ? 'none' : 'all',
      }}
    >
      {/* Glowing background orbs */}
      <div style={{
        position: 'absolute', width: 400, height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(168,33,212,0.18) 0%, transparent 70%)',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -60%)',
        animation: 'pulse-glow 2.5s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', width: 200, height: 200,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(120,40,200,0.15) 0%, transparent 70%)',
        bottom: '30%', right: '30%',
        animation: 'pulse-glow 3s ease-in-out infinite reverse',
      }} />

      {/* Logo */}
      <div style={{
        animation: 'logo-in 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards',
        opacity: 0,
        marginBottom: 28,
      }}>
        <img
          src="/vendrix-logo.jpg"
          alt="Vendrix"
          style={{
            width: 160,
            height: 'auto',
            borderRadius: 20,
            boxShadow: '0 0 60px rgba(168,33,212,0.5), 0 0 120px rgba(168,33,212,0.2)',
          }}
        />
      </div>

      {/* Brand name */}
      <div style={{
        animation: 'fade-up 0.6s ease 0.4s forwards',
        opacity: 0,
        textAlign: 'center',
        marginBottom: 36,
      }}>
        <p style={{
          color: 'rgba(233,168,253,0.7)',
          fontSize: 13,
          letterSpacing: '0.25em',
          fontFamily: 'system-ui, sans-serif',
          textTransform: 'uppercase',
        }}>
          AI-Powered Marketplace
        </p>
      </div>

      {/* Loading bar */}
      <div style={{
        animation: 'fade-up 0.5s ease 0.7s forwards',
        opacity: 0,
        width: 180,
      }}>
        <div style={{
          height: 3,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 999,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            borderRadius: 999,
            background: 'linear-gradient(90deg, #a821d4, #d974fa, #a821d4)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s linear infinite',
          }} />
        </div>

        {/* Dots */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 6,
          marginTop: 16,
        }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: 6, height: 6,
              borderRadius: '50%',
              background: '#a821d4',
              animation: `dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes logo-in {
          from { opacity: 0; transform: scale(0.75) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-glow {
          0%, 100% { transform: translate(-50%, -60%) scale(1); opacity: 0.8; }
          50%       { transform: translate(-50%, -60%) scale(1.12); opacity: 1; }
        }
        @keyframes shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40%            { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
