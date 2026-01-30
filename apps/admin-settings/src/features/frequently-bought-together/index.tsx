/**
 * Frequently Bought Together Feature Settings
 *
 * Settings form for Frequently Bought Together feature.
 */
import { useMemo, useState } from 'react';
import { FeatureComponentProps } from '@/features';
import { zodResolver } from '@hookform/resolvers/zod';
import { __ } from '@wordpress/i18n';
import { Eye } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useFeature, useUpdateFeatureSettings } from '@/hooks/use-features';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
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
import FeatureLayoutHeader from '@/components/feature-layout-header';
import { SettingsCard } from '@/components/settings-card';
import UnavailableFeature from '@/components/unavailable-feature';

import { FBTBackfillCard } from './fbt-backfill-card';

// Get currency symbol from admin data
const currencySymbol = window.yayboostData?.currencySymbol || '$';

// Mock products for preview (first = main product "This item", rest = recommendations)
const MOCK_PRODUCTS = [
  { id: 1, name: 'Product A', price: 18 },
  { id: 2, name: 'Product B', price: 16 },
  { id: 3, name: 'Product C', price: 55 },
];

// Settings schema
const settingsSchema = z.object({
  enabled: z.boolean(),
  max_products: z.number().min(1).max(20),
  min_order_threshold: z.number().min(0).max(100), // percentage
  layout: z.enum(['grid', 'list']),
  section_title: z.string().min(1),
  hide_if_in_cart: z.enum(['hide', 'show']), // 'hide' = hide it, 'show' = still show it
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const layoutOptions = [
  { value: 'grid', label: __('Grid', 'yayboost') },
  { value: 'list', label: __('List', 'yayboost') },
];

// SVG checkmark for circle checkbox (matches frontend fbt-products.php)
const FBT_CHECK_ICON = (
  <svg
    className="fbt-checkbox__icon w-[10px] h-[10px] text-white"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={3}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// Preview component - matches frontend template (fbt-products.php + fbt.css): images row + summary, then list
function FBTPreview({ settings }: { settings: SettingsFormData }) {
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(
    new Set(MOCK_PRODUCTS.map((p) => p.id)),
  );

  const totalPrice = useMemo(() => {
    return MOCK_PRODUCTS.filter((p) => selectedProducts.has(p.id)).reduce(
      (sum, p) => sum + (p.price || 0),
      0,
    );
  }, [selectedProducts]);

  const displayProducts = MOCK_PRODUCTS.slice(0, settings.max_products || 4);
  const selectedCount = displayProducts.filter((p) => selectedProducts.has(p.id)).length;

  const toggleProduct = (productId: number) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const formatPrice = (price: number) => `${currencySymbol}${price.toFixed(2)}`;

  const addButtonText =
    selectedCount === 0
      ? __('Add all to basket', 'yayboost')
      : __('Add all', 'yayboost') + ` ${selectedCount} ` + __('to basket', 'yayboost');

  return (
    <section className="yayboost-fbt fbt-section font-sans py-8 border-t border-gray-200 max-w-full">
      <h2 className="yayboost-fbt__title fbt-section__title text-[15px] font-semibold text-black mb-6 tracking-tight">
        {settings.section_title || __('Frequently Bought Together', 'yayboost')}
      </h2>

      {/* Product images row + summary (matches fbt-products.php) */}
      <div className="fbt-products yayboost-fbt__products flex items-center gap-3 mb-6">
        {displayProducts.map((product, index) => (
          <span key={product.id} className="flex items-center gap-3">
            {index > 0 && (
              <span className="fbt-plus text-gray-400 text-lg font-light">
                +
              </span>
            )}
            <div className="fbt-product-image w-[100px] h-[100px] bg-gray-100 rounded-lg overflow-hidden shrink-0">
              <img
                src={window.yayboostData?.urls?.wcPlaceholderImage}
                alt={product.name}
                className="w-full h-full object-contain"
              />
            </div>
          </span>
        ))}
        <div className="fbt-summary ml-auto text-right">
          <p className="fbt-summary__total text-[13px] text-gray-600 mb-1">
            {__('Total price', 'yayboost')}
          </p>
          <p className="fbt-summary__price yayboost-fbt__total-price text-[22px] font-semibold text-black mb-4 tracking-tight">
            {formatPrice(totalPrice)}
          </p>
          <button
            type="button"
            className={`yayboost-fbt__add-btn fbt-add-btn inline-flex items-center justify-center h-11 px-6 text-sm font-medium text-white bg-black border-none rounded-lg cursor-pointer transition-opacity ${
              selectedCount === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-85 active:opacity-70'
            }`}
            disabled={selectedCount === 0}
          >
            {addButtonText}
          </button>
        </div>
      </div>

      {/* Product list with checkboxes (matches fbt-list / fbt-item) */}
      <div className="fbt-list flex flex-col gap-0">
        {displayProducts.map((product, index) => {
          const isFirst = index === 0;
          const isSelected = selectedProducts.has(product.id);
          return (
            <label
              key={product.id}
              htmlFor={`fbt-preview-${product.id}`}
              className={`yayboost-fbt__product fbt-item flex items-start gap-3 py-4 border-b border-gray-200 cursor-pointer transition-colors hover:bg-gray-100 hover:mx-[-16px] hover:px-4 ${
                index === 0 ? 'border-t border-gray-200' : ''
              }`}
            >
              <div className="fbt-checkbox relative w-5 h-5 shrink-0 mt-px">
                <input
                  type="checkbox"
                  id={`fbt-preview-${product.id}`}
                  checked={isSelected}
                  onChange={() => toggleProduct(product.id)}
                  className="absolute w-full h-full opacity-0 cursor-pointer m-0"
                />
                <span
                  className={`fbt-checkbox__box w-5 h-5 border-[1.5px] rounded-full flex items-center justify-center box-border transition-all ${
                    isSelected
                      ? 'bg-black border-black'
                      : 'border-gray-400'
                  }`}
                >
                  {isSelected && FBT_CHECK_ICON}
                </span>
              </div>
              <div className="fbt-item__content flex-1 min-w-0">
                <p className="fbt-item__name text-sm font-normal text-black mb-1 leading-[1.4]">
                  {isFirst && (
                    <span className="fbt-item__badge text-xs font-medium text-gray-600 mr-1.5">
                      {__('This item:', 'yayboost')}
                    </span>
                  )}
                  <span>{product.name}</span>
                </p>
                <span className="fbt-item__price text-sm font-medium text-black">
                  {formatPrice(product.price)}
                </span>
              </div>
            </label>
          );
        })}
      </div>
    </section>
  );
}

export default function FrequentlyBoughtTogetherFeature({ featureId }: FeatureComponentProps) {
  const { data: feature, isLoading, isFetching } = useFeature(featureId);
  const updateSettings = useUpdateFeatureSettings();

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: feature?.settings as SettingsFormData,
  });

  const { isDirty } = form.formState;

  const watchedValues = form.watch();

  const onSubmit = (data: SettingsFormData) => {
    updateSettings.mutate(
      { id: featureId, settings: data },
      {
        onSuccess: () => {
          form.reset(data);
        },
      },
    );
  };

  if (isLoading || isFetching) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!feature?.settings) {
    return <UnavailableFeature />;
  }

  return (
    <Form {...form}>
      <FeatureLayoutHeader title={feature?.name ?? ''} description={feature?.description ?? ''} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <SettingsCard
            headless
            title="Configure Frequently Bought Together"
            onSave={() => {
              form.handleSubmit(onSubmit)();
            }}
            isDirty={form.formState.isDirty}
            isSaving={updateSettings.isPending}
            isLoading={isLoading}
            onReset={() => {
              form.reset(feature?.settings as SettingsFormData);
            }}
          >
            <div className="space-y-1">
              <h3 className="text-sm font-medium">{__('Recommend products', 'yayboost')}</h3>
              <p className="text-muted-foreground text-xs">
                {__('Configure product recommendation settings', 'yayboost')}
              </p>
            </div>
            <FormField
              control={form.control}
              name="max_products"
              render={({ field }) => (
                <FormItem className="w-60">
                  <Label>{__('Maximum products to show', 'yayboost')}</Label>
                  <FormControl>
                    <InputNumber
                      value={field.value}
                      onValueChange={field.onChange}
                      min={1}
                      max={20}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="min_order_threshold"
              render={({ field }) => (
                <FormItem className="w-60">
                  <Label>{__('Minimum Order Threshold', 'yayboost')}</Label>
                  <FormControl>
                    <InputNumber
                      value={field.value}
                      onValueChange={field.onChange}
                      min={0}
                      max={100}
                    />
                  </FormControl>
                  <FormDescription>
                    {__('Recommend products appear in at least', 'yayboost')}{' '}
                    <strong>{field.value}%</strong> {__('of orders', 'yayboost')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />
            <div className="space-y-1">
              <h3 className="text-sm font-medium">{__('Display Settings', 'yayboost')}</h3>
              <p className="text-muted-foreground text-xs">
                {__(
                  'Configure where and how to display frequently bought together products',
                  'yayboost',
                )}
              </p>
            </div>
            <FormField
              control={form.control}
              name="layout"
              render={({ field }) => (
                <FormItem>
                  <Label>{__('Layout', 'yayboost')}</Label>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={__('Select layout', 'yayboost')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {layoutOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="section_title"
              render={({ field }) => (
                <FormItem className="w-60">
                  <Label>{__('Section title', 'yayboost')}</Label>
                  <FormControl>
                    <Input {...field} placeholder={__('Frequently Bought Together', 'yayboost')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />
            <div className="space-y-1">
              <h3 className="text-sm font-medium">{__('Behavior', 'yayboost')}</h3>
              <p className="text-muted-foreground text-xs">
                {__(
                  'Configure how to handle suggested products that are already in cart',
                  'yayboost',
                )}
              </p>
            </div>
            <FormField
              control={form.control}
              name="hide_if_in_cart"
              render={({ field }) => (
                <FormItem>
                  <Label>{__('If suggested product is already in cart:', 'yayboost')}</Label>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex gap-6"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="hide" id="hide-if-in-cart" />
                        <label htmlFor="hide-if-in-cart">{__('Hide it', 'yayboost')}</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="show" id="show-if-in-cart" />
                        <label htmlFor="show-if-in-cart">{__('Still show it', 'yayboost')}</label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SettingsCard>
          <FBTBackfillCard />
        </div>
        {/* Preview Panel */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                <CardTitle>{__('Live Preview', 'yayboost')}</CardTitle>
              </div>
              <CardDescription>
                {__('See how the section will look on your store', 'yayboost')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FBTPreview settings={watchedValues} />
            </CardContent>
          </Card>
        </div>
      </div>
    </Form>
  );
}
