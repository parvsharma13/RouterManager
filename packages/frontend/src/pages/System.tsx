import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, ApiRequestError } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RawJsonCard } from '@/components/shared/RawJsonCard';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageHeader } from '@/components/shared/mobile-ui';
import { useCapabilities } from '@/context/CapabilitiesContext';
import { toast } from 'sonner';

interface PasswordForm {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function System() {
  const [data, setData] = useState<{ account: unknown; remoteManagement: unknown } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, reset, getValues } = useForm<PasswordForm>();
  const { canWrite } = useCapabilities();
  const writable = canWrite('user_account');

  useEffect(() => {
    api
      .system.get()
      .then(setData)
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : 'Failed to load system info'));
  }, []);

  const submitPasswordChange = async () => {
    const values = getValues();
    if (values.newPassword !== values.confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }
    try {
      await api.system.changePassword(values.oldPassword, values.newPassword);
      toast.success('Admin password changed. Update it in this app\'s credential setup too (npm run setup:credentials).');
      reset();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Failed to change password');
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Router" title="Administrator" description="Account details and router-level actions." />
      <div className="space-y-4">
        {error && <ErrorState message={error} />}
        {!data && !error && <LoadingState rows={3} />}

        {data && (
          <>
            <RawJsonCard title="Admin account" data={data.account} />
            <RawJsonCard title="Remote management (read-only, ISP managed)" data={data.remoteManagement} />

            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle>Change admin password</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Current password</Label>
                    <Input type="password" autoComplete="current-password" disabled={!writable} {...register('oldPassword', { required: true })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>New password</Label>
                    <Input type="password" autoComplete="new-password" disabled={!writable} {...register('newPassword', { required: true, minLength: 8 })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Confirm new password</Label>
                    <Input type="password" autoComplete="new-password" disabled={!writable} {...register('confirmPassword', { required: true })} />
                  </div>
                  {!writable && <p className="text-xs text-muted-foreground">Not yet available. Password changes aren't confirmed to work on this router's firmware yet.</p>}
                  <ConfirmDialog
                    trigger={
                      <Button type="button" variant="destructive" disabled={!writable} className="w-full">
                        Change password
                      </Button>
                    }
                    title="Change the router admin password?"
                    description="Make sure you've saved the new password somewhere; if this fails partway, you could lose access to both the router GUI and this app until you reset the router. Also remember to run `npm run setup:credentials` afterward so this app's stored credential stays in sync."
                    confirmLabel="Yes, change it"
                    destructive
                    onConfirm={handleSubmit(submitPasswordChange)}
                  />
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
