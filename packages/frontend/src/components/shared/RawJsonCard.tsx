import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Used for feature areas whose write shape isn't confirmed live yet (see docs/api-notes.md) —
// shows the real data rather than pretending we have a polished form for something unverified.
export function RawJsonCard({ title, data }: { title: string; data: unknown }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">
          {JSON.stringify(data, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}
