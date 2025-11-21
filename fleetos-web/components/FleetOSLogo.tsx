'use client';

import React from 'react';

interface FleetOSLogoProps {
  variant?: 'horizontal-light' | 'horizontal-dark' | 'icon';
  size?: number;
  className?: string;
  showText?: boolean;
}

export const FleetOSLogo: React.FC<FleetOSLogoProps> = ({
  variant = 'horizontal-light',
  size = 200,
  className = '',
  showText = true,
}) => {
  const isHorizontal = variant.includes('horizontal');
  const isDark = variant.includes('dark');
  const isIcon = variant === 'icon';

  if (isIcon) {
    // Icon only - square version with dark background
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="iconBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#0f172a' }} />
            <stop offset="100%" style={{ stopColor: '#1e293b' }} />
          </linearGradient>
          <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#06B6D4' }} />
            <stop offset="100%" style={{ stopColor: '#22D3EE' }} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect fill="url(#iconBg)" width="48" height="48" rx="12" />
        <g filter="url(#glow)">
          <path
            fill="url(#iconGradient)"
            d="M8,24 C8,17.37 13.37,12 20,12 L25,12 L25,16 L20,16 C15.58,16 12,19.58 12,24 C12,28.42 15.58,32 20,32 L25,32 L25,36 L20,36 C13.37,36 8,30.63 8,24 Z"
          />
          <path
            fill="url(#iconGradient)"
            d="M18,20 L36,24 L18,28 Z"
          />
        </g>
      </svg>
    );
  }

  // Horizontal logo with text
  const width = size;
  const height = size * 0.24;
  const textColor = isDark ? '#ffffff' : '#0B132B';

  return (
    <svg
      viewBox="0 0 200 48"
      width={width}
      height={height}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="gLight" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: '#06B6D4' }} />
          <stop offset="100%" style={{ stopColor: '#0891B2' }} />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#glow)">
        <path
          fill="url(#gLight)"
          d="M4,24 C4,17.37 9.37,12 16,12 L20,12 L20,16 L16,16 C11.58,16 8,19.58 8,24 C8,28.42 11.58,32 16,32 L20,32 L20,36 L16,36 C9.37,36 4,30.63 4,24 Z"
        />
        <path fill="url(#gLight)" d="M16,20 L32,24 L16,28 Z" />
      </g>
      {showText && (
        <text
          x="48"
          y="32"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="24"
          fontWeight="700"
          fill={textColor}
          letterSpacing="-0.5"
        >
          FleetOS
        </text>
      )}
    </svg>
  );
};

export default FleetOSLogo;

