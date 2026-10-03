import { useEffect, useState } from "react";
import { Download, Share, WifiOff, X } from "lucide-react";
import { registerAppServiceWorker } from "@/lib/pwa";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function PwaControls() {
  const [online, setOnline] = useState(true);
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    registerAppServiceWorker();
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    const bip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("beforeinstallprompt", bip);

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setShowIos(ios && !standalone);
    setDismissed(standalone || localStorage.getItem("gv-install-dismissed") === "1");

    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("beforeinstallprompt", bip);
    };
  }, []);

  function dismiss() {
    localStorage.setItem("gv-install-dismissed", "1");
    setDismissed(true);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  const showBanner = !dismissed && (deferred || showIos);

  return (
    <>
      {!online && (
        <div role="status" className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground">
          <WifiOff className="h-4 w-4" /> Sem ligação à Internet — alguns dados podem não estar atualizados.
        </div>
      )}
      {showBanner && (
        <div className="fixed inset-x-3 bottom-24 z-40 rounded-xl border bg-card p-4 text-card-foreground shadow-lg md:bottom-6 md:left-auto md:right-6 md:max-w-sm">
          <button onClick={dismiss} aria-label="Fechar" className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
          <p className="pr-6 font-semibold">Instalar a Gota Viva</p>
          {deferred ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">Adicione a app ao ecrã inicial para acesso rápido.</p>
              <button onClick={install} className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
                <Download className="h-4 w-4" /> Instalar app
              </button>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              No iPhone: toque em <Share className="inline h-4 w-4" /> <b>Partilhar</b> no Safari e depois em <b>“Adicionar ao ecrã principal”</b>.
            </p>
          )}
        </div>
      )}
    </>
  );
}
