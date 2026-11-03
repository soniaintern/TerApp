import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

// Mini flat illustrations for the Home quick-action cards.
// Drawn in the same flat style as illustration-home.png, one color family per
// card. Colors are baked in so each card keeps its identity on both themes.

export function TerClaimIllustration({ size = 54 }: { size?: number }) {
  const ink = '#186E93';
  const soft = '#BFE3F5';
  const coin = '#F59E0B';
  const coinInk = '#B45309';
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      {/* Receipt with folded corner */}
      <G>
        <Path
          d="M32 20 h30 a4 4 0 0 1 4 4 v48 a4 4 0 0 1 -4 4 h-30 a4 4 0 0 1 -4 -4 v-48 a4 4 0 0 1 4 -4 z"
          fill="#FFFFFF"
          stroke={ink}
          strokeWidth="2.5"
        />
        <Path
          d="M32 20 a4 4 0 0 1 4 -4 h12 v12 h-20 v-4 a4 4 0 0 1 4 -4 z"
          fill={soft}
          stroke={ink}
          strokeWidth="2.5"
        />
        <Rect x="38" y="36" width="24" height="4" rx="2" fill={ink} opacity="0.5" />
        <Rect x="38" y="47" width="18" height="4" rx="2" fill={ink} opacity="0.5" />
        <Rect x="38" y="58" width="22" height="4" rx="2" fill={ink} opacity="0.5" />
        {/* Approved stamp */}
        <Circle cx="60" cy="52" r="10" fill="none" stroke="#13C7A8" strokeWidth="2.2" opacity="0.7" />
        <Circle cx="60" cy="52" r="4" fill="#13C7A8" opacity="0.85" />
      </G>
      {/* Floating coin */}
      <Circle cx="72" cy="72" r="12" fill={coin} />
      <Circle cx="72" cy="72" r="7.5" fill="none" stroke={coinInk} strokeWidth="1.8" />
      <Path d="M67.5 72 h9 M72 67.5 v9" stroke={coinInk} strokeWidth="1.6" strokeLinecap="round" />
      {/* Sparkle */}
      <Path
        d="M22 26 l1.7 4.7 4.7 1.7 -4.7 1.7 -1.7 4.7 -1.7 -4.7 -4.7 -1.7 4.7 -1.7 z"
        fill={ink}
        opacity="0.75"
      />
    </Svg>
  );
}

export function TravelPlanIllustration({ size = 54 }: { size?: number }) {
  const ink = '#6F8854';
  const soft = '#D4E6C8';
  const route = '#C68E31';
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      {/* Folded map */}
      <G>
        <Path
          d="M26 22 h40 a4 4 0 0 1 4 4 v44 a4 4 0 0 1 -4 4 h-40 a4 4 0 0 1 -4 -4 v-44 a4 4 0 0 1 4 -4 z"
          fill={soft}
          stroke={ink}
          strokeWidth="2.5"
        />
        <Path d="M34 22 v52 M52 22 v52" stroke={ink} strokeWidth="1.6" opacity="0.45" />
        {/* Route */}
        <Path
          d="M36 56 c6 -10 12 6 18 -6 s10 -8 14 -14"
          fill="none"
          stroke={route}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeDasharray="5 4"
        />
        <Circle cx="36" cy="56" r="5" fill={ink} />
        <Circle cx="36" cy="56" r="2" fill="#FFFFFF" />
        {/* Destination pin */}
        <G>
          <Path
            d="M68 26 c0 -5.5 -4.5 -10 -10 -10 s-10 4.5 -10 10 c0 7 10 16 10 16 s10 -9 10 -16 z"
            fill={route}
          />
          <Circle cx="58" cy="26" r="4" fill="#FFFFFF" />
        </G>
      </G>
      {/* Calendar chip */}
      <G>
        <Rect x="62" y="58" width="20" height="20" rx="4" fill="#FFFFFF" stroke={ink} strokeWidth="2" />
        <Path d="M66 55 v5 M78 55 v5" stroke={ink} strokeWidth="2" strokeLinecap="round" />
        <Rect x="66" y="63" width="12" height="3" rx="1.5" fill={ink} opacity="0.55" />
        <Rect x="66" y="70" width="9" height="3" rx="1.5" fill={ink} opacity="0.4" />
      </G>
      {/* Sparkle */}
      <Path
        d="M22 30 l1.7 4.7 4.7 1.7 -4.7 1.7 -1.7 4.7 -1.7 -4.7 -4.7 -1.7 4.7 -1.7 z"
        fill={ink}
        opacity="0.7"
      />
    </Svg>
  );
}

export function TrackTerIllustration({ size = 54 }: { size?: number }) {
  const ink = '#C68E31';
  const soft = '#F5DFB8';
  const teal = '#186E93';
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      {/* Magnifier */}
      <G>
        <Circle cx="42" cy="44" r="22" fill="#FFFFFF" stroke={ink} strokeWidth="3" />
        <Circle cx="42" cy="44" r="14" fill={soft} opacity="0.8" />
        {/* Route inside */}
        <Path
          d="M33 48 c3 -7 8 5 12 -3 s5 -4 8 -7"
          fill="none"
          stroke={ink}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <Circle cx="33" cy="48" r="3" fill={teal} />
        <Circle cx="53" cy="38" r="3" fill="#13C7A8" />
        <Path
          d="M56 60 L72 76"
          stroke={ink}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <Path d="M56 60 L72 76" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      </G>
      {/* Tick */}
      <Path d="M52 40 l4 4 8 -9" fill="none" stroke="#13C7A8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {/* Sparkles */}
      <Path
        d="M24 20 l1.6 4.4 4.4 1.6 -4.4 1.6 -1.6 4.4 -1.6 -4.4 -4.4 -1.6 4.4 -1.6 z"
        fill={teal}
        opacity="0.75"
      />
      <Path
        d="M78 22 l1.3 3.5 3.5 1.3 -3.5 1.3 -1.3 3.5 -1.3 -3.5 -3.5 -1.3 3.5 -1.3 z"
        fill={ink}
        opacity="0.7"
      />
    </Svg>
  );
}

export function SupervisorIllustration({ size = 54 }: { size?: number }) {
  const ink = '#7C3AED';
  const soft = '#DCCBFB';
  const teal = '#13C7A8';
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      {/* Shield */}
      <G>
        <Path
          d="M48 18 L70 26 v16 c0 14 -8.5 25 -22 32 C34 67 26 56 26 42 v-16 z"
          fill={soft}
          stroke={ink}
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        {/* Check */}
        <Path d="M40 47 l6 6 11 -13" fill="none" stroke={teal} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </G>
      {/* Team dots */}
      <Circle cx="26" cy="76" r="5" fill={ink} opacity="0.55" />
      <Circle cx="70" cy="76" r="5" fill={ink} opacity="0.55" />
      {/* Sparkle */}
      <Path
        d="M20 24 l1.7 4.7 4.7 1.7 -4.7 1.7 -1.7 4.7 -1.7 -4.7 -4.7 -1.7 4.7 -1.7 z"
        fill={ink}
        opacity="0.7"
      />
    </Svg>
  );
}

export function L1ApprovalIllustration({ size = 54 }: { size?: number }) {
  const ink = '#4F46E5';
  const soft = '#C7D2FE';
  const teal = '#13C7A8';
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      {/* Shield */}
      <G>
        <Path
          d="M48 18 L70 26 v16 c0 14 -8.5 25 -22 32 C34 67 26 56 26 42 v-16 z"
          fill={soft}
          stroke={ink}
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        {/* Single check */}
        <Path d="M40 47 l6 6 11 -13" fill="none" stroke={teal} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </G>
      {/* Stacked claim slips */}
      <G>
        <Rect x="58" y="58" width="22" height="26" rx="4" fill="#FFFFFF" stroke={ink} strokeWidth="2" />
        <Rect x="63" y="64" width="12" height="3" rx="1.5" fill={ink} opacity="0.5" />
        <Rect x="63" y="71" width="12" height="3" rx="1.5" fill={ink} opacity="0.5" />
        <Rect x="63" y="78" width="8" height="3" rx="1.5" fill={ink} opacity="0.35" />
      </G>
      {/* Sparkle */}
      <Path
        d="M22 26 l1.7 4.7 4.7 1.7 -4.7 1.7 -1.7 4.7 -1.7 -4.7 -4.7 -1.7 4.7 -1.7 z"
        fill={ink}
        opacity="0.7"
      />
    </Svg>
  );
}

export function L2ApprovalIllustration({ size = 54 }: { size?: number }) {
  const ink = '#7C3AED';
  const soft = '#DCCBFB';
  const gold = '#B45309';
  const coin = '#F59E0B';
  const coinInk = '#B45309';
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      {/* Shield with double check */}
      <G>
        <Path
          d="M48 18 L70 26 v16 c0 14 -8.5 25 -22 32 C34 67 26 56 26 42 v-16 z"
          fill={soft}
          stroke={ink}
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        {/* Double check */}
        <Path d="M34 46 l6 6 10 -12" fill="none" stroke="#13C7A8" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M45 46 l6 6 10 -12" fill="none" stroke={gold} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </G>
      {/* Approved coin */}
      <Circle cx="70" cy="74" r="11" fill={coin} />
      <Circle cx="70" cy="74" r="7" fill="none" stroke={coinInk} strokeWidth="1.8" />
      <Path d="M66 74 h8 M70 70 v8" stroke={coinInk} strokeWidth="1.6" strokeLinecap="round" />
      {/* Sparkle */}
      <Path
        d="M20 24 l1.7 4.7 4.7 1.7 -4.7 1.7 -1.7 4.7 -1.7 -4.7 -4.7 -1.7 4.7 -1.7 z"
        fill={ink}
        opacity="0.7"
      />
    </Svg>
  );
}

export function MyAccountIllustration({ size = 54 }: { size?: number }) {
  const ink = '#3D6F94';
  const soft = '#C9DCEB';
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      {/* Person bust */}
      <G>
        <Circle cx="38" cy="34" r="13" fill={soft} stroke={ink} strokeWidth="2.6" />
        <Path
          d="M20 76 c0 -13 8.5 -20 18 -20 s18 7 18 20 z"
          fill={soft}
          stroke={ink}
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
      </G>
      {/* ID card */}
      <G>
        <Rect x="56" y="30" width="24" height="32" rx="5" fill="#FFFFFF" stroke={ink} strokeWidth="2.4" />
        <Rect x="61" y="36" width="14" height="9" rx="2" fill={soft} stroke={ink} strokeWidth="1.4" />
        <Rect x="61" y="50" width="14" height="2.5" rx="1.25" fill={ink} opacity="0.5" />
        <Rect x="61" y="56" width="10" height="2.5" rx="1.25" fill={ink} opacity="0.35" />
      </G>
      {/* Sparkle */}
      <Path
        d="M22 22 l1.7 4.7 4.7 1.7 -4.7 1.7 -1.7 4.7 -1.7 -4.7 -4.7 -1.7 4.7 -1.7 z"
        fill={ink}
        opacity="0.7"
      />
    </Svg>
  );
}
