import React from 'react';

export interface SidebarListItem {
  id: string;
  title: string;
  subtitle?: string;
  onClick: () => void;
}

export interface SidebarListProps {
  items: SidebarListItem[];
  selectedId?: string;
  emptyMessage?: string;
  headerAction?: React.ReactNode;
  className?: string;
}

export function SidebarList({ 
  items, 
  selectedId, 
  emptyMessage = "No items yet.", 
  headerAction,
  className = ""
}: SidebarListProps) {
  return (
    <div className={`flex-1 overflow-auto ${className}`}>
      <ul className="menu w-full p-0">
        {headerAction && (
          <li className="border-b border-base-300">
            {headerAction}
          </li>
        )}
        {items.length === 0 ? (
          <li>
            <div className="justify-center text-base-content/60 text-sm cursor-default">
              {emptyMessage}
            </div>
          </li>
        ) : (
          items.map((item) => (
            <li key={item.id}>
              <button 
                onClick={item.onClick}
                className={`justify-start h-auto py-3 ${selectedId === item.id ? 'active bg-primary/10 text-primary' : ''}`}
              >
                <div className="flex flex-col items-start gap-1 w-full">
                  <div className="text-sm font-medium">{item.title}</div>
                  {item.subtitle && (
                    <div className="text-xs text-base-content/60">{item.subtitle}</div>
                  )}
                </div>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

// Specialized component for creating new items
export function SidebarListHeader({ onClick, label, icon = "+" }: { onClick: () => void; label: string; icon?: string }) {
  return (
    <button onClick={onClick} className="justify-start">
      <span className="text-primary">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}