import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

// Flat-style SVG illustrations for the "How claims work" guide steps.
// Same visual language as CardIllustrations / illustration-home.png.

export function AddBillIllustration({ size = 56 }: { size?: number }) {
  const ink = '#186E93';
  const soft = '#BFE3F5';
  const amber = '#F59E0B';
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      {/* Receipt */}
      <G>
        <Path
          d="M34 18 h28 a4 4 0 0 1 4 4 v42 a4 4 0 0 1 -4 4 h-28 a4 4 0 0 1 -4 -4 v-42 a4 4 0 0 1 4 -4 z"
          fill="#FFFFFF"
          stroke={ink}
          strokeWidth="2.5"
        />
        <Path
          d="M34 18 a4 4 0 0 1 4 -4 h11 v11 h-19 v-3 a4 4 0 0 1 4 -4 z"
          fill={soft}
          stroke={ink}
          strokeWidth="2.5"
        />
        <Rect x="40" y="32" width="16" height="3.5" rx="1.75" fill={ink} opacity="0.5" />
        <Rect x="40" y="41" width="12" height="3.5" rx="1.75" fill={ink} opacity="0.5" />
        {/* Camera badge */}
        <Circle cx="68" cy="62" r="17" fill="#FFFFFF" stroke={ink} strokeWidth="2.5" />
        <Circle cx="68" cy="62" r="7" fill={soft} stroke={ink} strokeWidth="1.6" />
        <Circle cx="68" cy="62" r="3" fill={ink} opacity="0.6" />
        <Circle cx="78" cy="52" r="2.5" fill={amber} />
      </G>
      {/* Sparkle */}
      <Path
        d="M22 28 l1.7 4.7 4.7 1.7 -4.7 1.7 -1.7 4.7 -1.7 -4.7 -4.7 -1.7 4.7 -1.7 z"
        fill={ink}
        opacity="0.75"
      />
    </Svg>
  );
}

export function SubmitClaimIllustration({ size = 56 }: { size?: number }) {
  const ink = '#0FA98F';
  const soft = '#C4F1E8';
  const green = '#059669';
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      {/* Paper plane */}
      <G>
        <Path
          d="M20 48 L76 26 L64 72 L50 60 L36 68 Z"
          fill="#FFFFFF"
          stroke={ink}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <Path d="M50 60 L46 40" stroke={ink} strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
      </G>
      {/* Motion lines */}
      <Path d="M26 34 h8 M28 25 h10" stroke={ink} strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />
      {/* Sent check seal */}
      <Circle cx="71" cy="70" r="11" fill={soft} stroke={green} strokeWidth="2.2" />
      <Path d="M65.5 70 l4 4 7.5 -8.5" fill="none" stroke={green} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ReviewClaimIllustration({ size = 56 }: { size?: number }) {
  const ink = '#7C3AED';
  const soft = '#DCCBFB';
  const green = '#059669';
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      {/* Clipboard */}
      <G>
        <Rect x="30" y="22" width="36" height="50" rx="5" fill="#FFFFFF" stroke={ink} strokeWidth="2.5" />
        <Rect x="42" y="17" width="12" height="9" rx="3" fill={ink} />
        <Rect x="38" y="32" width="20" height="3.5" rx="1.75" fill={ink} opacity="0.35" />
        <Rect x="38" y="40" width="14" height="3.5" rx="1.75" fill={ink} opacity="0.28" />
        {/* Approved check */}
        <Path d="M40 55 l6 6 12 -15" fill="none" stroke={green} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </G>
      {/* Shield badge */}
      <G>
        <Path
          d="M78 22 L90 27 v9 c0 7.5 -4.5 13.5 -12 17 C70.5 49.5 66 43.5 66 36 v-9 z"
          fill={soft}
          stroke={ink}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <Path d="M73 35.5 l3.5 3.5 6.5 -8" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </G>
      {/* Sparkle */}
      <Path
        d="M22 24 l1.6 4.4 4.4 1.6 -4.4 1.6 -1.6 4.4 -1.6 -4.4 -4.4 -1.6 4.4 -1.6 z"
        fill={ink}
        opacity="0.7"
      />
    </Svg>
  );
}

export function TrackPaidIllustration({ size = 56 }: { size?: number }) {
  const ink = '#059669';
  const soft = '#C7EFDC';
  const amber = '#F59E0B';
  const amberInk = '#B45309';
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      {/* Route */}
      <Path
        d="M26 62 c10 -14 20 6 30 -8 s12 -10 16 -18"
        fill="none"
        stroke={ink}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeDasharray="5 4"
      />
      {/* Start dot */}
      <Circle cx="26" cy="62" r="5" fill={ink} />
      <Circle cx="26" cy="62" r="2" fill="#FFFFFF" />
      {/* Destination pin */}
      <G>
        <Path
          d="M72 20 c-5.5 0 -10 4.5 -10 10 c0 7 10 16 10 16 s10 -9 10 -16 c0 -5.5 -4.5 -10 -10 -10 z"
          fill={ink}
        />
        <Circle cx="72" cy="30" r="4" fill="#FFFFFF" />
      </G>
      {/* Paid coin */}
      <G>
        <Circle cx="72" cy="70" r="12" fill={amber} />
        <Circle cx="72" cy="70" r="7.5" fill="none" stroke={amberInk} strokeWidth="1.8" />
        <Path d="M67.5 70 l3 3 5.5 -6.5" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </G>
      {/* Sparkle */}
      <Path
        d="M20 22 l1.6 4.4 4.4 1.6 -4.4 1.6 -1.6 4.4 -1.6 -4.4 -4.4 -1.6 4.4 -1.6 z"
        fill={ink}
        opacity="0.7"
      />
    </Svg>
  );
}
