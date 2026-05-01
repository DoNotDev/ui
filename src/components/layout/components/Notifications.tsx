'use client';
// packages/ui/src/components/layout/components/Notifications.tsx

/**
 * @fileoverview Notifications component for layout system
 * @description Notification bell with dropdown for displaying user notifications
 *
 * This component provides a notification system for the layout header with
 * badge counts, dropdown display, and proper accessibility. It integrates
 * with notification stores and provides real-time updates.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 * @example
 * ```tsx
 * <Notifications
 * count={5}
 * notifications={notifications}
 * onNotificationClick={markAsRead}
 * />
 * ```
 */

// packages/core/ui/src/components/layout/components/Notifications.tsx

import { Bell } from 'lucide-react';
import { useMemo, useEffect, useRef } from 'react';

import { Button, cn, toast, Stack } from '@donotdev/components';

/**
 * Notification item interface
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export interface NotificationItem {
  /** Unique notification ID */
  id: string;

  /** Notification title */
  title: string;

  /** Notification message/description */
  message?: string;

  /** Notification type for styling */
  type?: 'info' | 'success' | 'warning' | 'error';

  /** Whether the notification has been read */
  read?: boolean;

  /** Timestamp when notification was created */
  timestamp?: Date;

  /** Action URL or path */
  actionUrl?: string;

  /** Custom action handler */
  onAction?: () => void;

  /** Avatar/icon for the notification */
  avatar?: string;
}

/**
 * Props for the Notifications component
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export interface NotificationsProps {
  /** Array of notification items */
  notifications?: NotificationItem[];

  /** Total unread notification count */
  count?: number;

  /** Whether notifications are currently loading */
  loading?: boolean;

  /** Callback when notification is dismissed from toast */
  onNotificationClick?: (notification: NotificationItem) => void;

  /** Callback when dropdown opens */
  onDropdownOpen?: () => void;

  /** Maximum number of visible notifications */
  maxVisible?: number;

  /** Additional CSS classes */
  className?: string;

  /** Whether to show notification bell even when count is 0 */
  alwaysShow?: boolean;

  /** Size variant */
  size?: 'sm' | 'md' | 'lg';

  /** Whether the component is disabled */
  disabled?: boolean;
}

/**
 * Size mappings for consistent notification component sizing using CSS variables
 */
const SIZE_VARIANTS = {
  sm: {
    button: { width: 'var(--icon-md)', height: 'var(--icon-md)' },
    icon: { width: 'var(--icon-md)', height: 'var(--icon-md)' },
    badge: {
      width: 'var(--icon-md)',
      height: 'var(--icon-md)',
      fontSize: 'var(--font-size-xs)',
    },
  },
  md: {
    button: { width: 'var(--touch-target)', height: 'var(--touch-target)' },
    icon: { width: 'var(--icon-md)', height: 'var(--icon-md)' },
    badge: {
      width: 'var(--icon-md)',
      height: 'var(--icon-md)',
      fontSize: 'var(--font-size-xs)',
    },
  },
  lg: {
    button: { width: 'var(--touch-target)', height: 'var(--touch-target)' },
    icon: { width: 'var(--icon-touch)', height: 'var(--icon-touch)' },
    badge: {
      width: 'var(--icon-touch)',
      height: 'var(--icon-touch)',
      fontSize: 'var(--font-size-sm)',
    },
  },
} as const;

/**
 * Notifications component - notification bell with dropdown
 *
 * Features:
 * - Badge count display with proper formatting
 * - Dropdown notification list
 * - Real-time notification updates
 * - Mark as read functionality
 * - Different notification types with styling
 * - Responsive design
 * - Keyboard navigation support
 * - Loading states
 * - Empty states
 * - Time formatting for timestamps
 *
 * This component provides a complete notification system that can be
 * easily integrated into any layout header or navigation area.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 * @param props - Notifications component props
 * @returns React component
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Notifications count={3} />
 *
 * // With full notification data
 * <Notifications
 * notifications={[
 * {
 * id: '1',
 * title: 'New message',
 * message: 'You have a new message from John',
 * type: 'info',
 * timestamp: new Date(),
 * }
 * ]}
 * onNotificationClick={handleNotificationClick}
 * />
 *
 * // Custom styling and behavior
 * <Notifications
 * count={notifications.filter(n => !n.read).length}
 * maxVisible={5}
 * onMarkAllRead={markAllAsRead}
 *
 * />
 * ```
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export const Notifications = ({
  notifications = [],
  count = 0,
  loading = false,
  onNotificationClick,
  onDropdownOpen,
  className,
  maxVisible = 10,
  alwaysShow = false,
  size = 'md',
  disabled = false,
}: NotificationsProps) => {
  const sizeVariant = SIZE_VARIANTS[size];
  const shownNotificationIds = useRef<Set<string>>(new Set());

  // Calculate display count (format large numbers)
  const displayCount = useMemo(() => {
    if (count === 0) return null;
    if (count > 99) return '99+';
    return count.toString();
  }, [count]);

  // Show component if there are notifications or alwaysShow is true
  const shouldShow = count > 0 || alwaysShow;

  // Show new notifications as infinite toasts
  useEffect(() => {
    notifications.forEach((notification) => {
      if (!shownNotificationIds.current.has(notification.id)) {
        shownNotificationIds.current.add(notification.id);

        const toastType =
          notification.type === 'error'
            ? 'error'
            : notification.type === 'warning'
              ? 'warning'
              : notification.type === 'success'
                ? 'success'
                : 'info';

        toast({
          title: notification.title,
          description: notification.message,
          toastType: toastType,
          duration: 0, // Infinite/persistent
          onDismiss: () => {
            shownNotificationIds.current.delete(notification.id);
            if (onNotificationClick) {
              onNotificationClick(notification);
            }
          },
        });
      }
    });
  }, [notifications, onNotificationClick]);

  if (!shouldShow) {
    return null;
  }

  return (
    <div className={cn(className)} style={{ position: 'relative' }}>
      <Button
        disabled={disabled}
        style={{
          ...sizeVariant.button,
          position: 'relative',
        }}
        onClick={() => {
          onDropdownOpen?.();
        }}
        onFocus={(e) => {
          e.currentTarget.style.outline = '2px solid var(--ring)';
          e.currentTarget.style.outlineOffset = '2px';
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = 'none';
        }}
        aria-label={`${count} notification${count !== 1 ? 's' : ''}`}
        icon={Bell}
      >
        {/* Notification Badge */}
        {displayCount && (
          <Stack
            align="center"
            justify="center"
            style={{
              position: 'absolute',
              top: '-0.25rem',
              insetInlineEnd: '-0.25rem',
              backgroundColor: 'var(--destructive)',
              color: 'var(--destructive-foreground)',
              borderRadius: 'var(--radius-full)',
              fontWeight: 600,
              lineHeight: 1,
              minWidth: 0,
              ...sizeVariant.badge,
            }}
            aria-hidden="true"
          >
            {displayCount}
          </Stack>
        )}
      </Button>
    </div>
  );
};

export default Notifications;
