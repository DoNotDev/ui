// packages/ui/src/internal/devtools/utils/virtualModuleInspector.ts

/**
 * @fileoverview Virtual Module Inspector Utility
 * @description Inspects and validates virtual modules including design tokens, i18n mappings, and performs health checks
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { PLATFORMS } from '@donotdev/core';
import {
  detectPlatform,
  detectPlatformInfo,
  detectBrowser,
  detectFeatures,
  getDndevConfig,
} from '@donotdev/core';

import type {
  VirtualModuleResult,
  HealthCheckResult,
  GlobalData,
  CSSData,
  UtilityTests,
} from '../types';

export class VirtualModuleInspector {
  static async getDesignTokens(): Promise<VirtualModuleResult> {
    try {
      const platform = detectPlatform();
      let designTokens = {};
      let source = '';

      // Use DRY utility for platform-aware config access
      const config = getDndevConfig();
      if (config?.themes?.variables) {
        designTokens = config.themes.variables;
        source = 'config.themes.variables';
      }

      // If not available, could fetch from API route
      if (Object.keys(designTokens).length === 0) {
        try {
          const response = await fetch('/api/dndev/themes');
          if (response.ok) {
            const data = await response.json();
            designTokens = data.variables || {};
            source = '/api/dndev/themes';
          }
        } catch (error) {
          console.warn('Failed to fetch themes from API route:', error);
        }
      }

      const tokenCount = Object.keys(designTokens).length;

      if (process.env.NODE_ENV === 'development') {
        console.log('[VirtualModuleInspector] Design Tokens:', {
          platform,
          tokenCount,
          sampleTokens: Object.keys(designTokens).slice(0, 5),
          source,
        });
      }

      return {
        success: true,
        data: {
          ...designTokens,
          _meta: {
            tokenCount,
            loadedAt: new Date().toISOString(),
            source,
            platform,
          },
        },
        error: null,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (process.env.NODE_ENV === 'development') {
        console.group('[VirtualModuleInspector] Design Tokens Failed');
        console.error('Error:', errorMessage);
        console.log('Platform:', detectPlatform());
        console.log('Environment:', {
          isClient: typeof window !== 'undefined',
          hasConfig: !!getDndevConfig(),
          hasThemes: !!getDndevConfig()?.themes,
          hasVariables: !!getDndevConfig()?.themes?.variables,
        });
        console.groupEnd();
      }

      return {
        success: false,
        data: null,
        error: `Design tokens not available: ${errorMessage}. Check if @donotdev/core discovery plugin is enabled.`,
      };
    }
  }

  static async getI18nMapping(): Promise<VirtualModuleResult> {
    try {
      const platform = detectPlatform();
      let i18nMapping = {};
      let source = '';

      // Use DRY utility for platform-aware config access
      const config = getDndevConfig();
      if (config?.i18n?.mapping) {
        i18nMapping = config.i18n.mapping;
        source = 'config.i18n.mapping';
      }

      // If not available, could fetch from API route
      if (Object.keys(i18nMapping).length === 0) {
        try {
          const response = await fetch('/api/dndev/i18n');
          if (response.ok) {
            const data = await response.json();
            i18nMapping = data.mapping || {};
            source = '/api/dndev/i18n';
          }
        } catch (error) {
          console.warn('Failed to fetch i18n from API route:', error);
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('🌐 i18n Mapping:', {
          platform,
          namespaces: Object.keys(i18nMapping),
          source,
        });
      }

      return {
        success: true,
        data: {
          ...i18nMapping,
          _meta: {
            namespaces: Object.keys(i18nMapping),
            loadedAt: new Date().toISOString(),
            source,
            platform,
          },
        },
        error: null,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        data: null,
        error: `i18n mapping not available: ${errorMessage}`,
      };
    }
  }

  static getGlobalDiscoveryData(): GlobalData {
    return {
      // Unified config (main source of truth)
      dndevConfig: getDndevConfig(),

      // Discovery data
      discoveredThemes:
        getDndevConfig()?.themes?.discovered?.map((t) => t.name) || [],
      discoveredClasses: Object.keys(getDndevConfig()?.themes?.utilities || {}),
      discoveredFrameworkVariables: Object.keys(
        getDndevConfig()?.themes?.variables || {}
      ),
      discoveredConsumerVariables: [], // Not available in unified config yet
      discoveredUtilities: getDndevConfig()?.themes?.utilities || {},

      // Helper functions
      getAvailableThemes: globalThis.getAvailableThemes || null,
    };
  }

  static getCSSVariableData(): CSSData {
    if (typeof document === 'undefined')
      return {
        dndevVariables: {},
        allCSSPropsCount: 0,
        dndevVarsCount: 0,
        utilityTests: {} as UtilityTests,
        actualHeader: null,
        keyVariables: {
          headerHeight: 'not set',
          sidebarWidth: 'not set',
          debugEnabled: 'not set',
        },
      };
    const documentStyle = getComputedStyle(document.documentElement);

    // Get all CSS custom properties
    const allCSSProps = Array.from(document.documentElement.style);
    const dndevVars = allCSSProps
      .filter((prop) => prop && prop.startsWith('--'))
      .reduce(
        (acc, prop) => {
          if (prop) {
            acc[prop] = documentStyle.getPropertyValue(prop);
          }
          return acc;
        },
        {} as Record<string, string>
      );

    // Test utility classes
    const testDiv = document.createElement('div');
    testDiv.style.position = 'absolute';
    testDiv.style.top = '-9999px';
    testDiv.style.left = '-9999px';
    document.body.appendChild(testDiv);

    const utilityTests: UtilityTests = {
      'h-header': {
        height: '0px',
        width: '0px',
        minHeight: 'auto',
        maxWidth: 'none',
      },
      'h-header-icon': {
        height: '0px',
        width: '0px',
        minHeight: 'auto',
        maxWidth: 'none',
      },
      'w-sidebar': {
        height: '0px',
        width: '0px',
        minHeight: 'auto',
        maxWidth: 'none',
      },
      'size-icon': {
        height: '0px',
        width: '0px',
        minHeight: 'auto',
        maxWidth: 'none',
      },
    };

    (Object.keys(utilityTests) as Array<keyof UtilityTests>).forEach(
      (utility) => {
        testDiv.className = utility;
        const computed = getComputedStyle(testDiv);
        utilityTests[utility] = {
          height: computed.height,
          width: computed.width,
          minHeight: computed.minHeight,
          maxWidth: computed.maxWidth,
        };
      }
    );

    document.body.removeChild(testDiv);

    // Check actual header element
    const existingHeader = document.querySelector('header');
    let actualHeaderData: CSSData['actualHeader'] = null;
    if (existingHeader) {
      const headerStyle = getComputedStyle(existingHeader);
      actualHeaderData = {
        height: headerStyle.height,
        minHeight: headerStyle.minHeight,
        padding: headerStyle.padding,
        margin: headerStyle.margin,
      };
    }

    return {
      dndevVariables: dndevVars,
      allCSSPropsCount: allCSSProps.length,
      dndevVarsCount: Object.keys(dndevVars).length,
      utilityTests,
      actualHeader: actualHeaderData,
      keyVariables: {
        headerHeight:
          documentStyle.getPropertyValue('--header-height') || 'not set',
        sidebarWidth:
          documentStyle.getPropertyValue('--sidebar-width') || 'not set',
        debugEnabled:
          documentStyle.getPropertyValue('--debug-enabled') || 'not set',
      },
    };
  }

  static async performHealthCheck(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    const platform = detectPlatformInfo();
    const browser = detectBrowser();
    const features = detectFeatures();

    const [designTokens, i18n] = await Promise.all([
      this.getDesignTokens(),
      this.getI18nMapping(),
    ]);

    const globalData = this.getGlobalDiscoveryData();
    const cssData = this.getCSSVariableData();

    const issues: string[] = [];
    const suggestions: string[] = [];

    // Platform-specific issues
    if (platform.platform === 'unknown') {
      issues.push('Platform not detected - config may not work correctly');
    }

    // Browser issues
    if (browser.type === 'ie') {
      issues.push('Internet Explorer is deprecated and not supported');
    }

    // Feature support issues
    if (!features.cssCustomProperties) {
      issues.push('CSS Custom Properties not supported - theming may not work');
    }

    if (!features.localStorage) {
      issues.push('LocalStorage not supported - data persistence limited');
    }

    // Config issues
    if (!globalData.dndevConfig) {
      issues.push(
        'No DnDev config found - discovery plugins may not be working'
      );
    }

    if (!designTokens.success) {
      issues.push('Design tokens not available');
    }

    if (!i18n.success) {
      issues.push('i18n mapping not available');
    }

    // Suggestions
    if (platform.platform === PLATFORMS.NEXTJS && !features.serviceWorkers) {
      suggestions.push('Consider enabling service workers for PWA features');
    }

    if (!features.secureContext) {
      suggestions.push('Use HTTPS for secure features and better performance');
    }

    return {
      timestamp,
      platform: {
        type: platform.platform,
        mode: platform.mode,
        context: platform.context,
        version: platform.version,
      },
      browser,
      features,
      virtualModules: {
        designTokens,
        i18n,
      },
      globalData,
      cssData,
      issues,
      suggestions,
    };
  }
}
