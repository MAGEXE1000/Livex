import React from 'react';
import { motion } from 'motion/react';

export interface TabOption<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
}

export interface SmoothTabsProps<T extends string = string> {
  tabs: TabOption<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  layoutId?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SmoothTabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  layoutId = 'smooth-tab-pill',
  className = '',
  size = 'md',
}: SmoothTabsProps<T>) {
  const sizeClasses = {
    sm: 'text-[11px] px-2.5 py-1',
    md: 'text-xs px-3.5 py-1.5',
    lg: 'text-sm px-4 py-2',
  }[size];

  return (
    <div
      role="tablist"
      className={`inline-flex items-center gap-1 p-1 rounded-full border select-none transition-colors duration-200 ${className}`}
      style={{
        backgroundColor: 'var(--landing-surface-subtle, rgba(255, 255, 255, 0.04))',
        borderColor: 'var(--landing-border, rgba(255, 255, 255, 0.08))',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-2 rounded-full font-medium transition-colors duration-150 cursor-pointer ${sizeClasses}`}
            style={{
              color: isActive
                ? 'var(--landing-text-primary, #ffffff)'
                : 'var(--landing-text-secondary, #a1a1aa)',
            }}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 rounded-full shadow-sm"
                style={{
                  backgroundColor: 'var(--landing-surface-card, rgba(255, 255, 255, 0.12))',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                }}
                transition={{
                  type: 'spring',
                  stiffness: 450,
                  damping: 32,
                }}
              />
            )}
            {tab.icon && <span className="relative z-10 flex-shrink-0">{tab.icon}</span>}
            <span className="relative z-10 whitespace-nowrap">{tab.label}</span>
            {tab.badge && (
              <span
                className="relative z-10 text-[9px] font-semibold px-1.5 py-0.2 rounded-full"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'var(--landing-text-primary, #ffffff)',
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default SmoothTabs;
