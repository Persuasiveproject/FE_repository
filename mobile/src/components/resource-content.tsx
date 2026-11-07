import type { ReactNode } from 'react';
import { ResourceState } from '@/components/resource-state';
import type { ScreenResource } from '@/hooks/use-focus-resource';

export function ResourceContent<T>({ resource, reload, children }: { resource: ScreenResource<T>; reload: () => void; children: (data: T) => ReactNode }) {
  if (resource.status === 'loading') return <ResourceState kind="loading" />;
  if (resource.status === 'error') return <ResourceState kind="error" message={resource.error.message} onRetry={reload} />;
  return <>{children(resource.data)}</>;
}
