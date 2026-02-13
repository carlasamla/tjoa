export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-bold mb-4">You are offline</h1>
      <p className="text-muted text-center">
        Please check your internet connection and try again.
      </p>
    </div>
  );
}
