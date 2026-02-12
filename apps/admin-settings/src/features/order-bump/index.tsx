import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import { GripVertical, Info, Plus } from 'lucide-react';
import z from 'zod';

import type { Entity } from '@/lib/api';
import { useEntities, useReorderEntities, useUpdateEntity } from '@/hooks/use-entities';
import { useFeature, useUpdateFeatureSettings } from '@/hooks/use-features';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage, useForm } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import FeatureLayoutHeader from '@/components/feature-layout-header';
import { SettingsCard } from '@/components/settings-card';
import UnavailableFeature from '@/components/unavailable-feature';

import { FeatureComponentProps } from '..';

const BUMP_ENTITY_TYPE = 'bump';
const currencySymbol = window.yayboostData?.currencySymbol ?? '$';

// Bump entity settings may contain product_name, price, etc.
interface BumpSettings extends Record<string, unknown> {
  product_name?: string;
  price?: number;
  price_display?: string;
}

function getBumpProductName(entity: Entity): string {
  const s = entity.settings as BumpSettings | undefined;
  return s?.product_name ?? (s?.product_id as string) ?? '—';
}

function getBumpPrice(entity: Entity): string {
  const s = entity.settings as BumpSettings | undefined;
  // Prefer numeric price + frontend currency symbol so symbol always renders correctly (no HTML entities)
  if (typeof s?.price === 'number') return `${currencySymbol}${s.price.toFixed(2)}`;
  if (s?.price_display) return String(s.price_display);
  return '—';
}

// Settings schema
const settingsSchema = z.object({
  enabled: z.boolean(),
  max_bump_display: z.number().optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function OrderBumpFeature({ featureId }: FeatureComponentProps) {
  const { data: feature, isLoading, isFetching } = useFeature(featureId);
  const updateSettings = useUpdateFeatureSettings();
  const { data: entitiesData, isLoading: entitiesLoading } = useEntities({
    featureId,
    entityType: BUMP_ENTITY_TYPE,
  });
  const reorderMutation = useReorderEntities(featureId);
  const updateEntity = useUpdateEntity(featureId);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: feature?.settings as SettingsFormData,
  });

  const serverBumps = entitiesData?.items ?? [];
  const [localBumps, setLocalBumps] = useState<Entity[]>([]);
  const [isSavingAll, setIsSavingAll] = useState(false);

  useEffect(() => {
    if (serverBumps.length > 0) {
      setLocalBumps([...serverBumps]);
    }
  }, [entitiesData?.items]);

  const bumpsDirty = useMemo(() => {
    if (localBumps.length === 0) return false;
    if (localBumps.length !== serverBumps.length) return true;
    const serverById = Object.fromEntries(serverBumps.map((e) => [e.id, e]));
    const orderChanged = localBumps.some((b, i) => serverBumps[i]?.id !== b.id);
    const statusChanged = localBumps.some(
      (b) => serverById[b.id] && serverById[b.id].status !== b.status,
    );
    return orderChanged || statusChanged;
  }, [localBumps, serverBumps]);

  const bumps = localBumps.length > 0 ? localBumps : serverBumps;

  const handleReorder = (index: number, direction: 'up' | 'down') => {
    const from = direction === 'up' ? index - 1 : index;
    const to = direction === 'up' ? index : index + 1;
    if (from < 0 || to >= bumps.length) return;
    const reordered = [...bumps];
    const [removed] = reordered.splice(from, 1);
    reordered.splice(to, 0, removed);
    setLocalBumps(reordered);
  };

  const handleStatusChange = (entityId: number, checked: boolean) => {
    const next = bumps.map((e) =>
      e.id === entityId
        ? { ...e, status: (checked ? 'active' : 'inactive') as Entity['status'] }
        : e,
    );
    setLocalBumps(next);
  };

  const onSubmit = async (data: SettingsFormData) => {
    setIsSavingAll(true);
    try {
      if (bumpsDirty) {
        const serverItems = entitiesData?.items ?? [];
        const orderChanged =
          bumps.length !== serverItems.length || bumps.some((b, i) => serverItems[i]?.id !== b.id);
        if (orderChanged) {
          const order: Record<number, number> = {};
          bumps.forEach((e, i) => {
            order[e.id] = (i + 1) * 10;
          });
          await reorderMutation.mutateAsync({ order, entityType: BUMP_ENTITY_TYPE });
        }
        const serverById = Object.fromEntries(serverItems.map((e) => [e.id, e]));
        const statusUpdates = bumps.filter(
          (b) => serverById[b.id] && serverById[b.id].status !== b.status,
        );
        await Promise.all(
          statusUpdates.map((b) =>
            updateEntity.mutateAsync({
              entityId: b.id,
              entity: { status: b.status },
              entityType: BUMP_ENTITY_TYPE,
            }),
          ),
        );
      }
      const updatedFeature = await updateSettings.mutateAsync({
        id: featureId,
        settings: data,
      });
      form.reset(updatedFeature.settings as SettingsFormData);
      setLocalBumps(bumps);
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleReset = () => {
    form.reset(feature?.settings as SettingsFormData);
    setLocalBumps([...serverBumps]);
  };

  if (isLoading || isFetching) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!feature?.settings) {
    return <UnavailableFeature />;
  }

  return (
    <Form {...form}>
      <FeatureLayoutHeader
        title={feature.name}
        description={feature.description}
        goBackRoute="/features"
        actions={[
          <Link key="add" to="/features/$featureId/new" params={{ featureId }}>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              {__('Add New', 'yayboost')}
            </Button>
          </Link>,
        ]}
      />
      <SettingsCard
        headless
        onSave={() => {
          form.handleSubmit(onSubmit)();
        }}
        onReset={handleReset}
        isSaving={updateSettings.isPending || isSavingAll}
        isDirty={form.formState.isDirty || bumpsDirty}
        isLoading={isLoading || isFetching}
      >
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{__('Global settings', 'yayboost')}</h3>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Label className="text-sm">{__('Maximum bumps to display:', 'yayboost')}</Label>
          <FormField
            control={form.control}
            name="max_bump_display"
            render={({ field }) => (
              <FormItem className="m-0 w-24">
                <FormControl>
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{__('Your order bumps', 'yayboost')}</h3>
        </div>

        <div className="space-y-1">
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Info className="h-3.5 w-3.5 shrink-0" />
            {__('Drag to set priority. First matching bumps shown.', 'yayboost')}
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10" />
                <TableHead className="font-semibold">#</TableHead>
                <TableHead className="font-semibold">{__('Name', 'yayboost')}</TableHead>
                <TableHead className="font-semibold">{__('Product', 'yayboost')}</TableHead>
                <TableHead className="font-semibold">{__('Price', 'yayboost')}</TableHead>
                <TableHead className="font-semibold">{__('Status', 'yayboost')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entitiesLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                    {__('Loading…', 'yayboost')}
                  </TableCell>
                </TableRow>
              ) : bumps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="text-muted-foreground text-sm">
                        {__('No order bumps yet. Add one to get started.', 'yayboost')}
                      </p>
                      <Link
                        to="/features/$featureId/new"
                        params={{ featureId }}
                        className="hover:text-primary font-medium underline-offset-2 hover:underline"
                      >
                        <Button size="sm">
                          <Plus className="h-4 w-4" />
                          {__('Add New', 'yayboost')}
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                bumps.map((entity, index) => (
                  <TableRow key={entity.id}>
                    <TableCell className="w-10">
                      <div className="flex items-center gap-0.5">
                        <span className="text-muted-foreground cursor-grab touch-none">
                          <GripVertical className="h-4 w-4" />
                        </span>
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => handleReorder(index, 'up')}
                            disabled={index === 0 || isSavingAll}
                            className="text-muted-foreground hover:text-foreground -mb-0.5 text-xs disabled:opacity-40"
                            aria-label={__('Move up', 'yayboost')}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReorder(index, 'down')}
                            disabled={index === bumps.length - 1 || isSavingAll}
                            className="text-muted-foreground hover:text-foreground -mt-0.5 text-xs disabled:opacity-40"
                            aria-label={__('Move down', 'yayboost')}
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <Link
                        to="/features/$featureId/$entityId"
                        params={{ featureId, entityId: String(entity.id) }}
                        className="hover:text-primary font-medium underline-offset-2 hover:underline"
                      >
                        {entity.name || '—'}
                      </Link>
                    </TableCell>
                    <TableCell>{getBumpProductName(entity)}</TableCell>
                    <TableCell>{getBumpPrice(entity)}</TableCell>
                    <TableCell>
                      <Switch
                        size="sm"
                        checked={entity.status === 'active'}
                        onCheckedChange={(checked) => handleStatusChange(entity.id, checked)}
                        disabled={isSavingAll}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {bumps.length > 0 && (
          <p className="text-muted-foreground mb-4 flex items-center gap-1.5 text-xs">
            <GripVertical className="h-4 w-4" />
            {__('Drag to reorder', 'yayboost')}
          </p>
        )}
      </SettingsCard>
    </Form>
  );
}
