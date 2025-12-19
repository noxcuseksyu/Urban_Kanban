import React, { useMemo } from 'react';

interface SnowflakeProps {
  id: number;
}

const Snowflake: React.FC<SnowflakeProps> = ({ id }) => {
  const style = useMemo(() => {
    const size = Math.random() * 4 + 2;
    const left = Math.random() * 100;
    const duration = Math.random() * 10 + 10;
    const delay = Math.random() * -20;
    const opacity = Math.random() * 0.5 + 0.2;
    const drift = (Math.random() - 0.5) * 50;

    return {
      '--size': `${size}px`,
      '--left': `${left}%`,
      '--duration': `${duration}s`,
      '--delay': `${delay}s`,
      '--opacity': opacity,
      '--drift': `${drift}px`,
    } as React.CSSProperties;
  }, []);

  return (
    <div 
      className="snowflake fixed top-[-5vh] pointer-events-none z-[1]"
      style={style}
    >
      ❄
    </div>
  );
};

export const SnowEffect: React.FC = () => {
  const snowflakes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[1]">
      {snowflakes.map(id => (
        <Snowflake key={id} id={id} />
      ))}
      <style>{`
        .snowflake {
          color: #fff;
          font-size: var(--size);
          left: var(--left);
          opacity: var(--opacity);
          animation: fall var(--duration) linear var(--delay) infinite;
          filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.3));
          will-change: transform;
        }

        @keyframes fall {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
          }
          50% {
            transform: translateY(50vh) translateX(var(--drift)) rotate(180deg);
          }
          100% {
            transform: translateY(110vh) translateX(0) rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};