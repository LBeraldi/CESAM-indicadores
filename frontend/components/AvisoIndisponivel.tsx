import { Alert } from "@/components/ui/Alert";

export function AvisoIndisponivel({ mensagem }: { mensagem?: string }) {
  return (
    <Alert variante="warning" className="no-print">
      {mensagem ?? "Não foi possível conectar à API agora. Os dados abaixo podem estar incompletos ou desatualizados."}
    </Alert>
  );
}
