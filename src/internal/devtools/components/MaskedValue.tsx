'use client';
// packages/ui/src/internal/devtools/components/MaskedValue.tsx

/**

 * @fileoverview Masked Value Component

 * @description Reusable component for displaying sensitive values with mask/unmask and copy functionality

 *

 * @version 0.1.0

 * @since 0.0.1

 * @author AMBROISE PARK Consulting

 */

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

import {
  Stack,
  Text,
  Button,
  BUTTON_VARIANT,
  CopyToClipboard,
} from '@donotdev/components';

import { shouldMaskValue, maskSensitiveValue } from '../utils/maskSensitive';

export interface MaskedValueProps {
  /** The key/name of the value (used to determine if sensitive) */

  keyName: string;

  /** The actual value to display (always copied, may be masked in display) */

  value: string;

  /** Optional className for the container */

  className?: string;

  /** Optional className for the text */

  textClassName?: string;

  /** Whether to show the value in a compact format */

  compact?: boolean;
}

/**

 * MaskedValue component - displays sensitive values with mask/unmask and copy

 * Always copies the real value, but can mask the display

 */

export const MaskedValue = ({
  keyName,

  value,

  className,

  textClassName = 'dndev-font-mono dndev-text-xs dndev-break-all',

  compact = false,
}: MaskedValueProps) => {
  const [isUnmasked, setIsUnmasked] = useState(false);

  const stringValue = String(value);

  const isSensitive = shouldMaskValue(keyName, stringValue);

  const displayValue =
    isSensitive && !isUnmasked ? maskSensitiveValue(stringValue) : stringValue;

  if (compact) {
    return (
      <Stack direction="row" align="center" gap="tight" className={className}>
        <Text as="span" className={textClassName}>
          {displayValue}

          {isSensitive && !isUnmasked && (
            <Text as="span" className="dndev-text-muted-foreground dndev-ml-sm">
              (masked)
            </Text>
          )}
        </Text>

        {isSensitive && (
          <Button
            onClick={() => setIsUnmasked(!isUnmasked)}
            variant={BUTTON_VARIANT.GHOST}
            icon={isUnmasked ? EyeOff : Eye}
            title={isUnmasked ? 'Mask value' : 'Reveal value'}
            className="dndev-flex-shrink-0"
          />
        )}

        <CopyToClipboard
          text={stringValue}
          tooltipText="Copy value"
          copiedTooltipText="Copied!"
          variant="ghost"
          className="dndev-flex-shrink-0"
        />
      </Stack>
    );
  }

  return (
    <Stack direction="row" align="center" gap="tight" className={className}>
      <Text as="span" className={textClassName}>
        {displayValue}

        {isSensitive && !isUnmasked && (
          <Text as="span" className="dndev-text-muted-foreground dndev-ml-sm">
            (masked)
          </Text>
        )}
      </Text>

      {isSensitive && (
        <Button
          onClick={() => setIsUnmasked(!isUnmasked)}
          variant={BUTTON_VARIANT.GHOST}
          icon={isUnmasked ? EyeOff : Eye}
          title={isUnmasked ? 'Mask value' : 'Reveal value'}
          className="dndev-flex-shrink-0"
        />
      )}

      <CopyToClipboard
        text={stringValue}
        tooltipText="Copy value"
        copiedTooltipText="Copied!"
        variant="ghost"
        className="dndev-flex-shrink-0"
      />
    </Stack>
  );
};
