// packages/ui/src/internal/layout/components/i18nSeoMeta.ts

/**
 * @fileoverview SEO fields from a namespace's `meta` translations
 * @description Reads `<ns>:meta.*` key by key, as the i18n convention requires:
 * `useTranslation` returns strings only, never objects or arrays.
 *
 * @version 0.2.2
 * @since 0.2.2
 * @author AMBROISE PARK Consulting
 */

import type { TFunction } from 'i18next';

import { translateArray } from '@donotdev/core';

/** Upper bound for translateArray: keywords past it are not emitted. */
const MAX_KEYWORDS = 20;

/** An empty default is how a missing key is detected: on a namespaced key, i18next returns the key without its namespace. */
const EMPTY_WHEN_MISSING = { defaultValue: '' };

/**
 * Resolves a title or description: explicit value, else its translation.
 *
 * @param seoValue - `null` omits the field, a string is used as is, `undefined` looks up the translation
 * @param translationKey - Namespaced key, e.g. `home:description`
 * @param t - Translation function loaded with the key's namespace
 * @returns The resolved text, or undefined when omitted or not translated
 *
 * @version 0.2.2
 * @since 0.2.2
 * @author AMBROISE PARK Consulting
 */
export function resolveSeoField(
  seoValue: string | null | undefined,
  translationKey: string,
  t: TFunction
): string | undefined {
  if (seoValue === null) return undefined;
  if (seoValue !== undefined) return seoValue;
  return t(translationKey, EMPTY_WHEN_MISSING) || undefined;
}

/**
 * SEO fields a namespace can define under `meta`.
 *
 * @version 0.2.2
 * @since 0.2.2
 * @author AMBROISE PARK Consulting
 */
export interface I18nSeoMeta {
  fullTitle?: string;
  image?: string;
  type?: string;
  keywords?: string[];
  author?: string;
}

/**
 * Reads the SEO fields of a namespace from its translations.
 *
 * @param t - Translation function loaded with `ns`
 * @param ns - Namespace holding the `meta` object
 * @returns The defined fields; a missing or empty field is undefined
 *
 * @example
 * // JSON: { "meta": { "image": "/og.png", "keywords": ["a", "b"] } }
 * readI18nSeoMeta(t, 'home'); // { image: '/og.png', keywords: ['a', 'b'] }
 *
 * @version 0.2.2
 * @since 0.2.2
 * @author AMBROISE PARK Consulting
 */
export function readI18nSeoMeta(t: TFunction, ns: string): I18nSeoMeta {
  // why: TFunction is an i18next overload set; a single-signature wrapper cannot satisfy it structurally
  const translateOrEmpty = ((key: string) =>
    t(key, EMPTY_WHEN_MISSING)) as unknown as TFunction;
  const field = (name: string) =>
    translateOrEmpty(`${ns}:meta.${name}`) || undefined;
  const keywords = translateArray(
    translateOrEmpty,
    `${ns}:meta.keywords`,
    MAX_KEYWORDS
  );

  return {
    fullTitle: field('fullTitle'),
    image: field('image'),
    type: field('type'),
    keywords: keywords.length > 0 ? keywords : undefined,
    author: field('author'),
  };
}
