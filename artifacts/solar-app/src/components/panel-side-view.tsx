interface PanelSideViewProps {
  tilt: number;
  color: string;
  isBest?: boolean;
  energyWh?: number;
}

export default function PanelSideView({ tilt, color, isBest, energyWh }: PanelSideViewProps) {
  const W = 180;
  const H = 150;
  const groundY = 112;
  const pivotX = 52;
  const pivotY = groundY;
  const panelLen = 88;
  const panelThick = 5;

  const tiltRad = (tilt * Math.PI) / 180;

  const tipX = pivotX + panelLen * Math.cos(tiltRad);
  const tipY = pivotY - panelLen * Math.sin(tiltRad);

  const arcR = 28;
  const arcEndX = pivotX + arcR * Math.cos(tiltRad);
  const arcEndY = pivotY - arcR * Math.sin(tiltRad);

  const labelR = arcR + 14;
  const midAngle = tiltRad / 2;
  const labelX = pivotX + labelR * Math.cos(midAngle);
  const labelY = pivotY - labelR * Math.sin(midAngle) + 4;

  const perpX = -Math.sin(tiltRad);
  const perpY = -Math.cos(tiltRad);

  const panelX = pivotX + panelLen * Math.cos(tiltRad);
  const panelY = pivotY - panelLen * Math.sin(tiltRad);
  const backX = pivotX + perpX * panelThick;
  const backY = pivotY + perpY * panelThick;
  const backTipX = panelX + perpX * panelThick;
  const backTipY = panelY + perpY * panelThick;

  const shadowOffX = 2;
  const shadowOffY = 3;

  const numCells = 4;
  const cellLines = Array.from({ length: numCells - 1 }, (_, i) => {
    const t = (i + 1) / numCells;
    return {
      x1: pivotX + t * panelLen * Math.cos(tiltRad),
      y1: pivotY - t * panelLen * Math.sin(tiltRad),
      x2: pivotX + t * panelLen * Math.cos(tiltRad) + perpX * panelThick,
      y2: pivotY - t * panelLen * Math.sin(tiltRad) + perpY * panelThick,
    };
  });

  return (
    <div className="relative">
      {isBest && (
        <div
          className="absolute -top-2 -right-2 z-10 text-[10px] font-bold px-2 py-0.5 rounded-full shadow"
          style={{ backgroundColor: color, color: "#fff" }}
        >
          최적
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: "block" }}
        aria-label={`경사각 ${tilt}도 측면 구조`}
      >
        <defs>
          <linearGradient id={`sky-${tilt}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#f0f9ff" stopOpacity="0.2" />
          </linearGradient>
          <pattern id={`hatch-${tilt}`} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#d1d5db" strokeWidth="1" />
          </pattern>
          <filter id={`shadow-${tilt}`} x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodColor="#00000030" />
          </filter>
        </defs>

        {/* Sky */}
        <rect x="0" y="0" width={W} height={groundY} fill={`url(#sky-${tilt})`} />

        {/* Sun */}
        <circle cx={W - 22} cy={20} r={9} fill="#fbbf24" opacity="0.9" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          return (
            <line
              key={angle}
              x1={W - 22 + 12 * Math.cos(rad)}
              y1={20 + 12 * Math.sin(rad)}
              x2={W - 22 + 16 * Math.cos(rad)}
              y2={20 + 16 * Math.sin(rad)}
              stroke="#fbbf24"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.8"
            />
          );
        })}

        {/* Ground fill */}
        <rect x="0" y={groundY} width={W} height={H - groundY} fill={`url(#hatch-${tilt})`} opacity="0.5" />
        <rect x="0" y={groundY} width={W} height={H - groundY} fill="#f3f4f6" opacity="0.3" />

        {/* Ground line */}
        <line x1="0" y1={groundY} x2={W} y2={groundY} stroke="#9ca3af" strokeWidth="1.5" />

        {/* Mounting base plate */}
        <rect x={pivotX - 10} y={groundY - 3} width={20} height={5} rx="1" fill="#6b7280" />

        {/* Mounting post */}
        <rect x={pivotX - 2.5} y={groundY - 16} width={5} height={14} rx="1" fill="#9ca3af" />

        {/* Angle arc */}
        {tilt > 2 && (
          <>
            <line
              x1={pivotX}
              y1={pivotY - 16}
              x2={pivotX + arcR * 0.85}
              y2={pivotY - 16}
              stroke="#d1d5db"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
            <path
              d={`M ${pivotX + arcR} ${pivotY - 16} A ${arcR} ${arcR} 0 ${tilt > 180 ? 1 : 0} 0 ${arcEndX} ${arcEndY - 16}`}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              strokeDasharray="3 2"
              opacity="0.75"
            />
            <text
              x={labelX}
              y={labelY - 16}
              fontSize="10"
              fontWeight="700"
              fill={color}
              textAnchor="middle"
              fontFamily="monospace"
            >
              {tilt}°
            </text>
          </>
        )}
        {tilt <= 2 && (
          <text x={pivotX + 20} y={pivotY - 20} fontSize="10" fontWeight="700" fill={color} fontFamily="monospace">
            {tilt}°
          </text>
        )}

        {/* Panel shadow */}
        <polygon
          points={`
            ${pivotX + shadowOffX},${pivotY + shadowOffY}
            ${tipX + shadowOffX},${tipY + shadowOffY}
            ${backTipX + shadowOffX},${backTipY + shadowOffY}
            ${backX + shadowOffX},${backY + shadowOffY}
          `}
          fill="#00000020"
        />

        {/* Panel back surface (dark) */}
        <polygon
          points={`
            ${pivotX},${pivotY}
            ${tipX},${tipY}
            ${backTipX},${backTipY}
            ${backX},${backY}
          `}
          fill="#374151"
          rx="1"
        />

        {/* Panel front surface */}
        <polygon
          points={`
            ${pivotX},${pivotY}
            ${tipX},${tipY}
            ${backTipX},${backTipY}
            ${backX},${backY}
          `}
          fill={color}
          opacity="0.88"
        />

        {/* Cell divider lines on panel */}
        {cellLines.map((line, i) => (
          <line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="white"
            strokeWidth="0.8"
            opacity="0.4"
          />
        ))}

        {/* Panel highlight edge */}
        <line
          x1={pivotX}
          y1={pivotY}
          x2={tipX}
          y2={tipY}
          stroke="white"
          strokeWidth="1"
          opacity="0.3"
        />

        {/* Ground shadow under panel (projected shadow) */}
        {tilt > 5 && (
          <line
            x1={pivotX}
            y1={groundY}
            x2={Math.min(pivotX + panelLen * Math.cos(tiltRad), W - 4)}
            y2={groundY}
            stroke="#00000018"
            strokeWidth="4"
          />
        )}

        {/* Energy label if provided */}
        {energyWh !== undefined && (
          <text
            x={W - 6}
            y={H - 6}
            fontSize="9"
            fontWeight="600"
            fill={color}
            textAnchor="end"
            fontFamily="monospace"
            opacity="0.9"
          >
            {(energyWh / 1000).toFixed(2)} kWh
          </text>
        )}
      </svg>
    </div>
  );
}
