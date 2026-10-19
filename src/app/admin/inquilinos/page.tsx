import Link from "next/link";
import { exigirPerfil } from "@/lib/auth";
import { dadosAdmin } from "@/lib/dados-admin";
import { ehPendente, situacao, valorAtualizado } from "@/lib/cobranca";
import { brl, hojeISO } from "@/lib/format";
import { apiWhatsAppConfigurada, mensagemCobranca } from "@/lib/whatsapp";
import { PageHeader, Vazio } from "@/components/ui";
import { BotaoWhatsApp } from "@/components/BotaoWhatsApp";

export default async function AdminInquilinos({ searchParams }: { searchParams: { q?: string } }) {
  const { supabase } = await exigirPerfil("admin");
  const { inquilinos, cobrancas, contratoDe, salasDe } = await dadosAdmin(supabase);
  const hoje = hojeISO();
  const api = apiWhatsAppConfigurada();
  const q = (searchParams.q ?? "").toLowerCase();
  const lista = inquilinos.filter(
    (i) => !q || [i.nome, i.email, i.telefone, i.cpf_cnpj].some((v) => v?.toLowerCase().includes(q))
  );

  return (
    <>
      <PageHeader
        titulo="Inquilinos"
        descricao={`${inquilinos.length} cadastrado(s). Novos inquilinos se cadastram pela tela de cadastro.`}
      />
      <form className="mb-4">
        <input name="q" defaultValue={searchParams.q} className="input max-w-sm" placeholder="Buscar por nome, e-mail, telefone, CPF/CNPJ..." />
      </form>
      {lista.length ? (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Inquilino</th>
                <th>Sala(s)</th>
                <th>Telefone</th>
                <th>Situação</th>
                <th className="text-right">Em aberto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((i) => {
                const pend = cobrancas.filter((c) => c.inquilino_id === i.id && ehPendente(c, hoje));
                const total = pend.reduce((s, c) => s + valorAtualizado(c, contratoDe(c), hoje).total, 0);
                const emCobranca = pend.filter((c) => situacao(c, hoje) === "em_cobranca");
                const maisAntiga = emCobranca.sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0];
                return (
                  <tr key={i.id} className={i.ativo ? "" : "opacity-50"}>
                    <td>
                      <Link href={`/admin/inquilinos/${i.id}`} className="font-medium text-slate-900 hover:underline">
                        {i.nome || "(sem nome)"}
                      </Link>
                      <div className="text-xs text-slate-500">{i.email}</div>
                    </td>
                    <td>{salasDe(i.id).map((s) => s.nome).join(", ") || "—"}</td>
                    <td>{i.telefone || "—"}</td>
                    <td>
                      {!i.ativo ? (
                        <span className="badge bg-slate-100 text-slate-500 ring-slate-200">Inativo</span>
                      ) : emCobranca.length ? (
                        <span className="badge bg-red-100 text-red-800 ring-red-200">Em cobrança</span>
                      ) : pend.length ? (
                        <span className="badge bg-orange-100 text-orange-800 ring-orange-200">Atrasado</span>
                      ) : (
                        <span className="badge bg-emerald-100 text-emerald-800 ring-emerald-200">Em dia</span>
                      )}
                    </td>
                    <td className="text-right font-medium">{total ? brl(total) : "—"}</td>
                    <td className="text-right">
                      <BotaoWhatsApp
                        inquilinoId={i.id}
                        cobrancaId={maisAntiga?.id}
                        telefone={i.telefone}
                        apiConfigurada={api}
                        mensagem={
                          maisAntiga
                            ? mensagemCobranca({
                                nome: i.nome,
                                competencia: maisAntiga.competencia,
                                vencimento: maisAntiga.vencimento,
                                valor: valorAtualizado(maisAntiga, contratoDe(maisAntiga), hoje).total,
                                dias: valorAtualizado(maisAntiga, contratoDe(maisAntiga), hoje).dias,
                              })
                            : `Olá, ${i.nome.split(" ")[0]}! `
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Vazio>Nenhum inquilino encontrado.</Vazio>
      )}
    </>
  );
}
