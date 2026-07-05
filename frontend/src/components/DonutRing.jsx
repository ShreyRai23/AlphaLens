import { useEffect, useRef } from 'react';
import './DonutRing.css';

export default function DonutRing({ value = 0, max = 100, size = 120, stroke = 10, color = '#2D1B69', label }) {
  const circleRef = useRef(null);
  const pct = Math.min(Math.max(value / max, 0), 1);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  useEffect(() => {
    if (!circleRef.current) return;
    circleRef.current.style.strokeDashoffset = circ;
    const timer = setTimeout(() => {
      circleRef.current.style.strokeDashoffset = offset;
    }, 100);
    return () => clearTimeout(timer);
  }, [value, circ, offset]);

  return (
    <div className="donut-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--border)" strokeWidth={stroke}
        />
        {/* Progress arc */}
        <circle
          ref={circleRef}
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="donut-center">
        <span className="donut-value">{Math.round(value)}</span>
        {label && <span className="donut-label">{label}</span>}
      </div>
    </div>
  );
}
