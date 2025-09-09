import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  MoreHorizontal, 
  Settings, 
  Users, 
  Building2, 
  HelpCircle, 
  CreditCard,
  Plus
} from 'lucide-react';

export function ServiceMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      icon: Building2,
      label: 'Organizations',
      action: () => console.log('Organizations'),
      description: 'Manage organizations and teams'
    },
    {
      icon: Users,
      label: 'Members',
      action: () => console.log('Members'),
      description: 'Invite and manage team members'
    },
    {
      icon: CreditCard,
      label: 'Billing',
      action: () => console.log('Billing'),
      description: 'View usage and manage billing'
    },
    {
      icon: Settings,
      label: 'Account Settings',
      action: () => console.log('Settings'),
      description: 'Manage your account preferences'
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      action: () => console.log('Help'),
      description: 'Get help and documentation'
    }
  ];

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-sm gap-2">
        <MoreHorizontal className="w-4 h-4" />
        Menu
      </div>

      <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-20 w-72 p-2 shadow-lg mt-2">
        <li className="menu-title">
          <span>Services</span>
        </li>
        {menuItems.map((item, index) => (
          <li key={index}>
            <button
              onClick={() => {
                item.action();
              }}
              className="flex items-start gap-3"
            >
              <item.icon className="w-4 h-4 mt-0.5" />
              <div className="flex-1 text-left">
                <div className="font-medium">{item.label}</div>
                <div className="text-xs text-base-content/60 mt-0.5">
                  {item.description}
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}