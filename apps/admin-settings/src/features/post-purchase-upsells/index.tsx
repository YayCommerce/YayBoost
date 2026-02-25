import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import { GripVertical, Info, Plus } from 'lucide-react';
import z from 'zod';

import type { Entity } from '@/lib/api';
import { useEntities, useReorderEntities, useUpdateEntity } from '@/hooks/use-entities';
import { useFeature, useUpdateFeatureSettings } from '@/hooks/use-features';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormMessage, useForm } from '@/components/ui/form';
import { InputNumber } from '@/components/ui/input-number';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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

const PURCHASE_ENTITY_TYPE = 'purchase';
const currencySymbol = window.yayboostData?.currencySymbol ?? '$';

// Purchase entity settings may contain product_name, price, etc.
interface PurchaseSettings extends Record<string, unknown> {
  product_name?: string;
  price?: number;
  price_display?: string;
}

function getPurchaseProductName(entity: Entity): string {
  const s = entity.settings as PurchaseSettings | undefined;
  return s?.product_name ?? (s?.product_id as string) ?? '—';
}

function getPurchasePrice(entity: Entity): string {
  const s = entity.settings as PurchaseSettings | undefined;
  // Prefer numeric price + frontend currency symbol so symbol always renders correctly (no HTML entities)
  if (typeof s?.price === 'number') return `${currencySymbol}${s.price.toFixed(2)}`;
  if (s?.price_display) return String(s.price_display);
  return '—';
}

// Settings schema
const settingsSchema = z.object({
  enabled: z.boolean(),
  display: z.object({
    mode: z.enum(['all', 'one_time']),
    max_display: z.number().optional(),
  }),
  timing: z.object({
    show_countdown: z.boolean(),
    expires_after: z.number().optional(),
  }),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

type PendingNavigate = { to: string; params: Record<string, string> };

export default function PostPurchaseUpsellsFeature({ featureId }: FeatureComponentProps) {
  const navigate = useNavigate();
  const { data: feature, isLoading, isFetching } = useFeature(featureId);
  const updateSettings = useUpdateFeatureSettings();
  const { data: entitiesData, isLoading: entitiesLoading } = useEntities({
    featureId,
    entityType: PURCHASE_ENTITY_TYPE,
  });
  const reorderMutation = useReorderEntities(featureId);
  const updateEntity = useUpdateEntity(featureId);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: feature?.settings as SettingsFormData,
  });

  const serverPurchases = entitiesData?.items ?? [];
  const [localPurchases, setLocalPurchases] = useState<Entity[]>([]);
  const [isSavingAll, setIsSavingAll] = useState(false);

  useEffect(() => {
    if (serverPurchases.length > 0) {
      setLocalPurchases([...serverPurchases]);
    }
  }, [entitiesData?.items]);

  const purchasesDirty = useMemo(() => {
    if (localPurchases.length === 0) return false;
    if (localPurchases.length !== serverPurchases.length) return true;
    const serverById = Object.fromEntries(serverPurchases.map((e) => [e.id, e]));
    const orderChanged = localPurchases.some((b, i) => serverPurchases[i]?.id !== b.id);
    const statusChanged = localPurchases.some(
      (b) => serverById[b.id] && serverById[b.id].status !== b.status,
    );
    return orderChanged || statusChanged;
  }, [localPurchases, serverPurchases]);

  const purchases = localPurchases.length > 0 ? localPurchases : serverPurchases;

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [pendingNavigate, setPendingNavigate] = useState<PendingNavigate | null>(null);
  const [isSavingThenLeaving, setIsSavingThenLeaving] = useState(false);

  const isDirty = form.formState.isDirty || purchasesDirty;

  const handleNavigateClick = (e: React.MouseEvent, to: string, params: Record<string, string>) => {
    if (!isDirty) return;
    e.preventDefault();
    setPendingNavigate({ to, params });
  };

  const handleLeaveWithoutSaving = () => {
    if (!pendingNavigate) return;
    handleReset();
    navigate({ to: pendingNavigate.to, params: pendingNavigate.params });
    setPendingNavigate(null);
  };

  const handleSaveAndContinue = () => {
    if (!pendingNavigate) return;
    setIsSavingThenLeaving(true);
    form.handleSubmit(
      (data) =>
        onSubmit(data)
          .then(() => {
            navigate({ to: pendingNavigate.to, params: pendingNavigate.params });
            setPendingNavigate(null);
          })
          .finally(() => setIsSavingThenLeaving(false)),
      () => setIsSavingThenLeaving(false),
    )();
  };

  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragEnd = () => setDraggedIndex(null);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (toIndex: number) => {
    if (draggedIndex === null || draggedIndex === toIndex) return;
    const reordered = [...purchases];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(toIndex, 0, removed);
    setLocalPurchases(reordered);
    setDraggedIndex(null);
  };

  const handleStatusChange = (entityId: number, checked: boolean) => {
    const next = purchases.map((e) =>
      e.id === entityId
        ? { ...e, status: (checked ? 'active' : 'inactive') as Entity['status'] }
        : e,
    );
    setLocalPurchases(next);
  };

  const onSubmit = async (data: SettingsFormData) => {
    setIsSavingAll(true);
    try {
      if (purchasesDirty) {
        const serverItems = entitiesData?.items ?? [];
        const orderChanged =
          purchases.length !== serverItems.length ||
          purchases.some((b, i) => serverItems[i]?.id !== b.id);
        if (orderChanged) {
          const order: Record<number, number> = {};
          purchases.forEach((e, i) => {
            order[e.id] = (i + 1) * 10;
          });
          await reorderMutation.mutateAsync({ order, entityType: PURCHASE_ENTITY_TYPE });
        }
        const serverById = Object.fromEntries(serverItems.map((e) => [e.id, e]));
        const statusUpdates = purchases.filter(
          (b) => serverById[b.id] && serverById[b.id].status !== b.status,
        );
        await Promise.all(
          statusUpdates.map((b) =>
            updateEntity.mutateAsync({
              entityId: b.id,
              entity: { status: b.status },
              entityType: PURCHASE_ENTITY_TYPE,
            }),
          ),
        );
      }
      const updatedFeature = await updateSettings.mutateAsync({
        id: featureId,
        settings: data,
      });
      form.reset(updatedFeature.settings as SettingsFormData);
      setLocalPurchases(purchases);
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleReset = () => {
    form.reset(feature?.settings as SettingsFormData);
    setLocalPurchases([...serverPurchases]);
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
          <Link
            key="add"
            to="/features/$featureId/new"
            params={{ featureId }}
            onClick={(e) => handleNavigateClick(e, '/features/$featureId/new', { featureId })}
          >
            <Button size="sm">
              <Plus className="h-4 w-4" />
              {__('Add New', 'yayboost-sales-booster-for-woocommerce')}
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
        isDirty={isDirty}
        isLoading={isLoading || isFetching}
      >
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">
            {__('Display mode', 'yayboost-sales-booster-for-woocommerce')}
          </h3>
        </div>

        <FormField
          control={form.control}
          name="display.mode"
          render={({ field }) => (
            <FormItem>
              <Label>{__('How to show offers:', 'yayboost-sales-booster-for-woocommerce')}</Label>
              <FormControl>
                <RadioGroup value={field.value} onValueChange={field.onChange}>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="all" id="all" />
                    <div className="space-y-1">
                      <label htmlFor="all">
                        {__('Show all at once (grid)', 'yayboost-sales-booster-for-woocommerce')}
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="one_time" id="one_time" />
                    <div className="space-y-1">
                      <label htmlFor="one_time">
                        {__(
                          'Show one at a time (funnel)',
                          'yayboost-sales-booster-for-woocommerce',
                        )}
                      </label>
                    </div>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Label className="text-sm">
            {__('Maximum offers to show:', 'yayboost-sales-booster-for-woocommerce')}
          </Label>
          <FormField
            control={form.control}
            name="display.max_display"
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
          <h3 className="text-sm font-semibold">
            {__('Timing', 'yayboost-sales-booster-for-woocommerce')}
          </h3>
        </div>

        <FormField
          control={form.control}
          name="timing.show_countdown"
          render={({ field }) => (
            <FormItem className="flex items-center">
              <FormControl>
                <Checkbox
                  id="show_countdown"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <Label htmlFor="show_countdown" className="text-sm font-normal">
                {__('Show countdown timer', 'yayboost-sales-booster-for-woocommerce')}
              </Label>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Label className="text-sm">
            {__('Offer expires after:', 'yayboost-sales-booster-for-woocommerce')}
          </Label>
          <FormField
            control={form.control}
            name="timing.expires_after"
            render={({ field }) => (
              <FormItem className="m-0">
                <FormControl>
                  <InputNumber
                    id="expires_after"
                    placeholder="1"
                    min={1}
                    className="w-24"
                    value={field.value}
                    onValueChange={(val) => field.onChange(val)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="text-sm">{__('minutes', 'yayboost-sales-booster-for-woocommerce')}</div>
        </div>

        <Separator />

        <div className="space-y-1">
          <h3 className="text-sm font-semibold">
            {__('Your offers', 'yayboost-sales-booster-for-woocommerce')}
          </h3>
        </div>

        <div className="space-y-1">
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Info className="h-3.5 w-3.5 shrink-0" />
            {__('Drag to set priority.', 'yayboost-sales-booster-for-woocommerce')}
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10" />
                <TableHead className="font-semibold">#</TableHead>
                <TableHead className="font-semibold">
                  {__('Name', 'yayboost-sales-booster-for-woocommerce')}
                </TableHead>
                <TableHead className="font-semibold">
                  {__('Product', 'yayboost-sales-booster-for-woocommerce')}
                </TableHead>
                <TableHead className="font-semibold">
                  {__('Price', 'yayboost-sales-booster-for-woocommerce')}
                </TableHead>
                <TableHead className="text-center font-semibold">
                  {__('Status', 'yayboost-sales-booster-for-woocommerce')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entitiesLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                    {__('Loading…', 'yayboost-sales-booster-for-woocommerce')}
                  </TableCell>
                </TableRow>
              ) : purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="text-muted-foreground text-sm">
                        {__(
                          'No order purchases yet. Add one to get started.',
                          'yayboost-sales-booster-for-woocommerce',
                        )}
                      </p>
                      <Link
                        to="/features/$featureId/new"
                        params={{ featureId }}
                        className="hover:text-primary font-medium underline-offset-2 hover:underline"
                        onClick={(e) =>
                          handleNavigateClick(e, '/features/$featureId/new', { featureId })
                        }
                      >
                        <Button size="sm">
                          <Plus className="h-4 w-4" />
                          {__('Add New', 'yayboost-sales-booster-for-woocommerce')}
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                purchases.map((entity, index) => (
                  <TableRow
                    key={entity.id}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(index)}
                    className={draggedIndex === index ? 'opacity-50' : undefined}
                  >
                    <TableCell className="w-10">
                      <span
                        style={{ verticalAlign: '-0.17rem' }}
                        role="button"
                        tabIndex={0}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', String(index));
                          handleDragStart(index);
                        }}
                        onDragEnd={handleDragEnd}
                        className="text-muted-foreground inline-flex cursor-grab touch-none active:cursor-grabbing"
                        aria-label={__('Drag to reorder', 'yayboost-sales-booster-for-woocommerce')}
                      >
                        <GripVertical className="h-4 w-4" />
                      </span>
                    </TableCell>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <Link
                        to="/features/$featureId/$entityId"
                        params={{ featureId, entityId: String(entity.id) }}
                        className="hover:text-primary font-medium underline-offset-2 hover:underline"
                        onClick={(e) =>
                          handleNavigateClick(e, '/features/$featureId/$entityId', {
                            featureId,
                            entityId: String(entity.id),
                          })
                        }
                      >
                        {entity.name || '—'}
                      </Link>
                    </TableCell>
                    <TableCell>{getPurchaseProductName(entity)}</TableCell>
                    <TableCell>{getPurchasePrice(entity)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Switch
                          size="sm"
                          checked={entity.status === 'active'}
                          onCheckedChange={(checked) => handleStatusChange(entity.id, checked)}
                          disabled={isSavingAll}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {purchases.length > 0 && (
          <p className="text-muted-foreground mb-4 flex items-center gap-1.5 text-xs">
            <GripVertical className="h-4 w-4" />
            {__('Drag to reorder', 'yayboost-sales-booster-for-woocommerce')}
          </p>
        )}
      </SettingsCard>

      <AlertDialog
        open={!!pendingNavigate}
        onOpenChange={(open) => !open && setPendingNavigate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {__('Unsaved changes', 'yayboost-sales-booster-for-woocommerce')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {__(
                'You have unsaved changes. Do you want to save before leaving?',
                'yayboost-sales-booster-for-woocommerce',
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex justify-end gap-2">
            <AlertDialogCancel disabled={isSavingThenLeaving}>
              {__('Cancel', 'yayboost-sales-booster-for-woocommerce')}
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={handleLeaveWithoutSaving}
              disabled={isSavingThenLeaving}
            >
              {__('Leave without saving', 'yayboost-sales-booster-for-woocommerce')}
            </Button>
            <Button onClick={handleSaveAndContinue} disabled={isSavingThenLeaving}>
              {isSavingThenLeaving
                ? __('Saving…', 'yayboost-sales-booster-for-woocommerce')
                : __('Save and continue', 'yayboost-sales-booster-for-woocommerce')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
