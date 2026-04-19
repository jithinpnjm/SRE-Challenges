import React from 'react';
import { motion } from 'motion/react';

interface AudioVisualizerProps {
  volume: number;
  active: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ volume, active }) => {
  const bars = Array.from({ length: 12 });

  return (
    <div className="flex items-center justify-center gap-1 h-12" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '48px' }}>
      {bars.map((_, i) => (
        <motion.div
          key={i}
          animate={{
            height: active ? Math.max(4, volume * 100 * (0.5 + Math.random())) : 4,
          }}
          transition={{
            type: "spring",
            bounce: 0.5,
            duration: 0.1,
          }}
          style={{
            width: '4px',
            borderRadius: '9999px',
            backgroundColor: active ? 'var(--ifm-color-primary)' : '#555',
          }}
        />
      ))}
    </div>
  );
};
