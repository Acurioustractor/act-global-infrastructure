
import React from 'react';

type SignalLevel = 'High' | 'Medium' | 'Low' | 'Emerging' | 'None';

interface SignalBarsProps {
    label: string;
    level: SignalLevel;
    color?: string; // Hex or tailwind class base
    showLabel?: boolean;
}

const LEVEL_MAP: Record<SignalLevel, number> = {
    'High': 4,
    'Medium': 3,
    'Emerging': 2,
    'Low': 1,
    'None': 0
};

export default function SignalBars({ label, level, color = '#4CAF50', showLabel = true }: SignalBarsProps) {
    const strength = LEVEL_MAP[level] || 0;
    const maxFunction = 4;

    return (
        <div className="flex flex-col gap-1 min-w-[120px]">
            {showLabel && (
                <div className="flex justify-between text-xs uppercase tracking-wider text-[#6B5A45]">
                    <span>{label}</span>
                    <span className="font-semibold">{level}</span>
                </div>
            )}
            <div className="flex gap-1 h-2">
                {[1, 2, 3, 4].map((barIndex) => (
                    <div
                        key={barIndex}
                        className={`flex-1 rounded-sm transition-all duration-500`}
                        style={{
                            backgroundColor: barIndex <= strength ? color : '#E1D3BA',
                            opacity: barIndex <= strength ? 1 : 0.3
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
