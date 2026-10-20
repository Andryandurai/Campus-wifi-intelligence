import React from 'react';

interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  className?: string;
  color?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, max = 100, className = '', color }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  // Determine color based on threshold if not explicitly provided
  let fillColor = color;
  if (!fillColor) {
    if (percentage >= 85) fillColor = 'bg-red-500';
    else if (percentage >= 70) fillColor = 'bg-amber-500';
    else if (percentage >= 45) fillColor = 'bg-yellow-400';
    else fillColor = 'bg-emerald-500';
  }

  return (
    <div className={`relative h-2 w-full overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <div
        className={`h-full transition-all duration-500 ease-out ${fillColor}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

