/** Esqueleto exibido instantaneamente enquanto a página busca os dados. */
export function Carregando() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Carregando">
      <div className="mb-6 h-7 w-48 rounded bg-stone-200" />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 rounded-xl border border-stone-200 bg-white" />
        ))}
      </div>
      <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-5">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-4 rounded bg-stone-100" style={{ width: `${90 - i * 8}%` }} />
        ))}
      </div>
    </div>
  );
}
