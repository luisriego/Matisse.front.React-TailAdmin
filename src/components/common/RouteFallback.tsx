export default function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-8">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent dark:border-brand-400"
        role="status"
        aria-label="Carregando página"
      />
    </div>
  );
}
