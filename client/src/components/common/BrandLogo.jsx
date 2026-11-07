import React from 'react';

/**
 * Official FurniCraft ERP Brand Logo Component
 * Incorporates the signature "FC" Modern Furniture Monogram (Wood Brown 'F' + Royal Blue/Gold 'C')
 */
export const BrandLogo = ({
  size = 'md',
  variant = 'light',
  showTagline = true,
  collapsed = false,
  className = '',
}) => {
  const isDark = variant === 'dark';

  const sizeConfigs = {
    sm: {
      imgSize: 'h-8 w-auto',
      title: 'text-base font-black',
      tagline: 'text-[10px]',
      badge: 'text-[9px] px-1 py-0.5',
    },
    md: {
      imgSize: 'h-10 md:h-11 w-auto',
      title: 'text-lg md:text-xl font-black',
      tagline: 'text-[11px]',
      badge: 'text-[10px] px-1.5 py-0.5',
    },
    lg: {
      imgSize: 'h-13 md:h-14 w-auto',
      title: 'text-2xl font-black',
      tagline: 'text-xs',
      badge: 'text-xs px-2 py-0.5',
    },
    xl: {
      imgSize: 'h-16 md:h-20 w-auto',
      title: 'text-3xl md:text-4xl font-black',
      tagline: 'text-sm',
      badge: 'text-xs px-2.5 py-1',
    },
  };

  const config = sizeConfigs[size] || sizeConfigs.md;

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Official Signature FC Furniture Monogram Emblem */}
      <div className="shrink-0 transition-transform duration-200 hover:scale-105 cursor-pointer">
        <img
          src="/furnicraft-logo.png"
          alt="FurniCraft Logo"
          className={`${config.imgSize} object-contain select-none`}
        />
      </div>

      {/* Brand Wordmark & Tagline */}
      {!collapsed && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2 leading-none">
            <span
              className={`tracking-tight ${config.title} ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              <span className="text-[#8a5325]">Furni</span>
              <span className="text-[#1e5ac0]">Craft</span>
            </span>
            <span
              className={`rounded-md font-black tracking-wider uppercase border shadow-xs ${config.badge} ${
                isDark
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              ERP
            </span>
          </div>

          {showTagline && (
            <p
              className={`mt-1 font-medium leading-tight ${config.tagline} ${
                isDark ? 'text-slate-300' : 'text-slate-500'
              }`}
            >
              Modern Furniture & Workshop Workforce
            </p>
          )}
        </div>
      )}
    </div>
  );
};
