/** Segmentos do sistema — mesmas chaves usadas no harvester (raw_editais.segmentos),
 *  para que o recorte da empresa case com os editais. */
export const SEGMENTOS: { key: string; label: string }[] = [
  { key: "controle-de-pragas", label: "Controle de pragas" },
  { key: "material-hospitalar", label: "Material hospitalar" },
  { key: "material-de-expediente", label: "Material de expediente" },
  { key: "generico", label: "Genérico / outros" },
];

export const SEG_LABEL: Record<string, string> = Object.fromEntries(
  SEGMENTOS.map((s) => [s.key, s.label])
);

// Prefixo CNAE (4 primeiros dígitos = grupo) → segmento do sistema.
const CNAE_PREFIX_SEG: Record<string, string> = {
  // Controle de pragas / dedetização
  "8122": "controle-de-pragas",
  // Material hospitalar (fabricação/comércio de instrumentos e materiais médico-hospitalares, farmácia)
  "3250": "material-hospitalar",
  "4645": "material-hospitalar",
  "4664": "material-hospitalar",
  "4771": "material-hospitalar",
  "4772": "material-hospitalar",
  "2110": "material-hospitalar",
  // Material de expediente / papelaria / escritório
  "4647": "material-de-expediente",
  "4761": "material-de-expediente",
  "1721": "material-de-expediente",
  "1731": "material-de-expediente",
  "1813": "material-de-expediente",
};

/** Formata um código CNAE de 7 dígitos (ex.: "8122200" → "8122-2/00"). */
export function formatCnae(code: string | number | null | undefined): string {
  const d = String(code ?? "").replace(/\D/g, "");
  if (d.length !== 7) return String(code ?? "");
  return `${d.slice(0, 4)}-${d.slice(4, 5)}/${d.slice(5)}`;
}

/** Mapeia uma lista de códigos CNAE (com ou sem formatação) para os segmentos do sistema. */
export function mapCnaeToSegmentos(cnaes: (string | number | null | undefined)[]): string[] {
  const found = new Set<string>();
  for (const raw of cnaes) {
    if (raw == null) continue;
    const digits = String(raw).replace(/\D/g, "");
    if (digits.length < 4) continue;
    const seg = CNAE_PREFIX_SEG[digits.slice(0, 4)];
    if (seg) found.add(seg);
  }
  return found.size ? [...found] : ["generico"];
}
