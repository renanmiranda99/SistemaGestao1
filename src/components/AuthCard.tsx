export function AuthCard({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-stone-50 to-stone-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-lg font-bold text-white">G</span>
          <span className="text-lg font-semibold text-slate-900">Gestão da Galeria</span>
        </div>
        <div className="card p-8">
          <h1 className="text-xl font-semibold text-slate-900">{titulo}</h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">{subtitulo}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
