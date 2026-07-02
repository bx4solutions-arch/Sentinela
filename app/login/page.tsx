"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { createClient } from "@/lib/supabase/client";

type View = "login" | "recuperar";

export default function LoginPage() {
  const [view, setView] = useState<View>("login");

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[46%_54%]">
      {/* COLUNA FORMULÁRIO */}
      <div className="relative flex flex-col px-6 py-8 sm:px-14 sm:py-12">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <BrandMark size={42} />
            <span className="font-display text-[26px] font-extrabold tracking-tight text-indigo-deep">
              Sentinela
            </span>
          </div>
          <span className="text-[13px] font-medium text-cinza">
            Inteligência pré-edital ·{" "}
            <a href="#" className="font-semibold text-violeta">
              Conheça a Sentinela →
            </a>
          </span>
        </div>

        <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center">
          {view === "login" ? (
            <LoginForm onForgot={() => setView("recuperar")} />
          ) : (
            <RecoverForm onBack={() => setView("login")} />
          )}
        </div>

        <p className="mt-8 text-center text-[11px] text-cinza">
          © 2026 BX4 Technology Solutions · Sentinela
        </p>
      </div>

      <BrandPanel />
    </div>
  );
}

const inputCls =
  "h-12 w-full rounded-[11px] border-[1.5px] border-borda bg-white px-4 text-sm outline-none transition focus:border-violeta focus:ring-4 focus:ring-violeta/12";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-[18px]">
      <label className="mb-[7px] block font-display text-[13px] font-semibold text-indigo-deep">
        {label}
      </label>
      <div className="relative">{children}</div>
    </div>
  );
}

function Alert({ kind, children }: { kind: "erro" | "ok"; children: React.ReactNode }) {
  const cls =
    kind === "erro"
      ? "border-vermelho/40 bg-vermelho/5 text-vermelho"
      : "border-verde/50 bg-verde/5 text-verde";
  return (
    <div className={`mb-4 rounded-[10px] border p-2.5 text-center text-xs font-medium ${cls}`}>
      {children}
    </div>
  );
}

function LoginForm({ onForgot }: { onForgot: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    setLoading(false);
    if (error) {
      setErro(
        error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : error.message
      );
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit}>
      <h1 className="font-display text-[26px] font-bold leading-[1.25] tracking-tight">
        <span className="text-violeta">Entre</span> e veja onde
        <br />
        está o dinheiro público.
      </h1>
      <p className="mb-7 mt-1.5 text-sm text-cinza">
        Acesse o Raio-X dos órgãos e sua operação de licitações.
      </p>

      {erro && <Alert kind="erro">{erro}</Alert>}

      <Field label="Seu e-mail">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="nome@empresa.com.br"
          className={inputCls}
        />
      </Field>

      <Field label="Senha">
        <input
          type={showPass ? "text" : "password"}
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="current-password"
          placeholder="Sua senha"
          className={inputCls + " pr-12"}
        />
        <button
          type="button"
          onClick={() => setShowPass((v) => !v)}
          aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cinza"
        >
          {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </Field>

      <div className="mb-[18px] -mt-1.5 flex justify-end">
        <button
          type="button"
          onClick={onForgot}
          className="text-[13px] font-semibold text-violeta hover:text-roxo"
        >
          Esqueci minha senha
        </button>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[11px] bg-laranja font-display text-[15px] font-semibold text-white transition hover:bg-laranja-hover disabled:opacity-60"
      >
        {loading && <Loader2 size={18} className="animate-spin" />}
        {loading ? "Entrando…" : "Entrar"}
      </button>

      <div className="mt-3.5 rounded-[10px] border border-dashed border-borda bg-white p-2.5 text-center text-xs text-cinza">
        Acesso por convite.{" "}
        <b className="text-indigo-deep">Quer a Sentinela na sua empresa?</b> Fale com a BX4.
      </div>
    </form>
  );
}

function RecoverForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo:
        typeof window !== "undefined"
          ? `${window.location.origin}/login`
          : undefined,
    });
    setLoading(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <form onSubmit={onSubmit}>
      <h1 className="font-display text-[26px] font-bold leading-[1.25] tracking-tight">
        <span className="text-violeta">Recuperar</span>
        <br />
        sua senha.
      </h1>
      <p className="mb-7 mt-1.5 text-sm text-cinza">
        Informe seu e-mail. Enviaremos um link para você criar uma nova senha.
      </p>

      {erro && <Alert kind="erro">{erro}</Alert>}
      {sent && (
        <Alert kind="ok">
          Se o e-mail existir, o link chega em instantes. Verifique a caixa de
          entrada e o spam.
        </Alert>
      )}

      <Field label="Seu e-mail">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="nome@empresa.com.br"
          className={inputCls}
        />
      </Field>

      <button
        type="submit"
        disabled={loading}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[11px] bg-laranja font-display text-[15px] font-semibold text-white transition hover:bg-laranja-hover disabled:opacity-60"
      >
        {loading && <Loader2 size={18} className="animate-spin" />}
        {loading ? "Enviando…" : "Enviar link de recuperação"}
      </button>

      <button
        type="button"
        onClick={onBack}
        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-borda bg-white font-display text-[15px] font-semibold text-indigo-deep transition hover:border-violeta"
      >
        ← Voltar para o login
      </button>
    </form>
  );
}

function BrandPanel() {
  return (
    <div className="relative hidden flex-col justify-center overflow-hidden p-16 lg:flex bg-[radial-gradient(120%_80%_at_80%_10%,#2D2470_0%,transparent_55%),linear-gradient(160deg,#1E1B4B_0%,#211C57_60%,#16133A_100%)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(circle at 78% 32%, rgba(124,58,237,.35), transparent 40%)," +
            "radial-gradient(circle at 78% 32%, transparent 0 78px, rgba(255,255,255,.06) 79px 80px, transparent 81px)," +
            "radial-gradient(circle at 78% 32%, transparent 0 138px, rgba(255,255,255,.05) 139px 140px, transparent 141px)," +
            "radial-gradient(circle at 78% 32%, transparent 0 208px, rgba(255,255,255,.04) 209px 210px, transparent 211px)," +
            "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)",
          backgroundSize: "auto,auto,auto,auto,38px 38px,38px 38px",
        }}
      />
      <div className="relative z-10 max-w-[440px]">
        <BrandMark size={64} variant="outline" className="mb-7" />
        <h2 className="mb-4 font-display text-[34px] font-extrabold leading-[1.18] tracking-tight text-white">
          O radar que vê o dinheiro <span className="text-laranja">antes</span> do
          edital existir.
        </h2>
        <p className="text-[15px] leading-relaxed text-[#C7C3E8]">
          Qual órgão vai comprar a sua categoria, qual secretaria executa, de onde
          veio a emenda e quem é o padrinho — meses antes de qualquer concorrente
          saber.
        </p>
        <div className="mt-7 flex flex-wrap gap-2.5">
          {["Capacidade", "Apetite", "Acesso"].map((c) => (
            <span
              key={c}
              className="rounded-full border border-roxo/40 bg-roxo/20 px-3.5 py-[7px] font-display text-xs font-semibold text-[#EDE9FE]"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
      <span className="absolute bottom-8 left-16 z-10 text-xs font-medium text-[#8B86B8]">
        by BX4 Technology Solutions
      </span>
    </div>
  );
}
