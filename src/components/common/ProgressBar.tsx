'use client';
// packages/ui/src/components/common/ProgressBar.tsx

/**
 * @fileoverview ProgressBar component
 * @description Progress bar component with animation support
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { useEffect, useState } from 'react';

import { cn } from '@donotdev/components';

import type { ComponentType } from 'react';

interface ProgressBarProps {
  /** Whether the progress bar is active */
  isActive?: boolean;

  /** Manual progress value (0-100) */
  progress?: number;

  /** Whether to use fake progress animation */
  useFakeProgress?: boolean;

  /** Duration of fake progress animation in ms */
  duration?: number;

  /** Additional CSS classes */
  className?: string;

  /** Whether to show the progress bar */
  show?: boolean;
}

/**
 * ProgressBar - A top progress bar for navigation and page transitions
 *
 * Features:
 * - Smooth progress animations
 * - Fake progress simulation for better UX
 * - Configurable duration and behavior
 * - Accessibility support
 * - Auto-hide on completion
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
const ProgressBar: ComponentType<ProgressBarProps> = ({
  isActive = false,
  progress: controlledProgress,
  useFakeProgress = true,
  duration = 2000,
  className,
  show = true,
}) => {
  const [fakeProgress, setFakeProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Handle fake progress animation
  useEffect(() => {
    if (!isActive || !useFakeProgress || controlledProgress !== undefined) {
      return;
    }

    setIsVisible(true);
    setFakeProgress(0);

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 90, 90); // Cap at 90% for fake progress
      setFakeProgress(newProgress);
    }, 16); // ~60fps

    return () => {
      clearInterval(interval);
    };
  }, [isActive, useFakeProgress, controlledProgress, duration]);

  // Handle controlled progress
  useEffect(() => {
    if (controlledProgress !== undefined) {
      setIsVisible(controlledProgress > 0 && controlledProgress < 100);
    }
  }, [controlledProgress]);

  // Auto-hide when complete
  useEffect(() => {
    if (!isActive) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setFakeProgress(0);
      }, 300); // Small delay to show completion

      return () => clearTimeout(timer);
    }
  }, [isActive]);

  const currentProgress = controlledProgress ?? fakeProgress;

  if (!show || !isVisible) {
    return null;
  }

  return (
    <div
      className={cn(className)}
      style={{
        position: 'fixed',
        insetInlineStart: 0,
        insetInlineEnd: 0,
        zIndex: 9999,
        height: '4px',
        backgroundColor: 'transparent',
        top: 'var(--header-height, 0px)',
      }}
      role="progressbar"
      aria-valuenow={Math.round(currentProgress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page loading progress"
    >
      <div
        style={{
          height: '100%',
          width: `${currentProgress}%`,
          background:
            'linear-gradient(to right, var(--primary), color-mix(in srgb, var(--primary) 80%, transparent), color-mix(in srgb, var(--primary) 60%, transparent))',
          transition: isActive ? 'width 0.3s ease-out' : 'width 0.2s ease-in',
          boxShadow: 'var(--shadow-sm)',
        }}
      />
    </div>
  );
};

export default ProgressBar;
