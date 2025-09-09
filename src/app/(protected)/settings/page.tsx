'use client';

import React from 'react';
import { User, Mail, Shield, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRequireAuth } from '@/components/auth/AuthProvider';

export default function SettingsPage() {
  const { session } = useRequireAuth();

  if (!session) {
    return null; // Will be handled by useRequireAuth
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="bg-base-100 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-base-content">Account Settings</h1>
            <p className="mt-1 text-sm text-base-content/70">
              Manage your account preferences and security settings.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Profile Section */}
          <div className="bg-base-100 shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-base-content flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center gap-4">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name}
                    className="w-16 h-16 rounded-full"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-medium text-base-content">
                    {session.user.name || 'Anonymous User'}
                  </h3>
                  <p className="text-sm text-base-content/70">{session.user.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={session.user.name || ''}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 bg-base-200 text-base-content/60 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={session.user.email}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 bg-base-200 text-base-content/60 cursor-not-allowed"
                  />
                </div>
              </div>
              
              <p className="text-xs text-base-content/60">
                Profile information is managed through your authentication provider.
              </p>
            </div>
          </div>

          {/* Account Security */}
          <div className="bg-base-100 shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-base-content flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Account Security
              </h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-base-content">Authentication Method</h3>
                  <p className="text-sm text-base-content/70">
                    You're signed in with {session.user.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600">Verified</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-base-content">API Keys</h3>
                  <p className="text-sm text-base-content/70">
                    Manage API keys for external integrations
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  <Key className="w-4 h-4 mr-2" />
                  Coming Soon
                </Button>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-base-100 shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-base-content">Preferences</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-base-content">Email Notifications</h3>
                  <p className="text-sm text-base-content/70">
                    Receive updates about your flows and account
                  </p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-base-content">Auto-save Flows</h3>
                  <p className="text-sm text-base-content/70">
                    Automatically save your work as you build
                  </p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-base-100 shadow rounded-lg border border-red-200">
            <div className="px-6 py-4 border-b border-red-200">
              <h2 className="text-lg font-medium text-red-900">Danger Zone</h2>
            </div>
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-red-900">Delete Account</h3>
                  <p className="text-sm text-red-600">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled className="border-red-300 text-red-600">
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}