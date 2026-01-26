import { ArrowLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export default function FeatureLayoutHeader({
  title,
  description,
  goBackRoute,
  actions,
}: {
  title: string;
  description?: string;
  goBackRoute?: string;
  actions?: React.ReactNode[];
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link
          to={goBackRoute ?? '/features'}
          className="bg-white flex h-8 w-8 items-center justify-center rounded-md border"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description && <p className="text-muted-foreground text-sm" dangerouslySetInnerHTML={{ __html: description }} />}
        </div>
      </div>
      {actions && actions.length > 0 && (
        <div className="flex items-center gap-3">{actions?.map((action) => action)}</div>
      )}
    </div>
  );
}
