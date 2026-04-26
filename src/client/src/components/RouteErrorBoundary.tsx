import { isRouteErrorResponse, useRouteError, Link } from 'react-router-dom';
import { AlertTriangle, Home, RotateCw } from 'lucide-react';
import { Button, Container } from './ui';

export function RouteErrorBoundary() {
  const error = useRouteError();

  let title = 'Възникна грешка';
  let message = 'Възникна неочаквана грешка при зареждането на страницата.';
  let status: number | null = null;

  if (isRouteErrorResponse(error)) {
    status = error.status;
    title = `${error.status} ${error.statusText}`;
    message = error.data?.message ?? error.statusText ?? message;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <Container size="sm" className="py-16 text-center">
      <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
      <p className="mt-2 text-sm text-fg-muted">{message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button
          variant="primary"
          onClick={() => window.location.reload()}
          leadingIcon={<RotateCw className="h-4 w-4" />}
        >
          Презареди
        </Button>
        {status !== 404 && (
          <Link to="/">
            <Button variant="secondary" leadingIcon={<Home className="h-4 w-4" />}>
              Към началото
            </Button>
          </Link>
        )}
      </div>
    </Container>
  );
}
