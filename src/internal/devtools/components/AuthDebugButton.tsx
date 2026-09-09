'use client';
// packages/ui/src/internal/devtools/components/AuthDebugButton.tsx

/**
 * @fileoverview Auth Debug Button Component
 * @description Shows authentication state in a compact button format for debugging
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { useState } from 'react';
import type { ComponentType } from 'react';

import { useAuthSafe } from '../../../utils/useAuthSafe';

/**
 * Auth Debug Button Component
 * Shows authentication state in a compact button format
 */
export const AuthDebugButton: ComponentType = () => {
  const user = useAuthSafe('user');
  const loading = useAuthSafe('loading');
  const error = useAuthSafe('error');
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = () => {
    if (loading) return '⏳';
    if (error) return '❌';
    if (user) return '✅';
    return '❌';
  };

  const getStatusBg = () => {
    if (loading) return 'rgb(234 179 8 / 0.2)'; // yellow
    if (error) return 'rgb(239 68 68 / 0.2)'; // red
    if (user) return 'rgb(34 197 94 / 0.2)'; // green
    return 'rgb(107 114 128 / 0.2)'; // gray
  };

  const getStatusHoverBg = () => {
    if (loading) return 'rgb(234 179 8 / 0.3)';
    if (error) return 'rgb(239 68 68 / 0.3)';
    if (user) return 'rgb(34 197 94 / 0.3)';
    return 'rgb(107 114 128 / 0.3)';
  };

  return (
    <div className="dndev-relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: 'var(--gap-sm) var(--gap-md)',
          borderRadius: 'var(--radius-lg)',
          fontSize: 'var(--font-size-sm)',
          fontFamily: 'monospace',
          transition: 'background-color var(--duration-normal)',
          backgroundColor: getStatusBg(),
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = getStatusHoverBg();
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = getStatusBg();
        }}
        title="Auth Debug"
      >
        {getStatusIcon()} Auth
      </button>

      {isExpanded && (
        <div
          className="dndev-absolute bottom-full font-mono"
          style={{
            zIndex: 'calc(var(--z-toast) + 100)',
            marginBottom: 'var(--gap-sm)',
            padding: 'var(--gap-md)',
            insetInlineEnd: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            borderRadius: 'var(--radius-lg)',
            minWidth: '200px',
            border: '1px solid rgb(75 85 99)',
          }}
        >
          <div className="dndev-flex dndev-items-center dndev-gap-sm">
            <div>Loading: {loading ? '⏳' : '✅'}</div>
            <div>Auth: {user ? '✅' : '❌'}</div>
            <div>User: {user?.email || 'None'}</div>
            {error && (
              <div style={{ color: 'rgb(248 113 113)' }}>
                Error: {error.message}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
