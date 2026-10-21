import Link from "next/link";
import { getConfig } from "@/lib/config";

export async function AuthCard({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo: React.ReactNode;
  children: React.ReactNode;
}) {
  const config = await getConfig();
  return (
    <div className="flex min-h-screen flex-wrap bg-stone-50">
      <section className="flex flex-[1_1_420px] flex-col justify-between gap-10 bg-brand-900 px-6 py-10 text-white/90 md:p-12">
        <Link href="/" title="Ir para a página inicial" className="flex w-fit items-center gap-3 rounded-[11px] hover:opacity-90">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={config.logoMarcaUrl} alt="" width={40} height={40} className="h-10 w-10 rounded-[11px] ring-1 ring-white/25" />
          <span className="text-[17px] font-semibold text-white">{config.nome}</span>
        </Link>
        <div className="flex max-w-[460px] flex-col gap-4">
          <h2 className="text-[32px] font-bold leading-tight tracking-tight text-white md:text-[40px]">{config.loginTitulo}</h2>
          <p className="text-base leading-relaxed text-white/70">
            {config.loginTexto}
          </p>
        </div>
        <span className="hidden text-[13px] text-white/60 md:block">{config.endereco ? `${config.nome} · ${config.endereco}` : "Portal de inquilinos e administração"}</span>
      </section>

      <section className="grid flex-[1_1_480px] place-items-center px-6 py-12">
        <div className="w-full max-w-[440px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={config.logoCompletaUrl} alt={config.nome} width={1000} height={278} className="mb-8 h-auto w-[220px] mix-blend-multiply" />
          <h1 className="text-[28px] font-bold tracking-tight text-stone-900">{titulo}</h1>
          <p className="mb-7 mt-1.5 text-[15px] text-stone-600">{subtitulo}</p>
          {children}
        </div>
      </section>
    </div>
  );
}
