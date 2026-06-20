# PROMPT PARA O TERMINAL (Claude Code / Ruflo) — Higiene de repositório: tirar dado do git

## Contexto
O harvester de hoje gerou ~110 MB de dado em `worker/harvester/pncp_data/`
(`editais.jsonl` 101 MB / 49.489 editais, `pca.jsonl` 9 MB / 16.403 PCA,
`_orgaos.json` 310 órgãos, mais `_cruzamento_resumo.json`, `_checkpoint.json`, etc.).
**Nada disso está no `.gitignore`.** Isso é DADO, não código — o lugar dele é o Supabase.
Se entrar num commit, incha a história do git para sempre e cresce a cada célula nova.

Também está poluindo a memória do codebase (`_orgaos.json`, sendo JSON válido único,
foi parseado nó-por-nó pelo indexador e virou ~1.300 nós "Variável").

## Régua de execução
Plan mode → mudança isolada → STOP para aprovação → commit. Sem heredoc. Nunca commitar segredo.

## Tarefa (só leitura + 1 arquivo de config; não toca em dado nem em código)

1. **Verifique se algo do `pncp_data/` já foi rastreado pelo git:**
   ```
   git ls-files worker/harvester/pncp_data/
   git status --porcelain worker/harvester/pncp_data/ | head
   ```

2. **Adicione ao `.gitignore` da raiz** (crie a seção se não existir):
   ```
   # Dados do harvester (vão para o Supabase, nunca para o git)
   worker/harvester/pncp_data/
   *.jsonl
   ```
   > Obs: se algum `.jsonl` legítimo precisar ser versionado no futuro, troque a 2ª linha
   > por algo mais específico. Por ora, nenhum `.jsonl` deve ir para o git.

3. **Se o passo 1 mostrou arquivos já rastreados**, remova-os do índice SEM apagar do disco:
   ```
   git rm -r --cached worker/harvester/pncp_data/
   ```
   (os arquivos continuam no disco para o harvester/cruzamento usarem; só saem do git.)

4. **Confirme que ficou limpo:**
   ```
   git check-ignore worker/harvester/pncp_data/editais.jsonl   # deve listar o caminho (ignorado)
   git status --short                                          # pncp_data não deve mais aparecer
   ```

5. **STOP. Mostre o diff do `.gitignore` e o resultado dos check-ignore para aprovação ANTES de commitar.**

## Critério de pronto
- `git check-ignore` confirma que `editais.jsonl`, `pca.jsonl` e `_orgaos.json` estão ignorados.
- `git status` não lista mais nada de `pncp_data/`.
- Nenhum byte de dado foi deletado do disco.
- (Opcional, próxima rodada) excluir `worker/harvester/pncp_data/` também do indexador de memória do codebase.
