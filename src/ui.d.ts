// packages/ui/src/ui.d.ts

/**
 * @fileoverview UI Type Declarations
 * @description Type declarations for UI package module exports. Provides TypeScript definitions for PostCSS configuration modules.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

declare module '@donotdev/ui/dndev.css' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}
