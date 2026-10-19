import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";

export default async function Home() {
  const { user, perfil } = await getSessao();
  if (!user || !perfil) redirect("/login");
  redirect(perfil.role === "admin" ? "/admin" : "/inquilino");
}
