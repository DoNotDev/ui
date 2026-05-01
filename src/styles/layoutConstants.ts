// packages/ui/src/styles/layoutConstants.ts

/**
 * @fileoverview Layout constants
 * @description Layout component class names and CSS selectors
 * Used for IDE autocomplete and type safety
 *
 * Note: CSS uses semantic HTML selectors with role attributes for scoping:
 * - `header[role='banner']` - not `.header` or `.dndev-header`
 * - `main[role='main']` - not `.main` or `.dndev-main`
 * - `footer[role='contentinfo']` - not `.footer` or `.dndev-footer`
 * - `aside[role='navigation'].sidebar` - uses `.sidebar` class but scoped by role
 *
 * Class names are organizational only. CSS targets by element+role for semantic scoping.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export const layoutClasses = {
  // Layout container
  layoutContainer: 'dndev-layout',

  // Sidebar classes (CSS targets aside[role='navigation'].sidebar)
  sidebar: 'sidebar',
  sidebarTop: 'sidebar-top',
  sidebarContent: 'sidebar-content',
  sidebarBottom: 'sidebar-bottom',
  sidebarResizeHandle: 'dndev-sidebar-resize-handle',

  // Layout zone classes (organizational - CSS targets by element+role)
  // CSS: header[role='banner'], main[role='main'], footer[role='contentinfo']
  header: 'header',
  main: 'main',
  footer: 'footer',

  // Page container (namespaced - this one IS a CSS class)
  container: 'dndev-container',
  pageContainer: 'dndev-container',
  breadcrumbsContainer: 'breadcrumbs-container',
} as const;

/**
 * Layout utility class names.
 * These are direct CSS class names that map to CSS variables (e.g., h-header → var(--header-height)).
 *
 * Framework components use these CSS classes directly.
 * These are exported for:
 * - Direct use in consumer apps
 * - IDE autocomplete
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export const layoutUtilities = {
  // Z-index utilities (from components package)
  zHeader: 'dndev-z-header',
  zSidebar: 'dndev-z-sidebar',
  zOverlay: 'dndev-z-overlay',
  zModal: 'dndev-z-modal',
  zTooltip: 'dndev-z-tooltip',
  zToast: 'dndev-z-toast',
} as const;

/**
 * Combined export of all layout classes and utilities
 * For consumer apps
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export const allLayoutClasses = {
  ...layoutClasses,
  ...layoutUtilities,
} as const;

/**
 * Layout CSS custom property names for programmatic access
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export const layoutVariables = {
  // Header dimensions
  headerHeight: '--header-height',
  headerPadding: '--header-padding',
  headerIconSize: '--header-icon-size',
  headerLogoMaxHeight: '--header-logo-max-height',

  // Sidebar dimensions
  sidebarWidth: '--sidebar-width',
  sidebarPadding: '--sidebar-padding',

  // Main content dimensions
  mainPadding: '--main-padding',
  mainMaxWidth: '--main-max-width',
  contentWidth: '--content-width',
  contentPadding: '--content-padding',

  // Footer dimensions
  footerHeight: '--footer-height',
  footerPadding: '--footer-padding',

  // Z-index layers (from components package)
  zHeader: '--z-header',
  zSidebar: '--z-sidebar',
  zFooter: '--z-footer',
  zOverlay: '--z-overlay',
  zModal: '--z-modal',
  zTooltip: '--z-tooltip',
  zToast: '--z-toast',
} as const;

/**
 * CSS variable exports
 * Exports CSS variable names for use in TypeScript
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export const cssVariables = {
  /* Header */
  headerHeight: '--header-height',
  headerPadding: '--header-padding',
  logoSize: '--logo-size',

  /* Sidebar */
  sidebarWidth: '--sidebar-width',
  sidebarPadding: '--sidebar-padding',

  /* Footer */
  footerHeight: '--footer-height',
  footerPadding: '--footer-padding',

  /* Layout spacing */
  layoutGap: '--layout-gap',
  sectionGap: '--gap-lg',
  contentGap: '--content-gap',

  /* Z-index */
  zHeader: '--z-header',
  zSidebar: '--z-sidebar',
  zFooter: '--z-footer',
  zModal: '--z-modal',
  zTooltip: '--z-tooltip',
} as const;

/**
 * CSS variable type
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export type CssVariable = keyof typeof cssVariables;
