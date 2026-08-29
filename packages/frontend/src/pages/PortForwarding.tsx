import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { api, ApiRequestError } from '@/lib/api-client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { FeatureGate } from '@/components/layout/FeatureGate';
import { PageHeader, Surface } from '@/components/shared/mobile-ui';
import { useCapabilities } from '@/context/CapabilitiesContext';
import { toast } from 'sonner';

interface Rule {
  index: number;
  enable: boolean;
  name: string;
  protocol: string;
  externalPort: string;
  internalIp: string;
  internalPort: string;
}

interface RuleForm {
  name: string;
  protocol: string;
  externalPort: string;
  internalIp: string;
  internalPort: string;
}

export function PortForwarding() {
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm<RuleForm>();
  const { canWrite } = useCapabilities();
  const writable = canWrite('nat');

  const load = () => {
    setError(null);
    api
      .portForwarding.list()
      .then((res) => setRules(res.rules as Rule[]))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : 'Failed to load port forwarding rules'));
  };

  useEffect(load, []);

  const onAdd = async (values: RuleForm) => {
    try {
      await api.portForwarding.add({ ...values, enable: true });
      toast.success('Rule added');
      setDialogOpen(false);
      reset();
      load();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Failed to add rule');
    }
  };

  const onDelete = async (index: number) => {
    try {
      await api.portForwarding.remove(index);
      toast.success('Rule removed');
      load();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Failed to remove rule');
    }
  };

  return (
    <FeatureGate oid="nat">
      <div>
        <PageHeader
          eyebrow="Network"
          title="Port forwarding"
          description="Rules that let a device outside your network reach a specific device inside it."
          action={
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="icon" aria-label="Add rule" disabled={!writable}>
                  <Plus aria-hidden="true" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add port forwarding rule</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onAdd)} className="space-y-3">
                  <Field label="Name" {...register('name', { required: true })} />
                  <Field label="Protocol (TCP / UDP / TCP/UDP)" {...register('protocol', { required: true })} />
                  <Field label="External port" {...register('externalPort', { required: true })} />
                  <Field label="Internal IP" {...register('internalIp', { required: true })} />
                  <Field label="Internal port" {...register('internalPort', { required: true })} />
                  <DialogFooter>
                    <Button type="submit" className="w-full">Add</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          }
        />

        <div className="space-y-4">
          {!writable && <p className="text-xs text-muted-foreground">Adding rules is disabled until this router model and firmware are verified. See Settings › About & compatibility.</p>}
          {error && <ErrorState message={error} />}
          {!rules && !error && <LoadingState rows={3} />}

          {rules && rules.length === 0 && (
            <p className="text-sm text-muted-foreground">No port forwarding rules configured.</p>
          )}

          {rules && rules.length > 0 && (
            <Surface className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Protocol</TableHead>
                    <TableHead>External</TableHead>
                    <TableHead>Internal</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((r) => (
                    <TableRow key={r.index}>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>{r.protocol}</TableCell>
                      <TableCell>{r.externalPort}</TableCell>
                      <TableCell>
                        {r.internalIp}:{r.internalPort}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" aria-label={`Remove ${r.name}`} disabled={!writable} onClick={() => onDelete(r.index)}>
                          <Trash2 aria-hidden="true" className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Surface>
          )}
        </div>
      </div>
    </FeatureGate>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input {...props} />
    </div>
  );
}
