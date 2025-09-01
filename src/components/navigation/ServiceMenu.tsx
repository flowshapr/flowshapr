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
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <MoreHorizontal className="w-4 h-4" />
        Menu
      </Button>

      {isOpen && (
        <>
          {/* Overlay to close menu */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown menu */}
          <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="p-2">
              <div className="px-3 py-2 text-sm font-medium text-gray-900 border-b border-gray-100 mb-2">
                Services
              </div>
              
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    item.action();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-start gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                >
                  <item.icon className="w-4 h-4 mt-0.5 text-gray-500" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {item.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}