import { isRouteErrorResponse, useRouteError, Link } from 'react-router-dom';

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
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      <p className="mt-4 text-gray-600">{message}</p>
      <div className="mt-8 flex justify-center gap-3">
        <button
          onClick={() => window.location.reload()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Презареди
        </button>
        {status !== 404 && (
          <Link
            to="/"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Към началото
          </Link>
        )}
      </div>
    </div>
  );
}
