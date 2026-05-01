// packages/ui/src/internal/devtools/types.ts

/**
 * @fileoverview DevTools Types
 * @description TypeScript type definitions for devtools components and utilities
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import type { DndevFrameworkConfig } from '@donotdev/core';
import type { BrowserInfo, FeatureSupport } from '@donotdev/core';

/**
 * Virtual module result interface
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export interface VirtualModuleResult<T = any> {
  success: boolean;
  data: T | null;
  error: string | null;
}

/**
 * Utility test result interface
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export interface UtilityTestResult {
  height: string;
  width: string;
  minHeight: string;
  maxWidth: string;
}

/**
 * Utility tests interface
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export interface UtilityTests {
  'h-header': UtilityTestResult;
  'h-header-icon': UtilityTestResult;
  'w-sidebar': UtilityTestResult;
  'size-icon': UtilityTestResult;
}

/**
 * CSS data interface
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export interface CSSData {
  dndevVariables: Record<string, string>;
  allCSSPropsCount: number;
  dndevVarsCount: number;
  utilityTests: UtilityTests;
  actualHeader: {
    height: string;
    minHeight: string;
    padding: string;
    margin: string;
  } | null;
  keyVariables: {
    headerHeight: string;
    sidebarWidth: string;
    debugEnabled: string;
  };
}

/**
 * Global data interface
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export interface GlobalData {
  // Unified config
  dndevConfig: DndevFrameworkConfig | null;

  // Global discovery data
  discoveredThemes: string[];
  discoveredClasses: string[];
  discoveredFrameworkVariables: string[];
  discoveredConsumerVariables: string[];
  discoveredUtilities: Record<string, any>;

  // Helper functions
  getAvailableThemes: (() => any[]) | null;
}

/**
 * Health check result interface
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export interface HealthCheckResult {
  timestamp: string;
  platform: {
    type: string;
    mode: string;
    context: string;
    version?: string;
  };
  browser: BrowserInfo;
  features: FeatureSupport;
  virtualModules: {
    designTokens: VirtualModuleResult;
    i18n: VirtualModuleResult;
  };
  globalData: GlobalData;
  cssData: CSSData;
  issues: string[];
  suggestions: string[];
}

/**
 * Spacing element interface
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export interface SpacingElement {
  element: Element;
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  tagName: string;
  className: string;
  id: string;
  rect: DOMRect;
}

/**
 * Spacing analysis interface
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export interface SpacingAnalysis {
  totalElements: number;
  groupedSpacing: Record<string, SpacingElement[]>;
  summary: {
    pageContainer: number;
    marketingSections: number;
    heroSection: number;
    valueCards: number;
    featureCards: number;
    other: number;
  };
}
