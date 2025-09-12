declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js' | 'set',
      target: string | Date | object,
      config?: object
    ) => void;
    dataLayer: any[];
  }
}

// Google Analytics tracking ID
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_TRACKING_ID;

// Check if we're in production and have a tracking ID
export const isAnalyticsEnabled = () => {
  return (
    process.env.NODE_ENV === 'production' && 
    GA_TRACKING_ID && 
    typeof window !== 'undefined'
  );
};

// Initialize Google Analytics
export const initGA = () => {
  if (!isAnalyticsEnabled() || !GA_TRACKING_ID) return;

  // Initialize dataLayer if it doesn't exist
  window.dataLayer = window.dataLayer || [];
  
  // Initialize gtag function
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', GA_TRACKING_ID, {
    page_title: document.title,
    page_location: window.location.href,
  });
};

// Track page views
export const trackPageView = (page_path: string, page_title?: string) => {
  if (!isAnalyticsEnabled() || !GA_TRACKING_ID) return;

  window.gtag('config', GA_TRACKING_ID, {
    page_path,
    page_title,
  });
};

// Generic event tracking
export const trackEvent = (
  action: string,
  category: string,
  label?: string,
  value?: number,
  additionalParams?: Record<string, any>
) => {
  if (!isAnalyticsEnabled()) return;

  const eventParams: Record<string, any> = {
    event_category: category,
    ...additionalParams,
  };

  if (label) eventParams.event_label = label;
  if (value !== undefined) eventParams.value = value;

  window.gtag('event', action, eventParams);
};

// Authentication Events
export const trackAuthEvent = (action: 'login' | 'register' | 'logout', method?: string) => {
  trackEvent(action, 'authentication', method);
};

// Flow Builder Events
export const trackFlowEvent = (
  action: 'create' | 'save' | 'delete' | 'execute' | 'publish',
  flowId?: string,
  additionalData?: Record<string, any>
) => {
  trackEvent(action, 'flow_management', flowId, undefined, {
    flow_id: flowId,
    ...additionalData,
  });
};

// Node Events
export const trackNodeEvent = (
  action: 'add' | 'delete' | 'configure' | 'connect',
  nodeType: string,
  nodeId?: string
) => {
  trackEvent(action, 'node_operations', nodeType, undefined, {
    node_type: nodeType,
    node_id: nodeId,
  });
};

// Canvas Events
export const trackCanvasEvent = (
  action: 'zoom' | 'pan' | 'select' | 'clear',
  target?: string
) => {
  trackEvent(action, 'canvas_interaction', target);
};

// Code Generation Events
export const trackCodeEvent = (
  action: 'generate' | 'preview' | 'copy' | 'download',
  language?: string,
  linesOfCode?: number
) => {
  trackEvent(action, 'code_generation', language, linesOfCode);
};

// Testing Events
export const trackTestEvent = (
  action: 'run' | 'success' | 'error',
  flowId?: string,
  executionTime?: number
) => {
  trackEvent(action, 'flow_testing', flowId, executionTime, {
    flow_id: flowId,
  });
};

// User Engagement Events
export const trackEngagement = (
  action: 'session_start' | 'feature_usage' | 'help_accessed',
  feature?: string,
  duration?: number
) => {
  trackEvent(action, 'user_engagement', feature, duration);
};

// Error Tracking
export const trackError = (
  error: string,
  component: string,
  severity: 'low' | 'medium' | 'high' = 'medium'
) => {
  trackEvent('error', 'application_errors', `${component}: ${error}`, undefined, {
    error_component: component,
    error_severity: severity,
    error_message: error,
  });
};

// Performance Tracking
export const trackTiming = (
  name: string,
  value: number,
  category: string = 'performance'
) => {
  if (!isAnalyticsEnabled()) return;

  window.gtag('event', 'timing_complete', {
    name,
    value,
    event_category: category,
  });
};

// Custom Dimensions (for enhanced tracking)
export const setCustomDimension = (index: number, value: string) => {
  if (!isAnalyticsEnabled()) return;

  window.gtag('config', GA_TRACKING_ID!, {
    [`custom_map.dimension${index}`]: value,
  });
};

// User Properties
export const setUserProperty = (propertyName: string, value: string) => {
  if (!isAnalyticsEnabled()) return;

  window.gtag('set', {
    [propertyName]: value,
  });
};