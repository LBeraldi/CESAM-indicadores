import { RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** CP-05.2: diz o que falhou e oferece nova tentativa. */
export function ErrorState({ titulo, descricao, onTentarNovamente }: { titulo: string; descricao?: string; onTentarNovamente?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center" role="alert">
      <XCircle className="h-6 w-6 text-sem-negative" strokeWidth={1.75} aria-hidden="true" />
      <p className="font-semibold text-ms-ink">{titulo}</p>
      {descricao ? <p className="max-w-md text-sm text-ms-muted">{descricao}</p> : null}
      {onTentarNovamente ? (
        <Button variante="secondary" className="mt-2" onClick={onTentarNovamente}>
          <RotateCcw className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}
