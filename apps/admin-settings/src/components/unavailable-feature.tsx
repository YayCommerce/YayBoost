import { ArrowUpRightIcon, FolderLockIcon } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

import { Button } from './ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from './ui/empty';

export default function UnavailableFeature() {
  const navigate = useNavigate();
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderLockIcon />
        </EmptyMedia>
        <EmptyTitle>Feature is not available</EmptyTitle>
        <EmptyDescription>
          Due to some reasons, this feature is not available for you.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate({ to: '/features' })}>
            Back to features
          </Button>
        </div>
      </EmptyContent>
      <Button variant="link" asChild className="text-muted-foreground" size="sm">
        <a href="#">
          Learn More <ArrowUpRightIcon />
        </a>
      </Button>
    </Empty>
  );
}
