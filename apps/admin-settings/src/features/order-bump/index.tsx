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
import { InputNumber } from '@/components/ui/input-number';
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
  bump_offers: z.array(
    z.object({
      name: z.string(),
      status: z.enum(['active', 'inactive']),
      product_id: z.string(),
      pricing_type: z.enum(['no_discount', 'percent', 'fixed_amount', 'fixed_price', 'free']),
      pricing_value: z.number().min(0),
      show_when: z.enum(['always', 'match_conditions']),
      conditions: z.array(z.object({ has: z.string(), type: z.string(), value: z.string() })),
      position: z.enum(['after_order_summary', 'before_payment_methods', 'before_place_order']),
      style: z.enum(['simple_checkbox', 'card_with_image', 'highlighted_box']),
      headline: z.string(),
      description: z.string(),
      checkbox_label: z.string(),
      behavior: z.enum(['hide', 'show']),
    }),
  ),
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

  const onSubmit = (data: SettingsFormData) => {
    updateSettings.mutate(
      { id: featureId, settings: data },
      {
        onSuccess: (updatedFeature) => {
          form.reset(updatedFeature.settings as SettingsFormData);
        },
      },
    );
  };

  const bumps = entitiesData?.items ?? [];

  const handleReorder = (index: number, direction: 'up' | 'down') => {
    const from = direction === 'up' ? index - 1 : index;
    const to = direction === 'up' ? index : index + 1;
    if (from < 0 || to >= bumps.length) return;
    const reordered = [...bumps];
    const [removed] = reordered.splice(from, 1);
    reordered.splice(to, 0, removed);
    const order: Record<number, number> = {};
    reordered.forEach((e, i) => {
      order[e.id] = (i + 1) * 10;
    });
    reorderMutation.mutate({ order, entityType: BUMP_ENTITY_TYPE });
  };

  const handleStatusChange = (entityId: number, checked: boolean) => {
    updateEntity.mutate({
      entityId,
      entity: { status: checked ? 'active' : 'inactive' },
      entityType: BUMP_ENTITY_TYPE,
    });
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
        onReset={() => {
          form.reset(feature?.settings as SettingsFormData);
        }}
        isSaving={updateSettings.isPending}
        isDirty={form.formState.isDirty}
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
                    {__('No order bumps yet. Add one to get started.', 'yayboost')}
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
                            disabled={index === 0 || reorderMutation.isPending}
                            className="text-muted-foreground hover:text-foreground -mb-0.5 text-xs disabled:opacity-40"
                            aria-label={__('Move up', 'yayboost')}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReorder(index, 'down')}
                            disabled={index === bumps.length - 1 || reorderMutation.isPending}
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
                        disabled={updateEntity.isPending}
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
