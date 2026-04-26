import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from './ui';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-bg px-4">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-fg">Възникна грешка</h1>
            <p className="mt-2 text-sm text-fg-muted">
              Появи се неочаквана грешка. Моля, опитай да презаредиш страницата.
            </p>
            <div className="mt-6 flex justify-center">
              <Button
                variant="primary"
                size="lg"
                onClick={() => window.location.reload()}
                leadingIcon={<RotateCw className="h-4 w-4" />}
              >
                Презареди страницата
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
