import React from "react";
import Svg, { Path } from "react-native-svg";

export function SolanaLogo({
  size = 24,
  color = "#000000",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 397 312" fill="none">
      {/* Top bar */}
      <Path
        d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h320.7c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"
        fill={color}
      />
      {/* Middle bar */}
      <Path
        d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h320.7c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"
        fill={color}
      />
      {/* Bottom bar */}
      <Path
        d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H3.2c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h320.7c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"
        fill={color}
      />
    </Svg>
  );
}
