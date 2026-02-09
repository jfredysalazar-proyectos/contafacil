import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, X } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
}

export function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string>("");
  const hasScannedRef = useRef(false); // Flag para evitar escaneos múltiples

  const startScanner = async () => {
    try {
      setError("");
      const qrCodeScanner = new Html5Qrcode("qr-reader");
      scannerRef.current = qrCodeScanner;

      await qrCodeScanner.start(
        { facingMode: "environment" }, // Cámara trasera
        {
          fps: 10, // Frames por segundo
          qrbox: { width: 250, height: 250 }, // Área de escaneo
        },
        (decodedText) => {
          // Código escaneado exitosamente
          // Evitar procesar el mismo código múltiples veces
          if (hasScannedRef.current) return;
          
          hasScannedRef.current = true;
          console.log("Código escaneado:", decodedText);
          
          // Detener escáner inmediatamente
          stopScanner();
          
          // Llamar callback después de detener
          setTimeout(() => {
            onScan(decodedText);
            setIsOpen(false);
          }, 100);
        },
        (errorMessage) => {
          // Error de escaneo (normal mientras busca código)
          // No mostramos estos errores al usuario
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error("Error al iniciar escáner:", err);
      const errorMsg = "No se pudo acceder a la cámara. Verifica los permisos.";
      setError(errorMsg);
      if (onError) onError(errorMsg);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error("Error al detener escáner:", err);
      }
    }
  };

  const handleClose = () => {
    stopScanner();
    setIsOpen(false);
    setError("");
    hasScannedRef.current = false; // Reset flag al cerrar
  };

  useEffect(() => {
    if (isOpen && !isScanning) {
      // Reset flag al abrir
      hasScannedRef.current = false;
      // Pequeño delay para que el DOM se renderice
      setTimeout(() => {
        startScanner();
      }, 100);
    }

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  return (
    <>
      {/* Botón para abrir el escáner */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="flex-shrink-0"
        title="Escanear código QR o código de barras"
      >
        <Camera className="h-5 w-5" />
      </Button>

      {/* Dialog con el escáner */}
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Escanear Código</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="text-sm text-gray-600 text-center">
              Apunta la cámara al código QR o código de barras del producto
            </div>

            {/* Contenedor del escáner */}
            <div className="relative">
              <div
                id="qr-reader"
                className="w-full rounded-lg overflow-hidden border-2 border-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleClose}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
