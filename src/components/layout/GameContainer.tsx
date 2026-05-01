// packages/ui/src/components/layout/GameContainer.tsx

/**
 * @fileoverview Game Container - Content + CTA grid layout for game screens
 * @description Provides scrollable content area with fixed CTA button at bottom
 * @package @donotdev/ui
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { Button, ScrollArea } from '@donotdev/components';
import { cn } from '@donotdev/components';

import type { ReactNode } from 'react';

/**
 * CTA button definition
 */
export interface CTAButton {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
}

/**
 * GameContainer props
 */
export interface GameContainerProps {
  /** Main content area (scrollable, centered by default) */
  content: ReactNode;

  /** Optional fixed CTA button(s) at bottom - single button or array for multiple buttons */
  cta?: CTAButton | CTAButton[];

  /** Alignment variant for content area */
  align?: 'center' | 'start' | 'stretch';

  /** Justify variant for content area */
  justify?: 'center' | 'start' | 'end' | 'between';

  /** Disable ScrollArea (use plain overflow) - for interactive content */
  disableScrollArea?: boolean;

  /** Content width: 'narrow' (default, constrained) or 'full' */
  contentVariant?: 'full' | 'narrow';

  /** Additional className for content wrapper */
  contentClassName?: string;

  /** Additional className for CTA button */
  ctaClassName?: string;
}

/**
 * GameContainer - Content + CTA grid layout for game screens
 *
 * Provides scrollable content area with optional fixed CTA button at bottom.
 * Used for game sessions, onboarding flows, wizards, assessments, tutorials.
 *
 * Layout Zones:
 * - Content: Scrollable (ScrollArea), centered by default (customizable)
 * - CTA: Fixed at bottom, full-width touch target (48px)
 *
 * Default Behavior:
 * - Content is horizontally + vertically centered
 * - ScrollArea enabled for cross-browser scroll styling
 * - CTA has 16px top padding + 2px border separator
 *
 * @param {GameContainerProps} props - Component props
 * @returns {JSX.Element} GameContainer component
 *
 * @example
 * Basic usage (centered content + CTA)
 * ```tsx
 * <GameContainer
 *   content={
 *     <div className="max-w-2xl">
 *       <h1>Welcome</h1>
 *       <p>Let's get started</p>
 *     </div>
 *   }
 *   cta={{ label: 'Start', onClick: handleStart }}
 * />
 * ```
 *
 * @example
 * Full-width form (no centering)
 * ```tsx
 * <GameContainer
 *   align="stretch"
 *   justify="start"
 *   content={<FullWidthForm />}
 *   cta={{ label: 'Submit', onClick: handleSubmit }}
 * />
 * ```
 *
 * @example
 * Multiple CTA buttons (side by side)
 * ```tsx
 * <GameContainer
 *   content={<ChallengeContent />}
 *   cta={[
 *     { label: 'Accept', onClick: handleAccept, variant: 'default' },
 *     { label: 'Decline', onClick: handleDecline, variant: 'outline' }
 *   ]}
 * />
 * ```
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export function GameContainer({
  content,
  cta,
  align = 'center',
  justify = 'center',
  disableScrollArea = false,
  contentVariant = 'narrow',
  contentClassName,
  ctaClassName,
}: GameContainerProps) {
  const narrowWrapper = contentVariant === 'narrow' && (
    <div className="dndev-game-container__content-narrow">{content}</div>
  );
  const scrollContent = contentVariant === 'narrow' ? narrowWrapper : content;

  const contentInner = disableScrollArea ? (
    <div
      style={{
        overflow: 'auto',
        overscrollBehavior: 'contain',
        height: '100%',
      }}
    >
      {scrollContent}
    </div>
  ) : (
    <ScrollArea className="dndev-game-container__scroll">
      {scrollContent}
    </ScrollArea>
  );

  return (
    <div className="dndev-game-container">
      {/* Content Area - Scrollable (full width, scrollbar at viewport edge) */}
      <div
        className={cn('dndev-game-container__content', contentClassName)}
        data-align={align}
        data-justify={justify}
        data-content-variant={contentVariant}
      >
        <div className="dndev-game-container__scroll-wrapper">
          {contentInner}
        </div>
      </div>

      {/* CTA Zone - Fixed at bottom */}
      {cta && (
        <div className={cn('dndev-game-container__cta', ctaClassName)}>
          {Array.isArray(cta) ? (
            <div className="dndev-game-container__cta-buttons">
              {cta.map((button, index) => (
                <Button
                  key={index}
                  onClick={button.onClick}
                  disabled={button.disabled ?? false}
                  variant={button.variant ?? 'default'}
                  className="dndev-game-container__cta-button"
                  fullWidth
                >
                  {button.label}
                </Button>
              ))}
            </div>
          ) : (
            <Button
              onClick={cta.onClick}
              disabled={cta.disabled ?? false}
              variant={cta.variant ?? 'default'}
              className="dndev-game-container__cta-button"
            >
              {cta.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
