// SERVICE WORKER REMOVIDO — versão "autodestrutiva".
//
// O SW anterior (cache do shell) causava navegação morta: servia chunks/HTML de builds
// antigos e, no fallback, devolvia o HTML do /radar para QUALQUER request que falhasse —
// quebrando a hidratação do React (sidebar inerte; "só o Radar funciona").
//
// Este arquivo NÃO cacheia nada. Ele existe só para CURAR navegadores que já instalaram o
// SW antigo: ao detectar a atualização (acontece sozinho na próxima navegação), ele apaga
// todos os caches, se desregistra e recarrega as abas — devolvendo o app ao comportamento
// normal (rede direta). Depois disso, nenhum SW fica instalado.
self.addEventListener("install", () => {
  // assume o controle imediatamente, sem esperar abas antigas fecharem
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 1) apaga TODOS os caches (inclui o "sentinela-shell-v1" com chunks de builds velhos)
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      // 2) remove este próprio service worker do navegador
      await self.registration.unregister();
      // 3) recarrega as abas abertas para rodarem já sem nenhum SW
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        client.navigate(client.url).catch(() => {});
      }
    })()
  );
});

// Sem handler de "fetch": o navegador vai direto à rede (comportamento padrão, sem porteiro).
