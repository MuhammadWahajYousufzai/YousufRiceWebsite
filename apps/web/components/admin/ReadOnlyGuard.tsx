'use client';

import React from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { Tooltip } from '../ui/tooltip';
import { LockIcon } from 'lucide-react';

interface ReadOnlyGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showTooltip?: boolean;
  tooltipText?: string;
}

/**
 * Component that conditionally renders its children based on write permission
 * For read-only users, it either shows a fallback or disables the children
 */
export default function ReadOnlyGuard({
  children,
  fallback,
  showTooltip = true,
  tooltipText = "Read-only access: You can view but not modify content"
}: ReadOnlyGuardProps) {
  const { hasWritePermission } = useAuthStore();
  
  // If user has write permission, render children normally
  if (hasWritePermission()) {
    return <>{children}</>;
  }
  
  // If fallback is provided, show that instead for read-only users
  if (fallback) {
    return <>{fallback}</>;
  }
  
  // Otherwise, clone the child element and disable it
  const disabledChild = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    
    // Get the existing className if any
    const existingClassName = child.props && typeof child.props === 'object' && 'className' in child.props ? child.props.className : '';
    
    // Prevent all interactive events for strict read-only access
    const disabledProps = {
      disabled: true,
      className: `${existingClassName} opacity-60 cursor-not-allowed`,
      'aria-disabled': true,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      },
      onSubmit: (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        // Prevent Enter key from triggering clicks
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      },
    } as any; // Use 'any' to allow adding these event handlers
    
    return React.cloneElement(child, disabledProps);
  });
  
  // Wrap in tooltip if showTooltip is true
  if (showTooltip) {
    return (
      <Tooltip content={tooltipText}>
        <span className="inline-flex relative">
          {disabledChild}
          <LockIcon className="w-3 h-3 absolute top-0 right-0 text-amber-500" />
        </span>
      </Tooltip>
    );
  }
  
  return <>{disabledChild}</>;
}
