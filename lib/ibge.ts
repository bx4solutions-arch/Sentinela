// Resolve municípios pelo IBGE (código IBGE = chave da célula de coleta).

export type Municipio = { codigo_ibge: string; nome: string };

/** Lista municípios de uma UF (ordenados por nome). */
export async function municipiosDaUf(uf: string): Promise<Municipio[]> {
  try {
    const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`, { cache: "force-cache" });
    if (!r.ok) return [];
    const data = (await r.json()) as { id: number; nome: string }[];
    return data.map((m) => ({ codigo_ibge: String(m.id), nome: m.nome })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  } catch {
    return [];
  }
}

/** Resolve o código IBGE de um município pelo nome (case/acento-insensível). */
export async function resolveMunicipio(uf: string, nome: string): Promise<Municipio | null> {
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const alvo = norm(nome);
  const lista = await municipiosDaUf(uf);
  return lista.find((m) => norm(m.nome) === alvo) ?? null;
}
