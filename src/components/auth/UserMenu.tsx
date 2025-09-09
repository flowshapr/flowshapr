'use client';

import React, { useState } from 'react';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from './AuthProvider';
import { useRouter } from 'next/navigation';

interface UserMenuProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const handleSettings = () => {
    router.push('/settings');
    setIsOpen(false);
  };

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-sm gap-2">
        <div className="flex items-center gap-2">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name}
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <User className="w-4 h-4 text-primary-content" />
            </div>
          )}
          <span className="text-sm font-medium text-base-content">
            {user.name || user.email}
          </span>
          <ChevronDown className="w-4 h-4 text-base-content/60" />
        </div>
      </div>

      <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-20 w-56 p-2 shadow-lg mt-2">
        <li className="p-3 border-b border-base-300 mb-2">
          <div>
            <p className="text-sm font-medium text-base-content">{user.name}</p>
            <p className="text-xs text-base-content/60">{user.email}</p>
          </div>
        </li>
        
        <li>
          <button onClick={handleSettings} className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Account Settings
          </button>
        </li>
        
        <li>
          <button onClick={handleSignOut} className="flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </li>
      </ul>
    </div>
  );
}