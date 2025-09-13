'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  trackPageView,
  trackEvent,
  trackAuthEvent,
  trackFlowEvent,
  trackNodeEvent,
  trackCanvasEvent,
  trackCodeEvent,
  trackTestEvent,
  trackEngagement,
  trackError,
  trackTiming,
  setUserProperty,
} from '@/lib/analytics';

export interface AnalyticsConfig {
  userId?: string;
  userType?: 'free' | 'pro' | 'enterprise';
  organizationId?: string;
}

export function useAnalytics(config?: AnalyticsConfig) {
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Track page views automatically (client-side only)
  useEffect(() => {
    if (!isClient) return;
    
    try {
      // Get search params directly from window.location on client
      const searchParams = new URLSearchParams(window.location.search);
      const url = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      trackPageView(url);
    } catch (error) {
      // Fallback to just pathname
      trackPageView(pathname);
    }
  }, [pathname, isClient]);

  // Set user properties when config changes
  useEffect(() => {
    if (config?.userId) {
      setUserProperty('user_id', config.userId);
    }
    if (config?.userType) {
      setUserProperty('user_type', config.userType);
    }
    if (config?.organizationId) {
      setUserProperty('organization_id', config.organizationId);
    }
  }, [config]);

  // Authentication tracking
  const trackAuth = useCallback((action: 'login' | 'register' | 'logout', method?: string) => {
    trackAuthEvent(action, method);
  }, []);

  // Flow management tracking
  const trackFlow = useCallback((
    action: 'create' | 'save' | 'delete' | 'execute' | 'publish',
    flowId?: string,
    additionalData?: Record<string, any>
  ) => {
    trackFlowEvent(action, flowId, additionalData);
  }, []);

  // Node operations tracking
  const trackNode = useCallback((
    action: 'add' | 'delete' | 'configure' | 'connect',
    nodeType: string,
    nodeId?: string
  ) => {
    trackNodeEvent(action, nodeType, nodeId);
  }, []);

  // Canvas interactions tracking
  const trackCanvas = useCallback((
    action: 'zoom' | 'pan' | 'select' | 'clear',
    target?: string
  ) => {
    trackCanvasEvent(action, target);
  }, []);

  // Code generation tracking
  const trackCode = useCallback((
    action: 'generate' | 'preview' | 'copy' | 'download',
    language?: string,
    linesOfCode?: number
  ) => {
    trackCodeEvent(action, language, linesOfCode);
  }, []);

  // Testing tracking
  const trackTest = useCallback((
    action: 'run' | 'success' | 'error',
    flowId?: string,
    executionTime?: number
  ) => {
    trackTestEvent(action, flowId, executionTime);
  }, []);

  // User engagement tracking
  const trackUserEngagement = useCallback((
    action: 'session_start' | 'feature_usage' | 'help_accessed',
    feature?: string,
    duration?: number
  ) => {
    trackEngagement(action, feature, duration);
  }, []);

  // Error tracking
  const trackAppError = useCallback((
    error: string,
    component: string,
    severity: 'low' | 'medium' | 'high' = 'medium'
  ) => {
    trackError(error, component, severity);
  }, []);

  // Performance tracking
  const trackPerformance = useCallback((
    name: string,
    value: number,
    category: string = 'performance'
  ) => {
    trackTiming(name, value, category);
  }, []);

  // Generic event tracking
  const track = useCallback((
    action: string,
    category: string,
    label?: string,
    value?: number,
    additionalParams?: Record<string, any>
  ) => {
    trackEvent(action, category, label, value, additionalParams);
  }, []);

  // Session duration tracking
  useEffect(() => {
    const sessionStart = Date.now();
    
    // Track session start
    trackUserEngagement('session_start');

    // Track session duration on unmount
    return () => {
      const sessionDuration = Date.now() - sessionStart;
      trackPerformance('session_duration', sessionDuration, 'user_engagement');
    };
  }, [trackUserEngagement, trackPerformance]);

  return {
    // Direct tracking methods
    track,
    trackAuth,
    trackFlow,
    trackNode,
    trackCanvas,
    trackCode,
    trackTest,
    trackUserEngagement,
    trackAppError,
    trackPerformance,
    
    // Utility methods for common patterns
    trackFeatureUsage: useCallback((feature: string) => {
      trackUserEngagement('feature_usage', feature);
    }, [trackUserEngagement]),
    
    trackHelpAccess: useCallback((section: string) => {
      trackUserEngagement('help_accessed', section);
    }, [trackUserEngagement]),
    
    trackFlowCreate: useCallback((flowId: string, nodeCount?: number) => {
      trackFlow('create', flowId, { node_count: nodeCount });
    }, [trackFlow]),
    
    trackFlowSave: useCallback((flowId: string, changesSaved?: number) => {
      trackFlow('save', flowId, { changes_saved: changesSaved });
    }, [trackFlow]),
    
    trackNodeAdd: useCallback((nodeType: string, position?: { x: number; y: number }) => {
      trackNode('add', nodeType, undefined);
      if (position) {
        track('node_positioned', 'canvas_interaction', nodeType, undefined, position);
      }
    }, [trackNode, track]),
    
    trackExecutionStart: useCallback((flowId: string) => {
      trackTest('run', flowId);
      return Date.now(); // Return timestamp for duration calculation
    }, [trackTest]),
    
    trackExecutionEnd: useCallback((flowId: string, startTime: number, success: boolean) => {
      const executionTime = Date.now() - startTime;
      trackTest(success ? 'success' : 'error', flowId, executionTime);
    }, [trackTest]),
  };
}

// Higher-order component for automatic error tracking
export function withAnalyticsErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  componentName: string
) {
  return function AnalyticsErrorBoundaryWrapper(props: T) {
    useEffect(() => {
      const handleError = (event: ErrorEvent) => {
        trackError(event.message, componentName, 'high');
      };

      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        trackError(String(event.reason), componentName, 'high');
      };

      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }, []);

    return React.createElement(Component, props);
  };
}