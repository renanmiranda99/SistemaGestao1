import { LOGO_COMPLETA, LOGO_MARCA, NOME_GALERIA } from "@/lib/galeria";

export function AuthCard({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-wrap bg-stone-50">
      <section className="flex flex-[1_1_420px] flex-col justify-between gap-10 bg-brand-900 px-6 py-10 text-[#e6ecf5] md:p-12">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_MARCA} alt="" width={40} height={40} className="h-10 w-10 rounded-[11px] ring-1 ring-white/25" />
          <span className="text-[17px] font-semibold text-white">{NOME_GALERIA}</span>
        </div>
        <div className="flex max-w-[460px] flex-col gap-4">
          <h2 className="text-[32px] font-bold leading-tight tracking-tight text-white md:text-[40px]">Aluguéis da galeria, mês a mês.</h2>
          <p className="text-base leading-relaxed text-[#b7c6da]">
            Boletos, comprovantes, contratos e chamados em um só lugar, para a administração e para cada inquilino.
          </p>
        </div>
        <span className="hidden text-[13px] text-[#93a7c2] md:block">Portal de inquilinos e administração da galeria</span>
      </section>

      <section className="grid flex-[1_1_480px] place-items-center px-6 py-12">
        <div className="w-full max-w-[440px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_COMPLETA} alt={NOME_GALERIA} width={1000} height={278} className="mb-8 h-auto w-[220px] mix-blend-multiply" />
          <h1 className="text-[28px] font-bold tracking-tight text-stone-900">{titulo}</h1>
          <p className="mb-7 mt-1.5 text-[15px] text-stone-600">{subtitulo}</p>
          {children}
        </div>
      </section>
    </div>
  );
}
