"use client";

import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";

export interface AudioLinesIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface AudioLinesIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const AudioLinesIcon = forwardRef<AudioLinesIconHandle, AudioLinesIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <line x1="2" y1="10" x2="2" y2="13" />
          <motion.line
            animate={controls}
            initial="normal"
            variants={{
              normal: { scaleY: 1 },
              inactive: { scaleY: 1 },
              active: { scaleY: 1 },
              animate: {
                scaleY: [1, 0.35, 1],
                transition: {
                  duration: 0.6,
                  repeat: 0,
                },
              },
            }}
            style={{ originY: 0.5 }}
            x1="6"
            y1="6"
            x2="6"
            y2="17"
          />
          <motion.line
            animate={controls}
            initial="normal"
            variants={{
              normal: { scaleY: 1 },
              inactive: { scaleY: 1 },
              active: { scaleY: 1 },
              animate: {
                scaleY: [1, 0.45, 1],
                transition: {
                  duration: 0.6,
                  repeat: 0,
                },
              },
            }}
            style={{ originY: 0.5 }}
            x1="10"
            y1="3"
            x2="10"
            y2="21"
          />
          <motion.line
            animate={controls}
            initial="normal"
            variants={{
              normal: { scaleY: 1 },
              inactive: { scaleY: 1 },
              active: { scaleY: 1 },
              animate: {
                scaleY: [1, 1.35, 1],
                transition: {
                  duration: 0.6,
                  repeat: 0,
                },
              },
            }}
            style={{ originY: 0.5 }}
            x1="14"
            y1="8"
            x2="14"
            y2="15"
          />
          <motion.line
            animate={controls}
            initial="normal"
            variants={{
              normal: { scaleY: 1 },
              inactive: { scaleY: 1 },
              active: { scaleY: 1 },
              animate: {
                scaleY: [1, 0.3, 1],
                transition: {
                  duration: 0.6,
                  repeat: 0,
                },
              },
            }}
            style={{ originY: 0.5 }}
            x1="18"
            y1="5"
            x2="18"
            y2="18"
          />
          <line x1="22" y1="10" x2="22" y2="13" />
        </svg>
      </div>
    );
  }
);

AudioLinesIcon.displayName = "AudioLinesIcon";

export { AudioLinesIcon };
