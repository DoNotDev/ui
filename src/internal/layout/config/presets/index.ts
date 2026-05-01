// packages/ui/src/internal/layout/config/presets/index.ts

/**
 * @fileoverview Preset Configurations Barrel Export
 * @description Exports all preset configurations and the preset registry.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import type { PresetRegistry } from '@donotdev/core';

export * from './admin';
export * from './blog';
export * from './docs';
export * from './game';
export * from './landing';
export * from './moolti';
export * from './plain';

import { adminPreset } from './admin';
import { blogPreset } from './blog';
import { docsPreset } from './docs';
import { gamePreset } from './game';
import { landingPreset } from './landing';
import { mooltiPreset } from './moolti';
import { plainPreset } from './plain';

export const presetRegistry: PresetRegistry = {
  admin: adminPreset,
  blog: blogPreset,
  docs: docsPreset,
  game: gamePreset,
  landing: landingPreset,
  moolti: mooltiPreset,
  plain: plainPreset,
};
