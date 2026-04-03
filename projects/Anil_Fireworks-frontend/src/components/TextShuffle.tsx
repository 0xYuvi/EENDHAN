import React, { useState, useEffect, useRef } from 'react';

interface TextShuffleProps {
  text: string;
  duration?: number;
  triggerOnHover?: boolean;
}

const TextShuffle: React.FC<TextShuffleProps> = ({
  text,
  duration = 0.95,
  triggerOnHover = true
}) => {
  const [displayText, setDisplayText] = useState(text);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()_+';
  const intervalRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);

  const shuffle = () => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    let iteration = 0;
    const maxIterations = 30; // approx 0.95s at 30fps

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = window.setInterval(() => {
      setDisplayText((prev) =>
        text
          .split('')
          .map((char, index) => {
            if (index < iteration) {
              return text[index];
            }
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('')
      );

      if (iteration >= text.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        isAnimatingRef.current = false;
      }

      iteration += text.length / maxIterations;
    }, 30);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <span
      onMouseEnter={triggerOnHover ? shuffle : undefined}
      style={{
        cursor: 'default',
        display: 'inline-block',
        minWidth: `${text.length}ch`,
        fontFamily: 'monospace'
      }}
    >
      {displayText}
    </span>
  );
};

export default TextShuffle;
