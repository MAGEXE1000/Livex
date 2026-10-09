import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStudioPreferences } from '@workspace/livex-core';

export interface TextMorphProps {
  words: string[];
  intervalMs?: number;
  className?: string;
}

export default function TextMorph({
  words,
  intervalMs = 3200,
  className = '',
}: TextMorphProps) {
  const [index, setIndex] = useState(0);
  const { preferences } = useStudioPreferences();
  const isReduced = preferences.reduceMotion;

  useEffect(() => {
    if (words.length <= 1 || isReduced) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [words.length, intervalMs, isReduced]);

  const currentWord = words[index] || words[0] || '';

  if (isReduced) {
    return <span className={`inline-block ${className}`}>{currentWord}</span>;
  }

  return (
    <span className={`relative inline-flex items-center overflow-hidden align-middle ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={currentWord}
          initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -14, filter: 'blur(4px)' }}
          transition={{
            duration: 0.38,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="inline-block whitespace-nowrap bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent font-semibold"
        >
          {currentWord}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
