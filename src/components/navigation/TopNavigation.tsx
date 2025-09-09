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
    <div className="navbar bg-base-100 border-b min-h-14 h-14">
      {/* Logo */}
      <div className="navbar-start">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" />
          <span className="text-lg font-semibold text-base-content">Flowshapr</span>
        </div>
      </div>
      
      {/* Right side: Service menu + Account */}
      <div className="navbar-end">
        <div className="flex items-center gap-4">
          <ServiceMenu />
          {user && <UserMenu user={user} />}
        </div>
      </div>
    </div>
  );
}