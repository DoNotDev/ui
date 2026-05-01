// packages/ui/src/internal/layout/config/presets/plain.tsx

/**
 * @fileoverview Plain Preset Configuration
 * @description No UI chrome - full viewport for content.
 * Perfect for embedded widgets, full-screen apps, modal overlays.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import type { PresetConfig } from '@donotdev/core';

/**
 * Plain preset - no UI chrome, full viewport for content.
 *
 * Use cases:
 * - Embedded widgets and iframes
 * - Full-screen applications
 * - Presentation modes
 * - Modal overlays
 * - Single-purpose utilities
 */
export const plainPreset: PresetConfig = {
  name: 'plain',
  header: {
    start: () => null,
    center: () => null,
    end: () => null,
  },
  sidebar: {
    top: () => null,
    content: () => null,
    bottom: () => null,
  },
  footer: null,
};
