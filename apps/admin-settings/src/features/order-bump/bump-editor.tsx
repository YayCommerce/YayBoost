/**
 * Edit Bump page – two-column layout: left = form, right = preview.
 */

import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { __ } from '@wordpress/i18n';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import z from 'zod';

import { useCreateEntity, useEntity, useUpdateEntity } from '@/hooks/use-entities';
import { useProducts } from '@/hooks/use-product-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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
import { Textarea } from '@/components/ui/textarea';

const BUMP_ENTITY_TYPE = 'bump';
const currencySymbol = window.yayboostData?.currencySymbol ?? '$';

const bumpEditorSchema = z.object({
  name: z.string().min(1),
  status: z.enum(['active', 'inactive']),
  product_id: z.string().min(1),
  discount_type: z.enum(['no_discount', 'percent', 'fixed_amount', 'fixed_price', 'free']),
  discount_value: z.number().min(0),
  regular_price: z.number().min(0).optional(),
  bump_price: z.number().min(0).optional(),
  show_when: z.enum(['always', 'match_conditions']),
  conditions: z.array(z.object({ type: z.string(), value: z.string() })).default([]),
  position: z.enum(['after_order_summary', 'before_payment_methods', 'before_place_order']),
  style: z.enum(['simple_checkbox', 'card_with_image', 'highlighted_box']),
  headline: z.string(),
  description: z.string(),
  checkbox_label: z.string(),
});

type BumpEditorFormData = z.infer<typeof bumpEditorSchema>;

function toFormData(entity: { name: string; status: string; settings: Record<string, unknown> }): BumpEditorFormData {
  const s = entity.settings ?? {};
  return {
    name: entity.name ?? '',
    status: (entity.status as 'active' | 'inactive') ?? 'active',
    product_id: (s.product_id as string) ?? '',
    discount_type: (s.discount_type as BumpEditorFormData['discount_type']) ?? 'percent',
    discount_value: Number(s.discount_value ?? 20),
    regular_price: s.regular_price != null ? Number(s.regular_price) : 39,
    bump_price: s.bump_price != null ? Number(s.bump_price) : 31.2,
    show_when: (s.show_when as BumpEditorFormData['show_when']) ?? 'match_conditions',
    conditions: Array.isArray(s.conditions) ? (s.conditions as BumpEditorFormData['conditions']) : [],
    position: (s.position as BumpEditorFormData['position']) ?? 'after_order_summary',
    style: (s.style as BumpEditorFormData['style']) ?? 'card_with_image',
    headline: (s.headline as string) ?? '⚡ SPECIAL OFFER',
    description: (s.description as string) ?? '',
    checkbox_label: (s.checkbox_label as string) ?? 'Yes! Add this to my order.',
  };
}

function toSettingsPayload(data: BumpEditorFormData): Record<string, unknown> {
  return {
    product_id: data.product_id,
    discount_type: data.discount_type,
    discount_value: data.discount_value,
    regular_price: data.regular_price,
    bump_price: data.bump_price,
    show_when: data.show_when,
    conditions: data.conditions,
    position: data.position,
    style: data.style,
    headline: data.headline,
    description: data.description,
    checkbox_label: data.checkbox_label,
  };
}

const DEFAULT_FORM_VALUES: BumpEditorFormData = {
  name: '',
  status: 'active',
  product_id: '',
  discount_type: 'percent',
  discount_value: 20,
  regular_price: 39,
  bump_price: 31.2,
  show_when: 'match_conditions',
  conditions: [],
  position: 'after_order_summary',
  style: 'card_with_image',
  headline: '⚡ SPECIAL OFFER',
  description: '',
  checkbox_label: 'Yes! Add this to my order.',
};

export default function BumpEditor() {
  const navigate = useNavigate();
  const { featureId, entityId } = useParams({ strict: false });
  const isNew = !entityId || entityId === 'new';
  const entityIdNum = !isNew && entityId ? parseInt(entityId, 10) : 0;

  const { data: entity, isLoading: entityLoading } = useEntity(
    featureId ?? '',
    entityIdNum,
    BUMP_ENTITY_TYPE,
  );
  const { data: products = [] } = useProducts();
  const createEntity = useCreateEntity(featureId ?? '');
  const updateEntity = useUpdateEntity(featureId ?? '');

  const defaultValues = useMemo(
    () => (entity ? toFormData(entity) : undefined),
    [entity],
  );

  const form = useForm<BumpEditorFormData>({
    resolver: zodResolver(bumpEditorSchema),
    defaultValues: defaultValues ?? DEFAULT_FORM_VALUES,
  });

  const onSubmit = (data: BumpEditorFormData) => {
    const payload = {
      name: data.name,
      status: data.status,
      settings: toSettingsPayload(data),
    };
    if (isNew) {
      createEntity.mutate(
        { entity: payload, entityType: BUMP_ENTITY_TYPE },
        {
          onSuccess: (created) => {
            navigate({
              to: '/features/$featureId/$entityId',
              params: { featureId: featureId ?? '', entityId: String(created.id) },
            });
          },
        },
      );
    } else {
      updateEntity.mutate(
        {
          entityId: entityIdNum,
          entity: payload,
          entityType: BUMP_ENTITY_TYPE,
        },
        {
          onSuccess: (updated) => {
            form.reset(toFormData(updated));
          },
        },
      );
    }
  };

  // Sync form when entity loads or updates from server (edit mode only)
  useEffect(() => {
    if (entity) {
      form.reset(toFormData(entity));
    }
  }, [entity?.id, entity?.updated_at]);

  const headline = form.watch('headline');
  const description = form.watch('description');
  const checkboxLabel = form.watch('checkbox_label');
  const discountType = form.watch('discount_type');
  const discountValue = form.watch('discount_value');
  const regularPrice = form.watch('regular_price') ?? 39;
  const productId = form.watch('product_id');
  const productLabel = products.find((p) => p.value === productId)?.label ?? '2-Year Extended Warranty';

  const previewBumpPrice = useMemo(() => {
    if (discountType === 'percent') {
      const pct = discountValue / 100;
      return regularPrice * (1 - pct);
    }
    if (discountType === 'fixed_amount') return Math.max(0, regularPrice - discountValue);
    if (discountType === 'fixed_price') return discountValue;
    if (discountType === 'free') return 0;
    return regularPrice;
  }, [discountType, discountValue, regularPrice]);

  if (!isNew && (entityLoading || !entity)) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <div className="mb-6 flex flex-col gap-1">
        <Link
          to="/features/$featureId"
          params={{ featureId: featureId ?? '' }}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          {__('Back to Order Bumps', 'yayboost')}
        </Link>
        <h1 className="text-2xl font-semibold">
          {isNew ? __('New Bump', 'yayboost') : __('Edit Bump', 'yayboost')}
        </h1>
        <p className="text-muted-foreground text-sm">
          {__('Configure your order bump settings.', 'yayboost')}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Form */}
        <Card>
          <CardContent className="space-y-6 pt-6">
            {/* General */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">{__('General', 'yayboost')}</h3>
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex gap-4"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="active" id="status-active" />
                          <Label htmlFor="status-active" className="font-normal">
                            {__('Active', 'yayboost')}
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="inactive" id="status-inactive" />
                          <Label htmlFor="status-inactive" className="font-normal">
                            {__('Inactive', 'yayboost')}
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Basic info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">{__('Basic info', 'yayboost')}</h3>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{__('Bump name (internal)', 'yayboost')}</FormLabel>
                    <FormControl>
                      <Input placeholder="Extended Warranty Offer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="product_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{__('Product to offer', 'yayboost')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={__('Select product', 'yayboost')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Pricing */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">{__('Pricing', 'yayboost')}</h3>
              <FormField
                control={form.control}
                name="discount_type"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex flex-col gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="percent" id="dt-percent" />
                          <div className="flex items-center gap-2">
                            <Label htmlFor="dt-percent" className="font-normal">
                              {__('Percentage off', 'yayboost')}
                            </Label>
                            {field.value === 'percent' && (
                              <FormField
                                control={form.control}
                                name="discount_value"
                                render={({ field: v }) => (
                                  <FormItem className="flex items-center gap-1">
                                    <FormControl>
                                      <InputNumber
                                        className="w-16"
                                        value={v.value}
                                        onValueChange={(n) => v.onChange(n ?? 0)}
                                      />
                                    </FormControl>
                                    <span className="text-sm">%</span>
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="no_discount" id="dt-none" />
                          <Label htmlFor="dt-none" className="font-normal">
                            {__('No discount (show regular price)', 'yayboost')}
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="fixed_amount" id="dt-fixed-amount" />
                          <Label htmlFor="dt-fixed-amount" className="font-normal">
                            {__('Fixed amount off', 'yayboost')}
                          </Label>
                          {field.value === 'fixed_amount' && (
                            <FormField
                              control={form.control}
                              name="discount_value"
                              render={({ field: v }) => (
                                <FormItem>
                                  <FormControl>
                                    <InputNumber
                                      className="w-20"
                                      value={v.value}
                                      onValueChange={(n) => v.onChange(n ?? 0)}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="fixed_price" id="dt-fixed-price" />
                          <Label htmlFor="dt-fixed-price" className="font-normal">
                            {__('Fixed price', 'yayboost')}
                          </Label>
                          {field.value === 'fixed_price' && (
                            <FormField
                              control={form.control}
                              name="discount_value"
                              render={({ field: v }) => (
                                <FormItem>
                                  <FormControl>
                                    <InputNumber
                                      className="w-20"
                                      value={v.value}
                                      onValueChange={(n) => v.onChange(n ?? 0)}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="free" id="dt-free" />
                          <Label htmlFor="dt-free" className="font-normal">
                            {__('Free', 'yayboost')}
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="text-muted-foreground text-sm">
                {__('Regular:', 'yayboost')} {currencySymbol}
                {regularPrice.toFixed(2)} → {__('Bump price:', 'yayboost')} {currencySymbol}
                {previewBumpPrice.toFixed(2)}.
              </p>
            </div>

            <Separator />

            {/* Conditions */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">{__('Conditions', 'yayboost')}</h3>
              <FormField
                control={form.control}
                name="show_when"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex flex-col gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="always" id="show-always" />
                          <Label htmlFor="show-always" className="font-normal">
                            {__('Always show', 'yayboost')}
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="match_conditions" id="show-match" />
                          <Label htmlFor="show-match" className="font-normal">
                            {__('Match conditions below (ALL must match)', 'yayboost')}
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch('show_when') === 'match_conditions' && (
                <div className="bg-muted/50 rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Select>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder={__('Cart has', 'yayboost')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="category">{__('Category', 'yayboost')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground rounded bg-muted px-2 py-1 text-sm">
                      Electronics ×
                    </span>
                  </div>
                  <button
                    type="button"
                    className="text-primary mt-2 text-sm underline"
                  >
                    + {__('Add Condition', 'yayboost')}
                  </button>
                </div>
              )}
            </div>

            <Separator />

            {/* Display */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">{__('Display', 'yayboost')}</h3>
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{__('Position on checkout', 'yayboost')}</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex flex-col gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="after_order_summary" id="pos-after" />
                          <Label htmlFor="pos-after" className="font-normal">
                            {__('After order summary', 'yayboost')}
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="before_payment_methods" id="pos-payment" />
                          <Label htmlFor="pos-payment" className="font-normal">
                            {__('Before payment methods', 'yayboost')}
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="before_place_order" id="pos-place" />
                          <Label htmlFor="pos-place" className="font-normal">
                            {__('Before place order button', 'yayboost')}
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="style"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{__('Style', 'yayboost')}</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex flex-col gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="simple_checkbox" id="style-simple" />
                          <Label htmlFor="style-simple" className="font-normal">
                            {__('Simple checkbox', 'yayboost')}
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="card_with_image" id="style-card" />
                          <Label htmlFor="style-card" className="font-normal">
                            {__('Card with image', 'yayboost')}
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="highlighted_box" id="style-highlight" />
                          <Label htmlFor="style-highlight" className="font-normal">
                            {__('Highlighted box', 'yayboost')}
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Content */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">{__('Content', 'yayboost')}</h3>
              <FormField
                control={form.control}
                name="headline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{__('Headline', 'yayboost')}</FormLabel>
                    <FormControl>
                      <Input placeholder="⚡ SPECIAL OFFER" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{__('Description', 'yayboost')}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={__('Enter description', 'yayboost')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="checkbox_label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{__('Checkbox label', 'yayboost')}</FormLabel>
                    <FormControl>
                      <Input placeholder="Yes! Add this to my order." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={
                  (isNew ? createEntity.isPending : updateEntity.isPending) ||
                  (!isNew && !form.formState.isDirty)
                }
              >
                {isNew
                  ? createEntity.isPending
                    ? __('Creating…', 'yayboost')
                    : __('Create Bump', 'yayboost')
                  : updateEntity.isPending
                    ? __('Saving…', 'yayboost')
                    : __('Save Changes', 'yayboost')}
              </Button>
              {form.formState.isDirty && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => (entity ? form.reset(toFormData(entity)) : form.reset(DEFAULT_FORM_VALUES))}
                  disabled={isNew ? createEntity.isPending : updateEntity.isPending}
                >
                  {__('Cancel', 'yayboost')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: Preview */}
        <div className="sticky top-6 h-fit space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{__('Preview', 'yayboost')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="flex gap-4">
                  <div className="bg-muted flex h-24 w-24 shrink-0 items-center justify-center rounded text-xs">
                    [Img]
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="font-medium">{headline || '⚡ SPECIAL OFFER'}</p>
                    <p className="text-muted-foreground text-sm">{productLabel}</p>
                    <p className="text-sm">{description || 'Protect your purchase from accidents for 2 years.'}</p>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-semibold">{currencySymbol}{previewBumpPrice.toFixed(2)}</span>
                      {previewBumpPrice < regularPrice && (
                        <>
                          <span className="text-muted-foreground line-through">
                            {currencySymbol}{regularPrice.toFixed(2)}
                          </span>
                          {discountType === 'percent' && (
                            <span className="text-green-600 text-sm">
                              ({__('Save', 'yayboost')} {discountValue}%)
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded border" />
                      {checkboxLabel || 'Yes! Add this to my order.'}
                    </label>
                  </div>
                </div>
              </div>
              <div className="bg-primary/5 text-primary rounded-md border border-primary/20 p-3 text-sm">
                {__('This preview shows how your offer will appear to customers when they are checkouting.', 'yayboost')}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Form>
  );
}
