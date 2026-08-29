import { useEffect, useState } from 'react';
import { QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { buildWifiQrPayload, generateWifiQrDataUrl } from '@/lib/wifi-qr';

interface WifiQrDialogProps {
  ssid: string;
  psk: string;
  securityMode: string;
  hidden: boolean;
}

// Renders a WiFi QR code entirely client-side (the `qrcode` package, no network call) so a
// guest can scan-to-join without anyone reading the password aloud — eero's most-used
// sharing feature, and here it costs nothing extra since the SSID/PSK are already in hand.
export function WifiQrDialog({ ssid, psk, securityMode, hidden }: WifiQrDialogProps) {
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDataUrl(null);
    generateWifiQrDataUrl(buildWifiQrPayload({ ssid, psk, securityMode, hidden })).then(setDataUrl);
  }, [open, ssid, psk, securityMode, hidden]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <QrCode className="mr-2 h-4 w-4" />
          Share via QR
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Scan to join "{ssid}"</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-2">
          {dataUrl ? (
            <img src={dataUrl} alt={`WiFi QR code for ${ssid}`} className="h-60 w-60 rounded-md border" />
          ) : (
            <div className="h-60 w-60 animate-pulse rounded-md border bg-muted" />
          )}
          <p className="text-center text-sm text-muted-foreground">
            Generated on this device — the password isn't sent anywhere.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
