import { ShieldCheck } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { authenticate } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; msg?: string }>;
}) {
  const { error, msg } = await searchParams;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Painel de marca (navy) */}
      <div className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <ShieldCheck className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="font-semibold">Sentinela</p>
            <p className="text-[10px] text-sidebar-foreground/60">Inteligência de Licitações</p>
          </div>
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl font-bold leading-snug">
            Enquanto o mercado avisa quando o edital sai, o Sentinela mostra meses antes.
          </h2>
          <p className="mt-3 text-sm text-sidebar-foreground/70">
            Por que vai sair, quem ganhou as últimas vezes e se você tem chance.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">© 2026 Sentinela</p>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 lg:hidden">
            <div className="mb-2 grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" />
            </div>
            <p className="font-semibold">Sentinela</p>
          </div>

          <h1 className="text-xl font-bold">Entrar na sua conta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use e-mail e senha. Sem conta? Crie uma agora.
          </p>

          {error && (
            <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {msg && (
            <p className="mt-4 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
              {msg}
            </p>
          )}

          <form action={authenticate} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" placeholder="voce@empresa.com.br" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" name="password" type="password" required minLength={6} autoComplete="current-password" placeholder="mínimo 6 caracteres" />
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <Button type="submit" name="intent" value="signin" className="w-full">Entrar</Button>
              <Button type="submit" name="intent" value="signup" variant="outline" className="w-full">Criar conta</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
