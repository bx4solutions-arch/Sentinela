import { Cpu } from "lucide-react";

type Funcao = {
  nome: string;
  cor: string;
  chamadas: number;
  entrada: number;
  saida: number;
};

const funcoes: Funcao[] = [
  { nome: "organ-score", cor: "#FF6600", chamadas: 5, entrada: 12593, saida: 6230 },
  { nome: "converse-com-radar", cor: "#5B21B6", chamadas: 4, entrada: 14262, saida: 1228 },
  { nome: "Informações Adicionais", cor: "#16A34A", chamadas: 2, entrada: 72788, saida: 381 },
  { nome: "converse-com-radar-resultados", cor: "#1E1B4B", chamadas: 4, entrada: 180610, saida: 4811 },
];

const totChamadas = funcoes.reduce((s, f) => s + f.chamadas, 0);
const totEntrada = funcoes.reduce((s, f) => s + f.entrada, 0);
const totSaida = funcoes.reduce((s, f) => s + f.saida, 0);
const totUsado = totEntrada + totSaida;

const k = (n: number) => Math.round(n / 1000) + "K";
const br = (n: number) => n.toLocaleString("pt-BR");

export default function UsoIAPage() {
  return (
    <>
      <h1 className="flex items-center gap-2 font-display text-[22px] font-bold text-indigo-deep">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#FFE9D6] text-laranja">
          <Cpu size={17} />
        </span>
        Uso de IA <span className="text-[15px] font-medium text-cinza">(mês atual)</span>
      </h1>

      {/* chamadas por função */}
      <div className="mt-5 rounded-2xl border border-borda bg-white p-6">
        <h3 className="mb-4 font-display text-[15px] font-semibold text-indigo-deep">Chamadas por função</h3>
        <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
          {/* gráfico */}
          <div>
            <Grafico />
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
              {funcoes.map((f) => (
                <span key={f.nome} className="flex items-center gap-1.5 text-[12px] text-cinza">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: f.cor }} />
                  {f.nome}
                </span>
              ))}
            </div>
          </div>

          {/* resumo */}
          <div className="flex flex-col justify-center gap-4 border-t border-borda pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div className="text-right">
              <div className="text-[12px] text-cinza">
                Usado: <b className="font-display text-[15px] font-bold text-indigo-deep">{k(totUsado)}</b>
              </div>
              <div className="text-[12px] text-cinza">Plano Premium</div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center lg:grid-cols-1 lg:gap-3 lg:text-right">
              <Mini label="Chamadas" valor={String(totChamadas)} />
              <Mini label="Entrada" valor={k(totEntrada)} />
              <Mini label="Saída" valor={k(totSaida)} />
            </div>
          </div>
        </div>
      </div>

      {/* detalhamento */}
      <div className="mt-5 rounded-2xl border border-borda bg-white p-6">
        <h3 className="mb-4 font-display text-[15px] font-semibold text-indigo-deep">Detalhamento por função</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-borda text-left font-display text-[12px] font-semibold text-cinza">
                <th className="pb-2.5">Função</th>
                <th className="pb-2.5 text-right">Chamadas</th>
                <th className="pb-2.5 text-right">Tokens entrada</th>
                <th className="pb-2.5 text-right">Tokens saída</th>
              </tr>
            </thead>
            <tbody>
              {funcoes.map((f) => (
                <tr key={f.nome} className="border-b border-borda last:border-b-0">
                  <td className="py-3">
                    <span className="flex items-center gap-2 font-medium text-indigo-deep">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: f.cor }} />
                      {f.nome}
                    </span>
                  </td>
                  <td className="py-3 text-right text-ink">{f.chamadas}</td>
                  <td className="py-3 text-right text-ink">{br(f.entrada)}</td>
                  <td className="py-3 text-right text-ink">{br(f.saida)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-display font-semibold text-indigo-deep">
                <td className="pt-3">Total</td>
                <td className="pt-3 text-right">{totChamadas}</td>
                <td className="pt-3 text-right">{br(totEntrada)}</td>
                <td className="pt-3 text-right">{br(totSaida)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p className="mt-4 text-[12px] text-cinza">
        Dados de exemplo. O consumo real é contabilizado por chamada quando o Converse com Radar e os resumos por IA
        forem ligados — cada modo (Rápido/Detalhado/Profundo) pesa diferente no total.
      </p>
    </>
  );
}

function Mini({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <div className="text-[11px] text-cinza">{label}</div>
      <div className="font-display text-[18px] font-bold text-indigo-deep">{valor}</div>
    </div>
  );
}

function Grafico() {
  const W = 620;
  const H = 200;
  const x0 = 50;
  const x1 = 600;
  const yTop = 20;
  const yBottom = 160;
  const yMax = 8;
  const yFor = (v: number) => yBottom - (v / yMax) * (yBottom - yTop);
  const grid = [0, 2, 4, 6, 8];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 220 }} role="img" aria-label="Chamadas por função ao longo do tempo">
      {grid.map((g) => (
        <g key={g}>
          <line x1={x0} y1={yFor(g)} x2={x1} y2={yFor(g)} stroke="#E7ECF3" strokeWidth="1" strokeDasharray="3 4" />
          <text x={x0 - 8} y={yFor(g) + 4} textAnchor="end" fontSize="11" fill="#94A3B8">
            {g}
          </text>
        </g>
      ))}
      {funcoes.map((f) => (
        <polyline
          key={f.nome}
          points={`${x0},${yFor(f.chamadas)} ${x1},${yFor(f.chamadas)}`}
          fill="none"
          stroke={f.cor}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      ))}
      <text x={x0} y={yBottom + 16} fontSize="11" fill="#94A3B8">
        06-29
      </text>
      <text x={x1} y={yBottom + 16} textAnchor="end" fontSize="11" fill="#94A3B8">
        06-30
      </text>
    </svg>
  );
}
