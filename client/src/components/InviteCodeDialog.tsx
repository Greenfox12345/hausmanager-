import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface InviteCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inviteCode: string;
  householdName: string;
}

export function InviteCodeDialog({ open, onOpenChange, inviteCode, householdName }: InviteCodeDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      toast.success("Einladungscode kopiert!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Fehler beim Kopieren");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Haushalt erfolgreich erstellt!</DialogTitle>
          <DialogDescription>
            Teilen Sie diesen Einladungscode mit anderen Personen, damit sie Ihrem Haushalt "{householdName}" beitreten können.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Input
              value={inviteCode}
              readOnly
              className="font-mono text-lg text-center"
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>💡 <strong>Hinweis:</strong> Neue Mitglieder können sich mit diesem Code registrieren und Ihrem Haushalt beitreten.</p>
          </div>

          <Button
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Verstanden
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
