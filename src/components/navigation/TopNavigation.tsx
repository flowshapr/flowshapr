import React from 'react';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/auth/UserMenu';
import { ServiceMenu } from './ServiceMenu';
import { Zap } from 'lucide-react';

interface TopNavigationProps {
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

export function TopNavigation({ user }: TopNavigationProps) {
  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-blue-600" />
          <span className="text-lg font-semibold text-gray-900">Flowshapr</span>
        </div>
      </div>
      
      {/* Right side: Service menu + Account */}
      <div className="flex items-center gap-4">
        <ServiceMenu />
        {user && <UserMenu user={user} />}
      </div>
    </div>
  );
}