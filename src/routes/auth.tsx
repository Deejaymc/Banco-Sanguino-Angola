import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Droplet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BLOOD_TYPES } from "@/lib/blood";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Gota Viva" },
      { name: "description", content: "Entre ou crie a sua conta de doador na Gota Viva." },
      { property: "og:title", content: "Entrar — Gota Viva" },
      { property: "og:description", content: "Acesso para doadores, gestores e hospitais." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", phone: "", blood_type: "" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/painel" });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/painel" });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
      if (error) toast.error("Email ou palavra-passe incorretos.");
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: window.location.origin + "/painel",
          data: { full_name: form.full_name, phone: form.phone, blood_type: form.blood_type },
        },
      });
      if (error) toast.error(error.message);
      else if (!data.session) toast.success("Conta criada! Confirme o seu email para entrar.");
    }
    setLoading(false);
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (result.error) toast.error("Não foi possível entrar com Google.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="panel w-full max-w-md p-8">
        <Link to="/" className="mb-6 flex items-center gap-2 text-primary">
          <Droplet className="h-6 w-6 fill-current" />
          <span className="font-display text-xl font-semibold text-foreground">Gota Viva</span>
        </Link>
        <h1 className="text-3xl font-semibold">{mode === "login" ? "Bem-vindo de volta" : "Torne-se doador"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "login" ? "Entre para gerir as suas doações." : "Leva menos de um minuto."}
        </p>

        <Button variant="outline" className="mt-6 w-full" onClick={google} type="button">Continuar com Google</Button>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />ou<div className="h-px flex-1 bg-border" /></div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <>
              <div><Label>Nome completo</Label><Input required value={form.full_name} onChange={set("full_name")} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Telefone</Label><Input value={form.phone} onChange={set("phone")} /></div>
                <div>
                  <Label>Tipo sanguíneo</Label>
                  <select className="field" value={form.blood_type} onChange={set("blood_type")}>
                    <option value="">Não sei</option>
                    {BLOOD_TYPES.map((b) => <option key={b}>{b}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}
          <div><Label>Email</Label><Input type="email" required value={form.email} onChange={set("email")} /></div>
          <div><Label>Palavra-passe</Label><Input type="password" required minLength={6} value={form.password} onChange={set("password")} /></div>
          <Button type="submit" className="w-full" disabled={loading}>{mode === "login" ? "Entrar" : "Criar conta"}</Button>
        </form>

        <button className="mt-5 w-full text-center text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "Ainda não tem conta? Registe-se" : "Já tem conta? Entrar"}
        </button>
      </div>
    </div>
  );
}
