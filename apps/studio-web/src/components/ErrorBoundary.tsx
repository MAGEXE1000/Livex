import React, { Component, ReactNode, ErrorInfo } from 'react';
import { captureException } from '@workspace/livex-core';
import { ErrorFallbackPage } from '@workspace/ui-web';

interface Props {
  children: ReactNode;
  fallback?: (error: Error | null, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    try {
      captureException(error, {
        source: 'ErrorBoundary:WebRoot',
        componentStack: errorInfo?.componentStack?.slice(0, 1000),
      });
    } catch (_) {}

    // Unlock any navigation lock if in transition
    if (typeof window !== 'undefined') {
      (window as any).studioTransitionActive = false;
    }
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }
      return (
        <ErrorFallbackPage
          error={this.state.error}
          resetErrorBoundary={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
