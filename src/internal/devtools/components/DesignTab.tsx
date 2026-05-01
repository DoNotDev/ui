'use client';
// packages/ui/src/internal/devtools/components/DesignTab.tsx

/**
 * @fileoverview Design Tab Component
 * @description Unified design debugging: themes, color ratio, typography
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { Palette, Type } from 'lucide-react';
import { useState, useEffect } from 'react';

import {
  Card,
  Button,
  BUTTON_VARIANT,
  Stack,
  Label,
  Badge,
  BADGE_VARIANT,
  Alert,
  ALERT_VARIANT,
  DescriptionList,
  Text,
  ScrollArea,
  Accordion,
  CopyToClipboard,
  toast,
} from '@donotdev/components';
import { useTheme, useThemeReady } from '@donotdev/core';

interface ColorRatioResult {
  dominant: number;
  secondary: number;
  accent: number;
  details: { color: string; percentage: number; category: string }[];
}

interface TypographyResult {
  fontSizes: { size: string; count: number }[];
  fontFamilies: { family: string; count: number }[];
  totalElements: number;
}

export const DesignTab = () => {
  const currentTheme = useTheme('currentTheme');
  const availableThemes = useTheme('availableThemes');
  const isDarkMode = useTheme('isDarkMode');
  const isReady = useThemeReady();

  // Load cached analysis from localStorage
  const loadCachedAnalysis = () => {
    try {
      const cached = localStorage.getItem('dndev-design-analysis');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.colorRatio) setColorRatio(parsed.colorRatio);
        if (parsed.typography) setTypography(parsed.typography);
        if (parsed.fontSizeColors) setFontSizeColors(parsed.fontSizeColors);
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development')
        console.warn('Cache operation failed:', e);
    }
  };

  // Save analysis to localStorage
  const saveAnalysis = (
    colorRatioData: ColorRatioResult | null,
    typographyData: TypographyResult | null,
    fontSizeColorsData: Record<string, string>
  ) => {
    try {
      localStorage.setItem(
        'dndev-design-analysis',
        JSON.stringify({
          colorRatio: colorRatioData,
          typography: typographyData,
          fontSizeColors: fontSizeColorsData,
          timestamp: new Date().toISOString(),
        })
      );
    } catch (e) {
      if (process.env.NODE_ENV === 'development')
        console.warn('Cache operation failed:', e);
    }
  };

  useEffect(() => {
    loadCachedAnalysis();
  }, []);

  const [colorRatio, setColorRatio] = useState<ColorRatioResult | null>(null);
  const [typography, setTypography] = useState<TypographyResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [highlightedSize, setHighlightedSize] = useState<string | null>(null);
  const [fontSizeColors, setFontSizeColors] = useState<Record<string, string>>(
    {}
  );

  // Normalize font size for comparison (round to 2 decimals)
  const normalizeFontSize = (size: string): string => {
    return parseFloat(size).toFixed(2) + 'px';
  };

  // Highlight/unhighlight elements by font size
  const toggleHighlight = (size: string) => {
    // Clear previous highlights
    document.querySelectorAll('[data-dndev-highlight]').forEach((el) => {
      (el as HTMLElement).style.outline = '';
      el.removeAttribute('data-dndev-highlight');
    });

    if (highlightedSize === size) {
      setHighlightedSize(null);
      return;
    }

    // Highlight elements with matching font size - ONLY leaf nodes
    const elements = document.querySelectorAll('*');
    let count = 0;
    const normalizedSize = normalizeFontSize(size);
    elements.forEach((el) => {
      if (isOverlayElement(el)) return;

      // Only highlight leaf nodes (same logic as analysis)
      const hasText = el.textContent && el.textContent.trim().length > 0;
      const hasChildElements = el.children.length > 0;
      if (!hasText || hasChildElements) return;

      const style = getComputedStyle(el);
      if (normalizeFontSize(style.fontSize) === normalizedSize) {
        (el as HTMLElement).style.outline = '2px solid var(--primary)';
        el.setAttribute('data-dndev-highlight', 'true');
        count++;
      }
    });

    setHighlightedSize(size);
    toast('info', `Highlighting ${count} elements with ${size}`);
  };

  // Apply color to elements with matching font size
  const applyFontSizeColor = (size: string, color: string) => {
    // Clear previous color for this size
    document
      .querySelectorAll(`[data-dndev-font-size-color="${size}"]`)
      .forEach((el) => {
        (el as HTMLElement).style.color = '';
        el.removeAttribute('data-dndev-font-size-color');
      });

    if (!color) {
      setFontSizeColors((prev) => {
        const next = { ...prev };
        delete next[size];
        return next;
      });
      return;
    }

    // Apply color to all elements with this font size - ONLY leaf nodes
    const elements = document.querySelectorAll('*');
    let count = 0;
    const normalizedSize = normalizeFontSize(size);
    elements.forEach((el) => {
      if (isOverlayElement(el)) return;

      // Only color leaf nodes (same logic as analysis)
      const hasText = el.textContent && el.textContent.trim().length > 0;
      const hasChildElements = el.children.length > 0;
      if (!hasText || hasChildElements) return;

      const style = getComputedStyle(el);
      if (normalizeFontSize(style.fontSize) === normalizedSize) {
        (el as HTMLElement).style.color = color;
        el.setAttribute('data-dndev-font-size-color', size);
        count++;
      }
    });

    const newColors = { ...fontSizeColors, [size]: color };
    setFontSizeColors(newColors);
    saveAnalysis(colorRatio, typography, newColors);
  };

  // Clear highlights on unmount or when dialog closes
  const clearHighlights = () => {
    document.querySelectorAll('[data-dndev-highlight]').forEach((el) => {
      (el as HTMLElement).style.outline = '';
      el.removeAttribute('data-dndev-highlight');
    });
    document.querySelectorAll('[data-dndev-font-size-color]').forEach((el) => {
      (el as HTMLElement).style.color = '';
      el.removeAttribute('data-dndev-font-size-color');
    });
    setHighlightedSize(null);
    setFontSizeColors({});
    saveAnalysis(colorRatio, typography, {});
  };

  // Get CSS variables from :root
  const getCSSVariables = (): Record<string, string> => {
    if (typeof document === 'undefined') return {};
    const root = document.documentElement;
    const style = getComputedStyle(root);
    const vars: Record<string, string> = {};

    const relevantVars = [
      '--background',
      '--foreground',
      '--card',
      '--card-foreground',
      '--popover',
      '--popover-foreground',
      '--primary',
      '--primary-foreground',
      '--secondary',
      '--secondary-foreground',
      '--muted',
      '--muted-foreground',
      '--accent',
      '--accent-foreground',
      '--destructive',
      '--destructive-foreground',
      '--border',
      '--input',
      '--ring',
      '--radius',
      '--font-sans',
      '--font-mono',
      '--font-family',
    ];

    relevantVars.forEach((varName) => {
      const value = style.getPropertyValue(varName).trim();
      if (value) vars[varName] = value;
    });

    return vars;
  };

  // Check if element is inside devtools, dialogs, or overlays
  const isOverlayElement = (el: Element): boolean => {
    return !!(
      el.closest('[data-dndev-devtools]') ||
      el.closest('[data-radix-portal]') ||
      el.closest('[role="dialog"]') ||
      el.closest('[data-state="open"]') ||
      el.closest('.dndev-sheet-content')
    );
  };

  const analyzeTypography = () => {
    const elements = document.querySelectorAll('*');
    const fontSizeMap = new Map<string, number>();
    const fontFamilyMap = new Map<string, number>();
    let analyzedCount = 0;

    elements.forEach((el) => {
      if (isOverlayElement(el)) return;
      if (
        el.tagName === 'SCRIPT' ||
        el.tagName === 'STYLE' ||
        el.tagName === 'NOSCRIPT'
      )
        return;

      const style = getComputedStyle(el);
      const rect = (el as HTMLElement).getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) return;
      if (style.display === 'none' || style.visibility === 'hidden') return;

      // ONLY leaf nodes with text, no children
      const hasText = el.textContent && el.textContent.trim().length > 0;
      if (!hasText || el.children.length > 0) return;

      analyzedCount++;

      const fontSize = style.fontSize;
      const fontSizeRounded = parseFloat(fontSize).toFixed(2) + 'px';
      fontSizeMap.set(
        fontSizeRounded,
        (fontSizeMap.get(fontSizeRounded) || 0) + 1
      );

      const fontFamily = style.fontFamily
        ?.split(',')[0]
        ?.trim()
        ?.replace(/['"]/g, '');
      if (fontFamily) {
        fontFamilyMap.set(fontFamily, (fontFamilyMap.get(fontFamily) || 0) + 1);
      }
    });

    const fontSizes = Array.from(fontSizeMap.entries())
      .map(([size, count]) => ({ size, count }))
      .sort((a, b) => b.count - a.count);

    const fontFamilies = Array.from(fontFamilyMap.entries())
      .map(([family, count]) => ({ family, count }))
      .sort((a, b) => b.count - a.count);

    return {
      fontSizes,
      fontFamilies,
      totalElements: analyzedCount,
    };
  };

  const analyzeColorRatio = () => {
    const elements = document.querySelectorAll('*');
    const colorMap = new Map<string, { count: number; area: number }>();

    elements.forEach((el) => {
      // Skip overlay/devtools elements
      if (isOverlayElement(el)) return;

      const style = getComputedStyle(el);
      const bg = style.backgroundColor;
      const rect = (el as HTMLElement).getBoundingClientRect();
      const area = rect.width * rect.height;

      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && area > 0) {
        const existing = colorMap.get(bg) || { count: 0, area: 0 };
        colorMap.set(bg, {
          count: existing.count + 1,
          area: existing.area + area,
        });
      }
    });

    const totalArea = Array.from(colorMap.values()).reduce(
      (sum, v) => sum + v.area,
      0
    );
    if (totalArea === 0)
      return { dominant: 0, secondary: 0, accent: 0, details: [] };

    const colors = Array.from(colorMap.entries())
      .map(([color, data]) => ({
        color,
        percentage: (data.area / totalArea) * 100,
      }))
      .sort((a, b) => b.percentage - a.percentage);

    // Simplified categorization based on percentage
    const dominant = colors
      .slice(0, 2)
      .reduce((sum, c) => sum + c.percentage, 0);
    const secondary = colors
      .slice(2, 5)
      .reduce((sum, c) => sum + c.percentage, 0);
    const accent = colors.slice(5).reduce((sum, c) => sum + c.percentage, 0);

    return {
      dominant,
      secondary,
      accent,
      details: colors.slice(0, 15).map((c) => ({
        ...c,
        category:
          c.percentage > 30
            ? 'dominant'
            : c.percentage > 10
              ? 'secondary'
              : 'accent',
      })),
    };
  };

  const runAnalysis = () => {
    setIsAnalyzing(true);
    try {
      const colorRatioData = analyzeColorRatio();
      const typographyData = analyzeTypography();
      setColorRatio(colorRatioData);
      setTypography(typographyData);
      saveAnalysis(colorRatioData, typographyData, fontSizeColors);
      toast('success', 'Analysis complete');
    } catch (error) {
      console.error('Analysis failed:', error);
      toast('error', 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Format analysis results for clipboard
  const getAnalysisJson = () => {
    return JSON.stringify(
      {
        theme: {
          current: currentTheme,
          isDarkMode,
          isReady,
          availableCount: availableThemes.length,
        },
        cssVariables: getCSSVariables(),
        colorRatio: colorRatio || null,
        typography: typography || null,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    );
  };

  const copyAnalysis = () => {
    navigator.clipboard
      .writeText(getAnalysisJson())
      .then(() => {
        toast('success', 'Analysis copied to clipboard');
      })
      .catch(() => {
        toast('error', 'Failed to copy');
      });
  };

  const cssVars = getCSSVariables();

  const themeItems = [
    {
      label: 'Current',
      value: <Text className="dndev-font-mono">{currentTheme}</Text>,
    },
    {
      label: 'Dark Mode',
      value: (
        <Badge
          variant={isDarkMode ? BADGE_VARIANT.DEFAULT : BADGE_VARIANT.SECONDARY}
        >
          {isDarkMode ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      label: 'Ready',
      value: (
        <Badge
          variant={isReady ? BADGE_VARIANT.DEFAULT : BADGE_VARIANT.DESTRUCTIVE}
        >
          {isReady ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      label: 'Available',
      value: (
        <Text className="dndev-font-mono">{availableThemes.length} themes</Text>
      ),
    },
  ];

  const isColorCompliant =
    colorRatio &&
    colorRatio.dominant >= 50 &&
    colorRatio.dominant <= 70 &&
    colorRatio.secondary >= 20 &&
    colorRatio.secondary <= 40 &&
    colorRatio.accent >= 5 &&
    colorRatio.accent <= 20;

  return (
    <Stack style={{ padding: 'var(--gap-md)' }}>
      {/* Theme Overview - Accordion */}
      <Accordion
        type="single"
        collapsible
        items={[
          {
            value: 'theme',
            trigger: <span>Theme Info</span>,
            content: (
              <Stack>
                <Card title="Theme" subtitle={currentTheme}>
                  <DescriptionList items={themeItems} />
                </Card>
                <Card
                  title="CSS Variables"
                  subtitle={`${Object.keys(cssVars).length} variables`}
                >
                  <ScrollArea className="dndev-max-h-48">
                    <Stack gap="tight">
                      {Object.entries(cssVars).map(([name, value]) => (
                        <Stack
                          key={name}
                          direction="row"
                          align="center"
                          justify="between"
                          gap="tight"
                        >
                          <Text className="dndev-font-mono dndev-text-xs">
                            {name}
                          </Text>
                          <Stack direction="row" align="center" gap="tight">
                            <div
                              style={{
                                width: '1rem',
                                height: '1rem',
                                backgroundColor: `var(${name})`,
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                              }}
                            />
                            <Text className="dndev-font-mono dndev-text-xs dndev-text-muted-foreground">
                              {value}
                            </Text>
                          </Stack>
                        </Stack>
                      ))}
                    </Stack>
                  </ScrollArea>
                </Card>
              </Stack>
            ),
          },
        ]}
      />

      {/* Analysis Buttons */}
      <Stack direction="row" gap="tight">
        <Button
          onClick={runAnalysis}
          variant={BUTTON_VARIANT.DEFAULT}
          icon={Palette}
          disabled={isAnalyzing}
          style={{ flex: 1 }}
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Page'}
        </Button>
        <Button
          onClick={copyAnalysis}
          variant={BUTTON_VARIANT.OUTLINE}
          disabled={!colorRatio && !typography}
        >
          Copy JSON
        </Button>
      </Stack>

      {/* Color Ratio */}
      {colorRatio && (
        <Card
          content={
            <Stack
              direction="row"
              align="center"
              justify="between"
              className="dndev-w-full"
            >
              <span>60/30/10 Color Ratio</span>
              <Badge
                variant={
                  isColorCompliant
                    ? BADGE_VARIANT.DEFAULT
                    : BADGE_VARIANT.SECONDARY
                }
              >
                {isColorCompliant ? '✓ Balanced' : '⚠ Review'}
              </Badge>
            </Stack>
          }
        >
          <Stack gap="tight">
            <Stack direction="row" justify="between">
              <span>Dominant (60%)</span>
              <span
                className={
                  colorRatio.dominant >= 50 && colorRatio.dominant <= 70
                    ? 'dndev-text-primary'
                    : 'dndev-text-destructive'
                }
              >
                {colorRatio.dominant.toFixed(1)}%
              </span>
            </Stack>
            <Stack direction="row" justify="between">
              <span>Secondary (30%)</span>
              <span
                className={
                  colorRatio.secondary >= 20 && colorRatio.secondary <= 40
                    ? 'dndev-text-primary'
                    : 'dndev-text-destructive'
                }
              >
                {colorRatio.secondary.toFixed(1)}%
              </span>
            </Stack>
            <Stack direction="row" justify="between">
              <span>Accent (10%)</span>
              <span
                className={
                  colorRatio.accent >= 5 && colorRatio.accent <= 20
                    ? 'dndev-text-primary'
                    : 'dndev-text-destructive'
                }
              >
                {colorRatio.accent.toFixed(1)}%
              </span>
            </Stack>

            {colorRatio.details.length > 0 && (
              <Accordion
                type="single"
                collapsible
                items={[
                  {
                    value: 'colors',
                    trigger: (
                      <span className="dndev-text-sm">
                        Top Colors ({colorRatio.details.length})
                      </span>
                    ),
                    content: (
                      <Stack gap="tight">
                        {colorRatio.details.map((c, i) => (
                          <Stack
                            key={i}
                            direction="row"
                            align="center"
                            gap="tight"
                          >
                            <div
                              style={{
                                width: '1rem',
                                height: '1rem',
                                backgroundColor: c.color,
                                border: '1px solid var(--border)',
                                flexShrink: 0,
                              }}
                            />
                            <Text
                              className="dndev-text-xs dndev-font-mono"
                              style={{ flex: 1 }}
                            >
                              {c.percentage.toFixed(1)}%
                            </Text>
                            <Badge variant={BADGE_VARIANT.SECONDARY}>
                              {c.category}
                            </Badge>
                          </Stack>
                        ))}
                      </Stack>
                    ),
                  },
                ]}
              />
            )}
          </Stack>
        </Card>
      )}

      {/* Typography - Font Families */}
      {typography && typography.fontFamilies.length > 0 && (
        <Card
          content={
            <Stack
              direction="row"
              align="center"
              justify="between"
              className="dndev-w-full"
            >
              <span>Font Families</span>
              <Badge variant={BADGE_VARIANT.SECONDARY}>
                {typography.fontFamilies.length} families
              </Badge>
            </Stack>
          }
        >
          <Stack gap="tight" className="dndev-mt-xs">
            {typography.fontFamilies.map((f, i) => (
              <Stack
                key={i}
                direction="row"
                justify="between"
                align="center"
                gap="tight"
                style={{
                  padding: 'var(--gap-sm)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <Text
                  className="dndev-font-mono dndev-text-xs"
                  style={{ flex: 1 }}
                >
                  {f.family}
                </Text>
                <Text
                  className="dndev-text-xs"
                  style={{
                    opacity: 0.6,
                    minWidth: '2rem',
                    textAlign: 'end',
                  }}
                >
                  {f.count}×
                </Text>
              </Stack>
            ))}
          </Stack>
        </Card>
      )}

      {/* Typography - Font Sizes */}
      {typography && (
        <Card
          content={
            <Stack
              direction="row"
              align="center"
              justify="between"
              className="dndev-w-full"
            >
              <span>Font Sizes</span>
              <Badge variant={BADGE_VARIANT.SECONDARY}>
                {typography.totalElements} elements
              </Badge>
            </Stack>
          }
        >
          <Stack direction="row" align="center" justify="between">
            <Label className="dndev-text-sm dndev-font-semibold">
              {typography.fontSizes.length} sizes
            </Label>
            {(highlightedSize || Object.keys(fontSizeColors).length > 0) && (
              <Button
                variant={BUTTON_VARIANT.GHOST}
                onClick={clearHighlights}
                style={{ padding: '0 var(--gap-sm)', height: 'auto' }}
              >
                <Text className="dndev-text-xs">Clear All</Text>
              </Button>
            )}
          </Stack>
          <Stack gap="tight" className="dndev-mt-xs">
            {typography.fontSizes.map((f, i) => {
              const isOrphan = f.count < 5;
              const isHighlighted = highlightedSize === f.size;
              const currentColor = fontSizeColors[f.size] || '';

              const findOrphanElements = () => {
                const normalizedSize = normalizeFontSize(f.size);
                const found = Array.from(document.querySelectorAll('*')).filter(
                  (el) => {
                    if (
                      el.closest('[data-dndev-devtools]') ||
                      el.closest('[data-radix-portal]') ||
                      el.closest('[role="dialog"]')
                    )
                      return false;
                    const style = getComputedStyle(el);
                    const hasText =
                      el.textContent && el.textContent.trim().length > 0;
                    if (!hasText || el.children.length > 0) return false;
                    return normalizeFontSize(style.fontSize) === normalizedSize;
                  }
                );

                found.forEach((el) => {
                  // Log text content only (not the DOM node) to avoid memory leaks from retained element refs
                  console.log(
                    '[DesignTab]',
                    el.textContent?.trim().substring(0, 50)
                  );
                  (el as HTMLElement).style.outline = '2px solid red';
                });
                console.log(
                  `[DesignTab] Found ${found.length} elements with ${f.size}`
                );
              };

              return (
                <Stack
                  key={i}
                  direction="row"
                  justify="between"
                  align="center"
                  gap="tight"
                  style={{
                    padding: 'var(--gap-sm)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isHighlighted
                      ? 'var(--primary)'
                      : 'transparent',
                    color: isHighlighted
                      ? 'var(--primary-foreground)'
                      : 'inherit',
                  }}
                >
                  <Stack
                    direction="row"
                    align="center"
                    gap="tight"
                    onClick={() => toggleHighlight(f.size)}
                    style={{ cursor: 'pointer', flex: 1 }}
                  >
                    <Text className="dndev-font-mono dndev-text-xs">
                      {f.size}
                    </Text>
                    {isOrphan && (
                      <Badge variant={BADGE_VARIANT.DESTRUCTIVE}>orphan</Badge>
                    )}
                  </Stack>
                  {isOrphan ? (
                    <Button
                      variant={BUTTON_VARIANT.GHOST}
                      onClick={(e) => {
                        e.stopPropagation();
                        findOrphanElements();
                      }}
                      style={{
                        padding: '0 var(--gap-sm)',
                        height: '1.5rem',
                        minWidth: '2rem',
                      }}
                      title={`Find ${f.size} elements in console`}
                    >
                      <Text className="dndev-text-xs">🔍</Text>
                    </Button>
                  ) : (
                    <input
                      type="color"
                      value={currentColor || '#000000'}
                      onChange={(e) =>
                        applyFontSizeColor(f.size, e.target.value)
                      }
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '2rem',
                        height: '1.5rem',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                      title={`Color elements with ${f.size}`}
                    />
                  )}
                  <Text
                    className="dndev-text-xs"
                    style={{
                      opacity: isHighlighted ? 1 : 0.6,
                      minWidth: '2rem',
                      textAlign: 'end',
                    }}
                  >
                    {f.count}×
                  </Text>
                </Stack>
              );
            })}
          </Stack>
        </Card>
      )}

      {!colorRatio && !typography && (
        <Alert variant={ALERT_VARIANT.INFO}>
          Click "Analyze Page" to check color ratio and typography
        </Alert>
      )}
    </Stack>
  );
};
