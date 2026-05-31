export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <section className="w-full max-w-3xl rounded-lg border border-slate-700 bg-slate-900 p-6">
        <p className="text-sm uppercase tracking-wide text-violet-300">
          Local Research Assistant
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-50">
          RAG chatbot setup is ready
        </h1>
        <p className="mt-4 text-slate-300">
          The full chat UI will be implemented in Phase 5. Backend health is
          available at <code className="text-violet-200">/health</code>.
        </p>
      </section>
    </main>
  );
}
