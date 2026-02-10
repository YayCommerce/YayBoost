/**
 * Edit Bump page – two-column layout: left = form, right = preview.
 */

import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import { ArrowLeft, X } from 'lucide-react';
import z from 'zod';

import { useCreateEntity, useEntity, useUpdateEntity } from '@/hooks/use-entities';
import {
  useProduct,
  useProductCategories,
  useProducts,
  useProductTags,
} from '@/hooks/use-product-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFieldArray,
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
import FeatureLayoutHeader from '@/components/feature-layout-header';
import { SettingsCard } from '@/components/settings-card';

const BUMP_ENTITY_TYPE = 'bump';
const currencySymbol = window.yayboostData?.currencySymbol ?? '$';

const bumpEditorSchema = z.object({
  name: z.string().min(1),
  status: z.enum(['active', 'inactive']),
  product_id: z.string().min(1),
  pricing_type: z.enum(['no_discount', 'percent', 'fixed_amount', 'fixed_price', 'free']),
  pricing_value: z.number().min(0),
  show_when: z.enum(['always', 'match_conditions']),
  conditions: z
    .array(z.object({ has: z.string(), type: z.string(), value: z.string() }))
    .default([]),
  position: z.enum(['after_order_summary', 'before_payment_methods', 'before_place_order']),
  style: z.enum(['simple_checkbox', 'card_with_image', 'highlighted_box']),
  headline: z.string(),
  description: z.string(),
  checkbox_label: z.string(),
  behavior: z.enum(['hide', 'show']),
});

type BumpEditorFormData = z.infer<typeof bumpEditorSchema>;

function toFormData(entity: {
  name: string;
  status: string;
  settings: Record<string, unknown>;
}): BumpEditorFormData {
  const s = entity.settings ?? {};
  return {
    name: entity.name ?? '',
    status: (entity.status as 'active' | 'inactive') ?? 'active',
    product_id: (s.product_id as string) ?? '',
    pricing_type: (s.pricing_type as BumpEditorFormData['pricing_type']) ?? 'percent',
    pricing_value: Number(s.pricing_value ?? 20),
    show_when: (s.show_when as BumpEditorFormData['show_when']) ?? 'match_conditions',
    conditions: Array.isArray(s.conditions)
      ? (s.conditions as BumpEditorFormData['conditions'])
      : ([{ has: 'cart', type: 'product', value: '' }] as BumpEditorFormData['conditions']),
    position: (s.position as BumpEditorFormData['position']) ?? 'after_order_summary',
    style: (s.style as BumpEditorFormData['style']) ?? 'card_with_image',
    headline: (s.headline as string) ?? '⚡ SPECIAL OFFER',
    description: (s.description as string) ?? '',
    checkbox_label: (s.checkbox_label as string) ?? 'Yes! Add this to my order.',
    behavior: (s.behavior as BumpEditorFormData['behavior']) ?? 'hide',
  };
}

function toSettingsPayload(data: BumpEditorFormData): Record<string, unknown> {
  return {
    name: data.name,
    status: data.status,
    product_id: data.product_id,
    pricing_type: data.pricing_type,
    pricing_value: data.pricing_value,
    show_when: data.show_when,
    conditions: data.conditions,
    position: data.position,
    style: data.style,
    headline: data.headline,
    description: data.description,
    checkbox_label: data.checkbox_label,
    behavior: data.behavior,
  };
}

const DEFAULT_FORM_VALUES: BumpEditorFormData = {
  name: '',
  status: 'active',
  product_id: '',
  pricing_type: 'percent',
  pricing_value: 20,
  show_when: 'match_conditions',
  conditions: [{ has: 'cart', type: 'product', value: '' }],
  position: 'after_order_summary',
  style: 'card_with_image',
  headline: '⚡ SPECIAL OFFER',
  description: '',
  checkbox_label: 'Yes! Add this to my order.',
  behavior: 'hide',
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
  const { data: categories = [] } = useProductCategories();
  const { data: tags = [] } = useProductTags();
  const createEntity = useCreateEntity(featureId ?? '');
  const updateEntity = useUpdateEntity(featureId ?? '');

  const defaultValues = useMemo(() => (entity ? toFormData(entity) : undefined), [entity]);

  const form = useForm<BumpEditorFormData>({
    resolver: zodResolver(bumpEditorSchema),
    defaultValues: defaultValues ?? DEFAULT_FORM_VALUES,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'conditions',
  });

  const productId = form.watch('product_id');
  const { data: selectedProduct } = useProduct(productId || null);

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
  const style = form.watch('style');
  const pricingType = form.watch('pricing_type');
  const pricingValue = form.watch('pricing_value');
  const regularPrice =
    selectedProduct?.regular_price != null ? Number(selectedProduct.regular_price) : 0;
  const productLabel =
    selectedProduct?.label ?? products.find((p) => p.value === productId)?.label ?? '';

  const previewBumpPrice = useMemo(() => {
    if (pricingType === 'percent') {
      const pct = pricingValue / 100;
      return regularPrice * (1 - pct);
    }
    if (pricingType === 'fixed_amount') return Math.max(0, regularPrice - pricingValue);
    if (pricingType === 'fixed_price') return pricingValue;
    if (pricingType === 'free') return 0;
    return regularPrice;
  }, [pricingType, pricingValue, regularPrice]);

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
      <FeatureLayoutHeader
        title={isNew ? __('New Bump', 'yayboost') : __('Edit Bump', 'yayboost')}
        description={__('Configure your order bump settings.', 'yayboost')}
        goBackRoute="/features/order_bump"
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Left: Form */}
        <SettingsCard
          headless
          title={isNew ? __('New Bump', 'yayboost') : __('Edit Bump', 'yayboost')}
          description={__('Configure your order bump settings.', 'yayboost')}
          onSave={() => {
            form.handleSubmit(onSubmit)();
          }}
          onReset={() => {
            form.reset(toFormData(entity));
          }}
          isSaving={updateEntity.isPending}
          isDirty={form.formState.isDirty}
          isLoading={createEntity.isPending || updateEntity.isPending}
        >
          {/* General */}
          <div className="space-y-1">
            <h3 className="mb-2 text-sm font-medium">{__('General', 'yayboost')}</h3>
          </div>
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

          <Separator />

          {/* Basic info */}
          <div className="space-y-1">
            <h3 className="mb-2 text-sm font-medium">{__('Basic info', 'yayboost')}</h3>
          </div>

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
                    <SelectTrigger className="w-full">
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

          <Separator />

          {/* Pricing */}
          <div className="space-y-1">
            <h3 className="mb-2 text-sm font-medium">{__('Pricing', 'yayboost')}</h3>
          </div>
          <FormField
            control={form.control}
            name="pricing_type"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="no_discount" id="dt-none" />
                      <Label htmlFor="dt-none" className="font-normal">
                        {__('No discount (show regular price)', 'yayboost')}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="percent" id="dt-percent" />
                      <div className="flex items-center gap-2">
                        <Label htmlFor="dt-percent" className="font-normal">
                          {__('Percentage off', 'yayboost')}
                        </Label>
                        {field.value === 'percent' && (
                          <FormField
                            control={form.control}
                            name="pricing_value"
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
                      <RadioGroupItem value="fixed_amount" id="dt-fixed-amount" />
                      <Label htmlFor="dt-fixed-amount" className="font-normal">
                        {__('Fixed amount off', 'yayboost')}
                      </Label>
                      {field.value === 'fixed_amount' && (
                        <FormField
                          control={form.control}
                          name="pricing_value"
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
                          name="pricing_value"
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
                <FormDescription>
                  {__('Regular:', 'yayboost')} {currencySymbol}
                  {regularPrice.toFixed(2)} → {__('Bump price:', 'yayboost')} {currencySymbol}
                  {previewBumpPrice.toFixed(2)}
                </FormDescription>
              </FormItem>
            )}
          />

          <Separator />

          {/* Conditions */}
          <div className="space-y-1">
            <h3 className="mb-2 text-sm font-medium">{__('Conditions', 'yayboost')}</h3>
          </div>
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
            <div className="bg-muted/50 mt-4 space-y-3 rounded-md border p-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex flex-wrap items-start gap-2">
                  <FormField
                    control={form.control}
                    name={`conditions.${index}.has`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormControl>
                          <Select value={f.value} onValueChange={f.onChange}>
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder={__('Cart has', 'yayboost')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cart">{__('Cart has', 'yayboost')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`conditions.${index}.type`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormControl>
                          <Select
                            value={f.value}
                            onValueChange={(v) => {
                              f.onChange(v);
                              form.setValue(`conditions.${index}.value`, '');
                            }}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder={__('Select type', 'yayboost')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="product">{__('Product', 'yayboost')}</SelectItem>
                              <SelectItem value="category">{__('Category', 'yayboost')}</SelectItem>
                              <SelectItem value="tag">{__('Tag', 'yayboost')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`conditions.${index}.value`}
                    render={({ field: f }) => {
                      const conditionType = form.watch(`conditions.${index}.type`);
                      const valueOptions =
                        conditionType === 'category'
                          ? categories
                          : conditionType === 'tag'
                            ? tags
                            : products;
                      return (
                        <FormItem>
                          <FormControl>
                            <Select value={f.value} onValueChange={f.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder={__('Select value', 'yayboost')} />
                              </SelectTrigger>
                              <SelectContent>
                                {valueOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive h-9 w-9 shrink-0"
                    onClick={() => remove(index)}
                    aria-label={__('Remove condition', 'yayboost')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-sm"
                onClick={() => append({ has: 'cart', type: 'product', value: '' })}
              >
                + {__('Add Condition', 'yayboost')}
              </Button>
            </div>
          )}

          <Separator />

          {/* Display */}
          <div className="space-y-1">
            <h3 className="mb-2 text-sm font-medium">{__('Display', 'yayboost')}</h3>
          </div>

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

          <Separator />

          {/* Content */}
          <div className="space-y-1">
            <h3 className="mb-2 text-sm font-medium">{__('Content', 'yayboost')}</h3>
          </div>
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
          <Separator />

          {/* Behavior */}
          <div className="space-y-1">
            <h3 className="mb-2 text-sm font-medium">{__('Behavior', 'yayboost')}</h3>
            <div className="flex flex-col gap-6"></div>
          </div>
          <FormField
            control={form.control}
            name="behavior"
            render={({ field }) => (
              <FormItem>
                <Label>{__('If product already in cart:', 'yayboost')}</Label>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="hide" id="hide" />
                      <label htmlFor="hide">{__('Hide this bump', 'yayboost')}</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="show" id="show" />
                      <label htmlFor="show">{__('Still show it', 'yayboost')}</label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsCard>

        {/* Right: Preview */}
        <div className="sticky top-6 h-fit space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{__('Preview', 'yayboost')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {style === 'simple_checkbox' && (
                <div className="rounded-lg border bg-white p-3 shadow-sm">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="-mt-0.5 h-4 w-4 shrink-0 rounded border"
                      />
                      {checkboxLabel || 'Yes! Add this to my order.'}
                    </label>
                    <span className="text-muted-foreground text-sm">
                      {productLabel ? (
                        <span className="font-medium text-foreground">{productLabel} · </span>
                      ) : null}
                      {currencySymbol}
                      {previewBumpPrice.toFixed(2)}
                      {previewBumpPrice < regularPrice && (
                        <>
                          {' '}
                          <span className="line-through">
                            {currencySymbol}
                            {regularPrice.toFixed(2)}
                          </span>
                          {pricingType === 'percent' && (
                            <span className="text-green-600">
                              ({__('Save', 'yayboost')} {pricingValue}%)
                            </span>
                          )}
                        </>
                      )}
                    </span>
                  </div>
                </div>
              )}
              {style === 'highlighted_box' && (
                <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-4 shadow-sm">
                  <p className="font-medium">{headline || '⚡ SPECIAL OFFER'}</p>
                  <p className="text-muted-foreground mt-0.5 text-sm">{productLabel}</p>
                  {description && (
                    <p
                      className="text-muted-foreground mt-1 text-sm"
                      dangerouslySetInnerHTML={{ __html: description }}
                    />
                  )}
                  <div className="mt-2 flex flex-wrap items-baseline gap-2">
                    <span className="font-semibold">
                      {currencySymbol}
                      {previewBumpPrice.toFixed(2)}
                    </span>
                    {previewBumpPrice < regularPrice && (
                      <>
                        <span className="text-muted-foreground line-through">
                          {currencySymbol}
                          {regularPrice.toFixed(2)}
                        </span>
                        {pricingType === 'percent' && (
                          <span className="text-sm text-green-600">
                            ({__('Save', 'yayboost')} {pricingValue}%)
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="-mt-0.5 h-4 w-4 shrink-0 rounded border"
                    />
                    {checkboxLabel || 'Yes! Add this to my order.'}
                  </label>
                </div>
              )}
              {style === 'card_with_image' && (
                <div className="rounded-lg border bg-white p-4 shadow-sm">
                  <div className="flex gap-4">
                    <div className="bg-muted flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md">
                      {selectedProduct?.image ? (
                        <img
                          src={selectedProduct.image}
                          alt={productLabel || selectedProduct.label}
                          className="h-24 w-24 rounded-md object-cover"
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          {__('No image', 'yayboost')}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="font-medium">{headline || '⚡ SPECIAL OFFER'}</p>
                      <p className="text-sm">{productLabel}</p>
                      <p
                        className="text-muted-foreground text-sm"
                        dangerouslySetInnerHTML={{
                          __html: description || '',
                        }}
                      />
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-semibold">
                          {currencySymbol}
                          {previewBumpPrice.toFixed(2)}
                        </span>
                        {previewBumpPrice < regularPrice && (
                          <>
                            <span className="text-muted-foreground line-through">
                              {currencySymbol}
                              {regularPrice.toFixed(2)}
                            </span>
                            {pricingType === 'percent' && (
                              <span className="text-sm text-green-600">
                                ({__('Save', 'yayboost')} {pricingValue}%)
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="-mt-0.5 h-4 w-4 shrink-0 rounded border"
                        />
                        {checkboxLabel || 'Yes! Add this to my order.'}
                      </label>
                    </div>
                  </div>
                </div>
              )}
              <div className="bg-primary/5 text-primary border-primary/20 rounded-md border p-3 text-sm">
                {__(
                  'This preview shows how your offer will appear to customers when they are checkouting.',
                  'yayboost',
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Form>
  );
}
