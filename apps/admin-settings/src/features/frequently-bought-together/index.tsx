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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { InputNumber } from '@/components/ui/input-number';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import FeatureLayoutHeader from '@/components/feature-layout-header';
import WooCommercePlaceholder from '@/components/svgs/WooCommercePlaceholder';
import UnavailableFeature from '@/components/unavailable-feature';

import { FBTBackfillCard } from './fbt-backfill-card';

// Get currency symbol from admin data
const currencySymbol = window.yayboostData?.currencySymbol || '$';

// Mock products for preview
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
  layout: z.enum(['grid', 'list', 'slider']),
  section_title: z.string().min(1),
  hide_if_in_cart: z.enum(['hide', 'show']), // 'hide' = hide it, 'show' = still show it
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const layoutOptions = [
  { value: 'grid', label: __('Grid', 'yayboost') },
  { value: 'list', label: __('List', 'yayboost') },
  { value: 'slider', label: __('Slider', 'yayboost') },
];

// Preview component
function FBTPreview({ settings }: { settings: SettingsFormData }) {
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());

  // Calculate total price from selected products (use sale price if on sale)
  const totalPrice = useMemo(() => {
    return MOCK_PRODUCTS.filter((product) => selectedProducts.has(product.id)).reduce(
      (sum, product) => sum + (product.price || 0),
      0,
    );
  }, [selectedProducts]);

  // Limit products by max_products setting
  const displayProducts = MOCK_PRODUCTS.slice(0, settings.max_products || 4);

  const toggleProduct = (productId: number) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const formatPrice = (price: number) => {
    return `${currencySymbol}${price.toFixed(2)}`;
  };

  return (
    <div className="space-y-4">
      <h2 className="yayboost-fbt-title pb-5 text-center text-xl font-semibold">
        {settings.section_title || __('Frequently Bought Together', 'yayboost')}
      </h2>

      <div className="grid grid-cols-3 gap-5">
        {displayProducts.map((product) => {
          const isSelected = selectedProducts.has(product.id);
          return (
            <div
              key={product.id}
              className="relative space-y-2 rounded-md border border-gray-200 p-4"
            >
              {/* Product Image Placeholder */}
              <div className="relative flex justify-center">
                <WooCommercePlaceholder className="aspect-square w-full max-w-[200px]" />
              </div>

              <h1 className="pb-2 text-center text-lg font-medium">{product.name}</h1>
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />

              <button
                type="button"
                className="button w-full bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
              >
                {__('Add to cart', 'yayboost')}
              </button>

              <label className="mt-6 flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleProduct(product.id)}
                  className="h-4 w-4"
                />
                <span className="text-sm">{product.name}</span>
              </label>
            </div>
          );
        })}
      </div>

      {/* Footer with Total and Button */}
      <div className="yayboost-fbt-footer mt-6 flex items-center justify-between border-t pt-4">
        <div className="yayboost-fbt-total text-lg font-semibold">
          {__('Total:', 'yayboost')}{' '}
          <span className="yayboost-fbt-total-price text-[#0073aa]">{formatPrice(totalPrice)}</span>
        </div>
        <button
          type="button"
          className="button yayboost-fbt-batch-add px-6 py-3 text-base disabled:cursor-not-allowed disabled:opacity-60"
          disabled={selectedProducts.size === 0}
        >
          {__('Add Selected to Cart', 'yayboost')}
        </button>
      </div>
    </div>
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
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Settings Form */}
          <div className="space-y-6">
            {/* General Section */}
            <Card>
              <CardHeader>
                <CardTitle>{__('General', 'yayboost')}</CardTitle>
                <CardDescription>
                  {__('Enable or disable the Frequently Bought Together feature', 'yayboost')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{__('Enable Frequently Bought Together', 'yayboost')}</FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value ? 'on' : 'off'}
                          onValueChange={(value) => field.onChange(value === 'on')}
                          className="flex gap-6"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="on" id="enabled-on" />
                            <label htmlFor="enabled-on" className="cursor-pointer">
                              {__('On', 'yayboost')}
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="off" id="enabled-off" />
                            <label htmlFor="enabled-off" className="cursor-pointer">
                              {__('Off', 'yayboost')}
                            </label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Recommend Products Section */}
            <Card>
              <CardHeader>
                <CardTitle>{__('Recommend products', 'yayboost')}</CardTitle>
                <CardDescription>
                  {__('Configure product recommendation settings', 'yayboost')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="max_products"
                  render={({ field }) => (
                    <FormItem className="w-60">
                      <FormLabel>{__('Maximum products to show', 'yayboost')}</FormLabel>
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
                      <FormLabel>{__('Minimum Order Threshold', 'yayboost')}</FormLabel>
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
              </CardContent>
            </Card>

            {/* Display Settings Section */}
            <Card>
              <CardHeader>
                <CardTitle>{__('Display Settings', 'yayboost')}</CardTitle>
                <CardDescription>
                  {__(
                    'Configure where and how to display frequently bought together products',
                    'yayboost',
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="layout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{__('Layout', 'yayboost')}</FormLabel>
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
                      <FormLabel>{__('Section title', 'yayboost')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={__('Frequently Bought Together', 'yayboost')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Behavior Section */}
            <Card>
              <CardHeader>
                <CardTitle>{__('Behavior', 'yayboost')}</CardTitle>
                <CardDescription>
                  {__(
                    'Configure how to handle suggested products that are already in cart',
                    'yayboost',
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="hide_if_in_cart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {__('If suggested product is already in cart:', 'yayboost')}
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="flex gap-6"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="hide" id="hide-if-in-cart" />
                            <label htmlFor="hide-if-in-cart" className="cursor-pointer">
                              {__('Hide it', 'yayboost')}
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="show" id="show-if-in-cart" />
                            <label htmlFor="show-if-in-cart" className="cursor-pointer">
                              {__('Still show it', 'yayboost')}
                            </label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Backfill Section */}
            <FBTBackfillCard />

            {/* Save Button - Bottom Right */}
            <div className="flex justify-end">
              <Button type="submit" disabled={updateSettings.isPending || !isDirty}>
                {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
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
      </form>
    </Form>
  );
}
