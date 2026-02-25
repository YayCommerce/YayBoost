/**
 * Edit Post Purchase Upsells page – two-column layout: left = form, right = preview.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import { Clock, X, Zap } from 'lucide-react';
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

const PURCHASE_ENTITY_TYPE = 'purchase';
const currencySymbol = window.yayboostData?.currencySymbol ?? '$';

const purchaseEditorSchema = z.object({
  name: z.string().min(1),
  status: z.enum(['active', 'inactive']),
  product_id: z.string().min(1),
  pricing_type: z.enum(['no_discount', 'percent', 'fixed_amount', 'fixed_price', 'free']),
  pricing_value: z.number().min(0),
  show_when: z.enum(['always', 'match_conditions']),
  conditions: z
    .array(z.object({ has: z.string(), type: z.string(), value: z.string() }))
    .default([]),
  headline: z.string(),
  description: z.string(),
  accept_button: z.string(),
  decline_button: z.string(),
  behavior: z.enum(['hide', 'show']),
});

type PurchaseEditorFormData = z.infer<typeof purchaseEditorSchema>;

function toFormData(entity: {
  name: string;
  status: string;
  settings: Record<string, unknown>;
}): PurchaseEditorFormData {
  const s = entity.settings ?? {};
  return {
    name: entity.name ?? '',
    status: (entity.status as 'active' | 'inactive') ?? 'active',
    product_id: (s.product_id as string) ?? '',
    pricing_type: (s.pricing_type as PurchaseEditorFormData['pricing_type']) ?? 'percent',
    pricing_value: Number(s.pricing_value ?? 20),
    show_when: (s.show_when as PurchaseEditorFormData['show_when']) ?? 'match_conditions',
    conditions: Array.isArray(s.conditions)
      ? (s.conditions as PurchaseEditorFormData['conditions'])
      : ([{ has: 'cart', type: 'product', value: '' }] as PurchaseEditorFormData['conditions']),

    headline: (s.headline as string) ?? '⚡ Wait! Exclusive offer just for you',
    description: (s.description as string) ?? '',
    accept_button: (s.accept_button as string) ?? 'Add to My Order',
    decline_button: (s.decline_button as string) ?? 'No, thanks',
    behavior: (s.behavior as PurchaseEditorFormData['behavior']) ?? 'hide',
  };
}

function toSettingsPayload(data: PurchaseEditorFormData): Record<string, unknown> {
  return {
    name: data.name,
    status: data.status,
    product_id: data.product_id,
    pricing_type: data.pricing_type,
    pricing_value: data.pricing_value,
    show_when: data.show_when,
    conditions: data.conditions,
    headline: data.headline,
    description: data.description,
    accept_button: data.accept_button,
    decline_button: data.decline_button,
    behavior: data.behavior,
  };
}

const DEFAULT_FORM_VALUES: PurchaseEditorFormData = {
  name: '',
  status: 'active',
  product_id: '',
  pricing_type: 'percent',
  pricing_value: 20,
  show_when: 'always',
  conditions: [],
  headline: '⚡ Wait! Exclusive offer just for you',
  description: '',
  accept_button: 'Add to My Order',
  decline_button: 'No, thanks',
  behavior: 'hide',
};

export default function PurchaseEditor() {
  const navigate = useNavigate();
  const { featureId, entityId } = useParams({ strict: false });
  const isNew = !entityId || entityId === 'new';
  const entityIdNum = !isNew && entityId ? parseInt(entityId, 10) : 0;

  const { data: entity, isLoading: entityLoading } = useEntity(
    featureId ?? '',
    entityIdNum,
    PURCHASE_ENTITY_TYPE,
  );
  const { data: products = [] } = useProducts();
  const { data: categories = [] } = useProductCategories();
  const { data: tags = [] } = useProductTags();
  const createEntity = useCreateEntity(featureId ?? '');
  const updateEntity = useUpdateEntity(featureId ?? '');

  const defaultValues = useMemo(() => (entity ? toFormData(entity) : undefined), [entity]);

  const form = useForm<PurchaseEditorFormData>({
    resolver: zodResolver(purchaseEditorSchema),
    defaultValues: defaultValues ?? DEFAULT_FORM_VALUES,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'conditions',
  });

  const productId = form.watch('product_id');
  const { data: selectedProduct } = useProduct(productId || null);

  const onSubmit = (data: PurchaseEditorFormData) => {
    const payload = {
      name: data.name,
      status: data.status,
      settings: toSettingsPayload(data),
    };
    if (isNew) {
      createEntity.mutate(
        { entity: payload, entityType: PURCHASE_ENTITY_TYPE },
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
          entityType: PURCHASE_ENTITY_TYPE,
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
  const acceptButton = form.watch('accept_button');
  const declineButton = form.watch('decline_button');
  const pricingType = form.watch('pricing_type');
  const pricingValue = form.watch('pricing_value');
  const regularPrice =
    selectedProduct?.regular_price != null ? Number(selectedProduct.regular_price) : 0;
  const productLabel =
    selectedProduct?.label ?? products.find((p) => p.value === productId)?.label ?? '';

  const previewPurchasePrice = useMemo(() => {
    if (pricingType === 'percent') {
      const pct = pricingValue / 100;
      return regularPrice * (1 - pct);
    }
    if (pricingType === 'fixed_amount') return Math.max(0, regularPrice - pricingValue);
    if (pricingType === 'fixed_price') return pricingValue;
    if (pricingType === 'free') return 0;
    return regularPrice;
  }, [pricingType, pricingValue, regularPrice]);

  const getPreviewPrice = useCallback(
    (price: number) => {
      if (pricingType === 'percent') {
        const pct = pricingValue / 100;
        return price * (1 - pct);
      }
      if (pricingType === 'fixed_amount') return Math.max(0, price - pricingValue);
      if (pricingType === 'fixed_price') return pricingValue;
      if (pricingType === 'free') return 0;
      return price;
    },
    [pricingType, pricingValue],
  );

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
        title={
          isNew
            ? __('New Purchase', 'yayboost-sales-booster-for-woocommerce')
            : __('Edit Purchase', 'yayboost-sales-booster-for-woocommerce')
        }
        description={__(
          'Configure your purchase settings.',
          'yayboost-sales-booster-for-woocommerce',
        )}
        goBackRoute="/features/post_purchase_upsells"
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Left: Form */}
        <SettingsCard
          headless
          title={
            isNew
              ? __('New Purchase', 'yayboost-sales-booster-for-woocommerce')
              : __('Edit Purchase', 'yayboost-sales-booster-for-woocommerce')
          }
          description={__(
            'Configure your purchase settings.',
            'yayboost-sales-booster-for-woocommerce',
          )}
          onSave={() => {
            form.handleSubmit(onSubmit)();
          }}
          onReset={() => {
            form.reset(toFormData(entity));
          }}
          disabled={!isNew}
          isSaving={createEntity.isPending || updateEntity.isPending}
          isDirty={form.formState.isDirty}
          buttonText={
            isNew
              ? __('Add New', 'yayboost-sales-booster-for-woocommerce')
              : __('Save Changes', 'yayboost-sales-booster-for-woocommerce')
          }
        >
          {/* General */}
          <div className="space-y-1">
            <h3 className="mb-2 text-sm font-medium">
              {__('General', 'yayboost-sales-booster-for-woocommerce')}
            </h3>
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
                        {__('Active', 'yayboost-sales-booster-for-woocommerce')}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="inactive" id="status-inactive" />
                      <Label htmlFor="status-inactive" className="font-normal">
                        {__('Inactive', 'yayboost-sales-booster-for-woocommerce')}
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
            <h3 className="mb-2 text-sm font-medium">
              {__('Basic info', 'yayboost-sales-booster-for-woocommerce')}
            </h3>
          </div>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {__('Offer name (internal)', 'yayboost-sales-booster-for-woocommerce')}
                </FormLabel>
                <FormControl>
                  <Input placeholder="Case Upsell" {...field} />
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
                <FormLabel>
                  {__('Product to offer', 'yayboost-sales-booster-for-woocommerce')}
                </FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={__('Select product', 'yayboost-sales-booster-for-woocommerce')}
                      />
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
            <h3 className="mb-2 text-sm font-medium">
              {__('Pricing', 'yayboost-sales-booster-for-woocommerce')}
            </h3>
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
                        {__(
                          'No discount (show regular price)',
                          'yayboost-sales-booster-for-woocommerce',
                        )}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="percent" id="dt-percent" />
                      <div className="flex items-center gap-2">
                        <Label htmlFor="dt-percent" className="font-normal">
                          {__('Percentage off', 'yayboost-sales-booster-for-woocommerce')}
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
                        {__('Fixed amount off', 'yayboost-sales-booster-for-woocommerce')}
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
                        {__('Fixed price', 'yayboost-sales-booster-for-woocommerce')}
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
                        {__('Free', 'yayboost-sales-booster-for-woocommerce')}
                      </Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
                <FormDescription>
                  {__('Regular:', 'yayboost-sales-booster-for-woocommerce')} {currencySymbol}
                  {100} → {__('Offer price:', 'yayboost-sales-booster-for-woocommerce')}{' '}
                  {currencySymbol}
                  {getPreviewPrice(100)}
                </FormDescription>
              </FormItem>
            )}
          />

          <Separator />

          {/* Conditions */}
          <div className="space-y-1">
            <h3 className="mb-2 text-sm font-medium">
              {__('Conditions', 'yayboost-sales-booster-for-woocommerce')}
            </h3>
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
                        {__('Always show', 'yayboost-sales-booster-for-woocommerce')}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="match_conditions" id="show-match" />
                      <Label htmlFor="show-match" className="font-normal">
                        {__(
                          'Match conditions below (ALL must match)',
                          'yayboost-sales-booster-for-woocommerce',
                        )}
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
                              <SelectValue
                                placeholder={__(
                                  'Cart has',
                                  'yayboost-sales-booster-for-woocommerce',
                                )}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cart">
                                {__('Cart has', 'yayboost-sales-booster-for-woocommerce')}
                              </SelectItem>
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
                              <SelectValue
                                placeholder={__(
                                  'Select type',
                                  'yayboost-sales-booster-for-woocommerce',
                                )}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="product">
                                {__('Product', 'yayboost-sales-booster-for-woocommerce')}
                              </SelectItem>
                              <SelectItem value="category">
                                {__('Category', 'yayboost-sales-booster-for-woocommerce')}
                              </SelectItem>
                              <SelectItem value="tag">
                                {__('Tag', 'yayboost-sales-booster-for-woocommerce')}
                              </SelectItem>
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
                                <SelectValue
                                  placeholder={__(
                                    'Select value',
                                    'yayboost-sales-booster-for-woocommerce',
                                  )}
                                />
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
                    aria-label={__('Remove condition', 'yayboost-sales-booster-for-woocommerce')}
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
                + {__('Add Condition', 'yayboost-sales-booster-for-woocommerce')}
              </Button>
            </div>
          )}

          <Separator />

          {/* Content */}
          <div className="space-y-1">
            <h3 className="mb-2 text-sm font-medium">
              {__('Content', 'yayboost-sales-booster-for-woocommerce')}
            </h3>
          </div>
          <FormField
            control={form.control}
            name="headline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{__('Headline', 'yayboost-sales-booster-for-woocommerce')}</FormLabel>
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
                <FormLabel>{__('Description', 'yayboost-sales-booster-for-woocommerce')}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={__('Enter description', 'yayboost-sales-booster-for-woocommerce')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="accept_button"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {__('Accept button', 'yayboost-sales-booster-for-woocommerce')}
                </FormLabel>
                <FormControl>
                  <Input placeholder="Add to My Order" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="decline_button"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {__('Decline button', 'yayboost-sales-booster-for-woocommerce')}
                </FormLabel>
                <FormControl>
                  <Input placeholder="No, thanks" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Separator />

          {/* Behavior */}
          <div className="space-y-1">
            <h3 className="mb-2 text-sm font-medium">
              {__('Behavior', 'yayboost-sales-booster-for-woocommerce')}
            </h3>
            <div className="flex flex-col gap-6"></div>
          </div>
          <FormField
            control={form.control}
            name="behavior"
            render={({ field }) => (
              <FormItem>
                <Label>
                  {__('If product already in order:', 'yayboost-sales-booster-for-woocommerce')}
                </Label>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="hide" id="hide" />
                      <label htmlFor="hide">
                        {__('Hide this offer', 'yayboost-sales-booster-for-woocommerce')}
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="show" id="show" />
                      <label htmlFor="show">
                        {__('Still show it', 'yayboost-sales-booster-for-woocommerce')}
                      </label>
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
              <CardTitle>{__('Preview', 'yayboost-sales-booster-for-woocommerce')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-white p-5 shadow-sm">
                {/* Headline – centered with icon */}
                <p className="mb-2 text-center text-xl font-medium">
                  {headline || '⚡ Wait! Exclusive offer just for you'}
                </p>
                {/* Description */}
                {description ? (
                  <p className="text-muted-foreground mb-2 text-center text-sm">{description}</p>
                ) : (
                  <p className="text-muted-foreground mb-2 text-center text-sm">
                    {__(
                      'Complete your purchase with our best-selling product.',
                      'yayboost-sales-booster-for-woocommerce',
                    )}
                  </p>
                )}
                {/* Discount callout (when percent off) */}

                <p className="text-muted-foreground mb-4 text-center text-sm font-medium">
                  {pricingValue}{' '}
                  {pricingType === 'percent'
                    ? '%'
                    : pricingType === 'fixed_amount'
                      ? currencySymbol
                      : ''}{' '}
                  OFF – {__('Today only!', 'yayboost-sales-booster-for-woocommerce')}
                </p>

                {/* Product block */}
                <div className="flex gap-4 rounded-md border p-4">
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
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium">
                      {productLabel ||
                        __('Premium product', 'yayboost-sales-booster-for-woocommerce')}
                    </p>
                    <div className="flex flex-wrap items-baseline gap-2">
                      {regularPrice > 0 && previewPurchasePrice < regularPrice && (
                        <span className="text-muted-foreground text-sm line-through">
                          {currencySymbol}
                          {regularPrice.toFixed(2)}
                        </span>
                      )}
                      <span className="font-semibold">
                        {currencySymbol}
                        {previewPurchasePrice.toFixed(2)}
                      </span>
                      {pricingType === 'percent' &&
                        pricingValue > 0 &&
                        previewPurchasePrice < regularPrice && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            {__('Save', 'yayboost-sales-booster-for-woocommerce')} {pricingValue}%
                          </span>
                        )}
                    </div>
                  </div>
                </div>
                {/* Timer placeholder */}
                <p className="text-muted-foreground mt-4 flex items-center justify-center gap-1.5 text-sm">
                  <Clock className="h-3.5 w-3.5" />
                  {__('This offer expires in', 'yayboost-sales-booster-for-woocommerce')} 14:59
                </p>
                {/* CTA button */}
                <Button className="mt-4 w-full" size="lg" type="button">
                  {acceptButton || __('Add to My Order', 'yayboost-sales-booster-for-woocommerce')}
                </Button>
                {/* Decline link */}
                <p className="mt-2 text-center">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground text-sm"
                  >
                    {declineButton || __('No thanks', 'yayboost-sales-booster-for-woocommerce')}
                  </button>
                </p>
              </div>
              <div className="bg-primary/5 text-primary border-primary/20 rounded-md border p-3 text-sm">
                {__(
                  'This preview shows how your offer will appear to customers after they complete their purchase.',
                  'yayboost-sales-booster-for-woocommerce',
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Form>
  );
}
