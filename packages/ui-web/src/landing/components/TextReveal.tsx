import React from 'react';
import { motion } from 'motion/react';
import { useStudioPreferences } from '@workspace/livex-core';

export interface TextRevealProps {
  text: string;
  className?: string;
  delayOffset?: number;
}

export default function TextReveal({
  text,
  className = '',
  delayOffset = 0,
}: TextRevealProps) {
  const { preferences } = useStudioPreferences();
  const isReduced = preferences.reduceMotion;

  const words = text.split(' ');

  if (isReduced) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={`inline-block ${className}`}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden mr-[0.28em] last:mr-0 align-baseline">
          <motion.span
            initial={{ opacity: 0, y: 10, filter: 'blur(3px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{
              duration: 0.45,
              ease: [0.16, 1, 0.3, 1],
              delay: delayOffset + i * 0.025,
            }}
            className="inline-block"
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
