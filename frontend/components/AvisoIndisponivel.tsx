import { AlertTriangle } from "lucide-react";

export function AvisoIndisponivel({ mensagem }: { mensagem?: string }) {
  return (
    <div className="no-print flex items-start gap-3 rounded-md border border-ms-amber/40 bg-[#fbf1de] px-4 py-3 text-sm text-[#8f5f0d]">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        {mensagem ?? "Não foi possível conectar à API agora. Os dados abaixo podem estar incompletos ou desatualizados."}
      </p>
    </div>
  );
}
