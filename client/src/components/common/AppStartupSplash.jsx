import React from 'react';

/**
 * AppStartupSplash
 * Official high-performance mobile & desktop startup loading screen.
 * Displays during initial authorization resolution and app boot.
 * Seamlessly transitions from the native PWA / HTML splash into the application.
 */
export const AppStartupSplash = () => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading FurniCraft ERP workspace"
      className="fixed inset-0 z-50 flex min-h-[100dvh] w-full flex-col items-center justify-between bg-[#0f172a] p-6 text-white select-none overflow-hidden"
      style={{
        background: 'radial-gradient(circle at 50% 38%, #1e293b 0%, #0f172a 60%, #020617 100%)',
      }}
    >
      {/* Top spacer for optical centering */}
      <div className="w-full h-8" />

      {/* Main Brand Core */}
      <div className="flex flex-col items-center max-w-sm w-full mx-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Floating Illuminated Glassmorphism Logo Tile */}
        <div className="relative flex items-center justify-center p-4 sm:p-5 rounded-3xl bg-slate-800/80 border border-slate-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-transform duration-300">
          {/* Subtle Ambient Glow Behind Logo */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-transparent to-blue-500/20 blur-xl pointer-events-none" />

          {/* FurniCraft Signature Monogram */}
          <img
            src="/furnicraft-logo.png"
            alt="FurniCraft Logo"
            className="relative h-16 w-16 sm:h-20 sm:w-20 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)]"
          />
        </div>

        {/* Brand Wordmark & ERP Badge */}
        <div className="mt-6 flex items-center justify-center gap-2 leading-none">
          <span className="text-2xl sm:text-3xl font-black tracking-tight">
            <span className="text-amber-500">Furni</span>
            <span className="text-blue-500">Craft</span>
          </span>
          <span className="rounded-md bg-amber-400/20 px-2 py-0.5 text-xs font-black tracking-wider text-amber-300 border border-amber-400/30 uppercase shadow-xs">
            ERP
          </span>
        </div>

        {/* Tagline */}
        <p className="mt-2 text-xs sm:text-sm font-medium text-slate-400 text-center">
          Furniture Workforce Management Platform
        </p>

        {/* High-Tech Animated Indeterminate Loading Bar */}
        <div className="mt-8 w-44 sm:w-52 h-1.5 rounded-full bg-slate-800/90 overflow-hidden relative border border-slate-700/60 shadow-inner">
          <div
            className="h-full w-2/5 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-blue-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
            style={{
              animation: 'fcProgress 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite',
            }}
          />
        </div>

        {/* Subtle Status Text */}
        <p className="mt-3 text-[11px] font-semibold tracking-wider uppercase text-slate-400/80 animate-pulse">
          Starting workspace...
        </p>
      </div>

      {/* Footer Attribution */}
      <div className="text-[11px] text-slate-500 font-medium tracking-wide pb-2 text-center">
        Crafted for Furniture Workshops &amp; Contractors
      </div>

      {/* Self-contained CSS Animation Keyframes for Smooth Compositor Execution */}
      <style>{`
        @keyframes fcProgress {
          0% {
            transform: translateX(-150%);
          }
          50% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(250%);
          }
        }
      `}</style>
    </div>
  );
};
