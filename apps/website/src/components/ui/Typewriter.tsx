'use client';

import { useState, useEffect } from 'react';

interface TypewriterProps {
    text: string;
    speed?: number;
    className?: string;
    cursor?: boolean;
}

export function Typewriter({ text, speed = 30, className = "", cursor = true }: TypewriterProps) {
    const [displayedText, setDisplayedText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText(prev => prev + text[currentIndex]);
                setCurrentIndex(prev => prev + 1);
            }, speed);

            return () => clearTimeout(timeout);
        }
    }, [currentIndex, speed, text]);

    return (
        <span className={className}>
            {displayedText}
            {cursor && currentIndex < text.length && (
                <span className="animate-pulse ml-1 inline-block w-2 h-4 bg-green-500 align-middle"></span>
            )}
        </span>
    );
}
