// packages/ui/src/components/layout/components/FloatingLanguageSwitcher.tsx

/**
 * @fileoverview FloatingLanguageSwitcher - Floating language selector for estate/hotel layout
 * @description Bottom-right, accessible, fully prop-driven.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import type { ComponentType } from 'react';

import { Card, cn } from '@donotdev/components';

/** Props for the FloatingLanguageSwitcher component. */
export interface FloatingLanguageSwitcherProps {
  languages: string[];
  currentLanguage: string;
  onLanguageChange?: (lang: string) => void;
  className?: string;
}

/**
 * FloatingLanguageSwitcher - Professional, floating language selector
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
const FloatingLanguageSwitcher: ComponentType<
  FloatingLanguageSwitcherProps
> = ({ languages, currentLanguage, onLanguageChange, className }) => {
  return (
    <Card
      className={cn('dndev-z-modal', className)}
      style={{
        position: 'fixed',
        bottom: 'var(--gap-md)',
        insetInlineEnd: 'var(--gap-md)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--gap-sm)',
        transition: 'var(--dur-fast) ease-out',
      }}
      role="region"
      aria-label="Language selector"
      data-role="floating"
    >
      <select
        style={{
          backgroundColor: 'transparent',
          outline: 'none',
          fontSize: 'var(--font-size-base)',
          cursor: 'pointer',
        }}
        value={currentLanguage}
        onChange={(e) => onLanguageChange?.(e.target.value)}
        aria-label="Select language"
      >
        {languages.map((lang) => (
          <option key={lang} value={lang}>
            {lang}
          </option>
        ))}
      </select>
    </Card>
  );
};

export default FloatingLanguageSwitcher;
