// packages/ui/src/utils/sanitizeSvg.ts

/**
 * @fileoverview Minimal SVG sanitizer
 * @description Strips dangerous elements and attributes from SVG strings
 * without requiring a third-party DOMPurify dependency.
 *
 * Removes:
 * - `<script>` elements and their content
 * - `<foreignObject>` elements (arbitrary HTML injection vector)
 * - Event handler attributes (on*)
 * - `href` / `xlink:href` values starting with `javascript:`
 * - `data:` URIs in href attributes (except safe image types)
 *
 * @remarks
 * This is intentionally a lightweight allowlist approach for SVG strings
 * that originate from build-time assets (logo.svg) or internal static data
 * (techLogos). For user-provided SVG content, use DOMPurify instead.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

/** Regex patterns for known XSS vectors in SVG */
const SCRIPT_TAG_RE = /<script[\s\S]*?<\/script>/gi;
const FOREIGN_OBJECT_RE = /<foreignObject[\s\S]*?<\/foreignObject>/gi;
const EVENT_HANDLER_RE = /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const JAVASCRIPT_HREF_RE =
  /\s+(?:xlink:)?href\s*=\s*["']\s*javascript:[^"']*["']/gi;
const DATA_URI_HREF_RE =
  /\s+(?:xlink:)?href\s*=\s*["']\s*data:(?!image\/(?:png|jpe?g|gif|webp|svg\+xml))[^"']*["']/gi;

/**
 * Strips known XSS vectors from an SVG string.
 *
 * @param svg - Raw SVG string (build-time or static source)
 * @returns Sanitized SVG string safe for dangerouslySetInnerHTML
 *
 * @security This function uses regex-based sanitization suitable ONLY for build-time trusted SVGs.
 * For user-uploaded or untrusted SVG content, use a dedicated sanitization library like DOMPurify.
 * Regex-based sanitization is bypassable via mutation XSS, SVG event handlers, or entity encoding.
 *
 * @example
 * ```tsx
 * <div dangerouslySetInnerHTML={{ __html: sanitizeSvg(svgContent) }} />
 * ```
 */
export function sanitizeSvg(svg: string): string {
  return svg
    .replace(SCRIPT_TAG_RE, '')
    .replace(FOREIGN_OBJECT_RE, '')
    .replace(EVENT_HANDLER_RE, '')
    .replace(JAVASCRIPT_HREF_RE, '')
    .replace(DATA_URI_HREF_RE, '');
}
