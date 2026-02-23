import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { __ } from '@wordpress/i18n';
import { Eye } from 'lucide-react';
import z from 'zod';

import { DisplayPositionSelect, getPositionValues, PAGE_PRODUCT } from '@/lib/display-position';
import { useFeature, useUpdateFeatureSettings } from '@/hooks/use-features';
import { useProductCategories, useProducts } from '@/hooks/use-product-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
  useForm,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { InputNumber } from '@/components/ui/input-number';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
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
import { ProductPreview } from '@/components/product-preview';
import { SettingsCard } from '@/components/settings-card';
import UnavailableFeature from '@/components/unavailable-feature';

import { FeatureComponentProps } from '..';

// Allowed positions for this feature
const ALLOWED_POSITIONS = ['below_product_title', 'below_add_to_cart_button'];

const ALLOWED_COUNT_FROM = [
  'all',
  'past_week',
  'past_month',
  'this_week',
  'this_month',
  'this_year',
];

// Get valid position values for schema (includes use_block)
const validPositions = getPositionValues(PAGE_PRODUCT, ALLOWED_POSITIONS, true) as [
  string,
  ...string[],
];

// Settings schema
const settingsSchema = z.object({
  enabled: z.boolean(),
  minimum_count_display: z.number().min(0),
  count_from: z.enum(ALLOWED_COUNT_FROM as [string, ...string[]]),
  target_products: z.object({
    apply: z.enum(['all', 'specific_categories', 'specific_products']),
    categories: z.array(z.string()).optional(),
    products: z.array(z.string()).optional(),
    exclude: z.array(z.string()).optional(),
  }),
  display: z.object({
    text: z.string().min(1),
    position: z.enum(validPositions),
    show_on_product_page: z.boolean(),
    show_on_shop_page: z.boolean(),
  }),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function PurchaseActivityCountFeature({ featureId }: FeatureComponentProps) {
  const { data: feature, isLoading, isFetching } = useFeature(featureId);
  const updateSettings = useUpdateFeatureSettings();
  const [productSearch, setProductSearch] = useState('');

  const { data: categories } = useProductCategories();
  const { data: products } = useProducts(productSearch);

  const onProductSearch = (search: string) => {
    setProductSearch(search);
  };

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: feature?.settings as SettingsFormData,
  });

  const onSubmit = (data: SettingsFormData) => {
    updateSettings.mutate(
      { id: featureId, settings: data },
      {
        onSuccess: (updatedFeature) => {
          // Reset form with updated values to clear dirty state
          form.reset(updatedFeature.settings as SettingsFormData);
        },
      },
    );
  };

  const displayText = form.watch('display.text');
  const applyTo = form.watch('target_products.apply');
  const countFrom = form.watch('count_from');
  const displayPosition = form.watch('display.position');

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
      <FeatureLayoutHeader title={feature.name} description={feature.description} />
      <div className="grid gap-6 lg:grid-cols-2">
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
            <h3 className="text-sm font-medium">{__('General', 'yayboost-sales-booster-for-woocommerce')}</h3>
            <p className="text-muted-foreground text-xs">
              {__('Configure general settings for purchase activity count.', 'yayboost-sales-booster-for-woocommerce')}
            </p>
          </div>
          <FormField
            control={form.control}
            name="minimum_count_display"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="minimum-count-display">
                  {__('Minimum orders to display', 'yayboost-sales-booster-for-woocommerce')}
                </Label>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <InputNumber
                      className="w-24"
                      id="minimum-count-display"
                      placeholder={__('Minimum orders to display', 'yayboost-sales-booster-for-woocommerce')}
                      min={1}
                      onValueChange={(val) => field.onChange(val)}
                      value={field.value ?? 0}
                    />
                    <span className="text-[#6A7282]">{__('orders', 'yayboost-sales-booster-for-woocommerce')}</span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="count_from"
            render={({ field }) => (
              <FormItem>
                <Label>{__('Count from', 'yayboost-sales-booster-for-woocommerce')}</Label>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-46">
                        <SelectValue placeholder={__('Select count from', 'yayboost-sales-booster-for-woocommerce')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">{__('All time', 'yayboost-sales-booster-for-woocommerce')}</SelectItem>
                      <SelectItem value="past_week">{__('Past week', 'yayboost-sales-booster-for-woocommerce')}</SelectItem>
                      <SelectItem value="past_month">{__('Past month', 'yayboost-sales-booster-for-woocommerce')}</SelectItem>
                      <SelectItem value="this_week">{__('This week', 'yayboost-sales-booster-for-woocommerce')}</SelectItem>
                      <SelectItem value="this_month">{__('This month', 'yayboost-sales-booster-for-woocommerce')}</SelectItem>
                      <SelectItem value="this_year">{__('This year', 'yayboost-sales-booster-for-woocommerce')}</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormDescription>
                  {countFrom === 'all' && __('Count all orders since the beginning.', 'yayboost-sales-booster-for-woocommerce')}
                  {countFrom === 'past_week' &&
                    __('Count orders from the last 7 days.', 'yayboost-sales-booster-for-woocommerce')}
                  {countFrom === 'past_month' &&
                    __('Count orders from the last 30 days.', 'yayboost-sales-booster-for-woocommerce')}
                  {countFrom === 'this_week' &&
                    __('Count orders from Monday to today (resets every Monday).', 'yayboost-sales-booster-for-woocommerce')}
                  {countFrom === 'this_month' &&
                    __('Count orders from the 1st of this month (resets monthly).', 'yayboost-sales-booster-for-woocommerce')}
                  {countFrom === 'this_year' &&
                    __('Count orders from January 1st (resets yearly).', 'yayboost-sales-booster-for-woocommerce')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Separator />
          <div className="space-y-1">
            <h3 className="text-sm font-medium">{__('Display Settings', 'yayboost-sales-booster-for-woocommerce')}</h3>
            <p className="text-muted-foreground text-xs">
              {__('Configure how the purchase activity count is displayed.', 'yayboost-sales-booster-for-woocommerce')}
            </p>
          </div>
          <FormField
            control={form.control}
            name="display.text"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="display-text">{__('Display text', 'yayboost-sales-booster-for-woocommerce')}</Label>
                <FormControl>
                  <Input
                    {...field}
                    id="display-text"
                    placeholder="{count} customers bought this product"
                    className="max-w-100"
                  />
                </FormControl>
                <FormDescription>
                  {__('Use {count} as placeholder for the number of orders', 'yayboost-sales-booster-for-woocommerce')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="display.position"
            render={({ field }) => (
              <FormItem>
                <Label>{__('Display position', 'yayboost-sales-booster-for-woocommerce')}</Label>
                <FormControl>
                  <DisplayPositionSelect
                    pageType={PAGE_PRODUCT}
                    value={field.value}
                    onValueChange={field.onChange}
                    allowedPositions={ALLOWED_POSITIONS}
                    includeUseBlock
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col gap-2">
            <Label>{__('Show on', 'yayboost-sales-booster-for-woocommerce')}</Label>
            <FormField
              control={form.control}
              name="display.show_on_product_page"
              render={({ field }) => (
                <FormItem className="flex items-center">
                  <FormControl>
                    <Checkbox
                      id="show-on-product-page"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <Label htmlFor="show-on-product-page" className="text-sm font-normal">
                    {__('Product page', 'yayboost-sales-booster-for-woocommerce')}
                  </Label>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="display.show_on_shop_page"
              render={({ field }) => (
                <FormItem className="flex items-center">
                  <FormControl>
                    <Checkbox
                      id="show-on-shop-page"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <Label htmlFor="show-on-shop-page" className="text-sm font-normal">
                    {__('Shop/Category pages', 'yayboost-sales-booster-for-woocommerce')}
                  </Label>
                </FormItem>
              )}
            />
          </div>
          <Separator />
          <div className="space-y-1">
            <h3 className="text-sm font-medium">{__('Product Targeting', 'yayboost-sales-booster-for-woocommerce')}</h3>
            <p className="text-muted-foreground text-xs">
              {__('Select which products show purchase activity count', 'yayboost-sales-booster-for-woocommerce')}
            </p>
          </div>
          <FormField
            control={form.control}
            name="target_products.apply"
            render={({ field }) => (
              <FormItem>
                <Label>{__('Apply to', 'yayboost-sales-booster-for-woocommerce')}</Label>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-46">
                      <SelectValue placeholder={__('Select apply on', 'yayboost-sales-booster-for-woocommerce')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="all">{__('All Products', 'yayboost-sales-booster-for-woocommerce')}</SelectItem>
                    <SelectItem value="specific_categories">
                      {__('Specific Categories', 'yayboost-sales-booster-for-woocommerce')}
                    </SelectItem>
                    <SelectItem value="specific_products">
                      {__('Specific Products', 'yayboost-sales-booster-for-woocommerce')}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {applyTo === 'specific_categories' && (
            <FormField
              control={form.control}
              name="target_products.categories"
              render={({ field }) => (
                <FormItem>
                  <Label>{__('Specific categories', 'yayboost-sales-booster-for-woocommerce')}</Label>
                  <FormControl>
                    <MultiSelect
                      options={categories ?? []}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={`Search categories...`}
                      showSearch={true}
                      emptyText={`No categories found`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {applyTo === 'specific_products' && (
            <FormField
              control={form.control}
              name="target_products.products"
              render={({ field }) => (
                <FormItem>
                  <Label>{__('Specific products', 'yayboost-sales-booster-for-woocommerce')}</Label>
                  <FormControl>
                    <MultiSelect
                      options={products ?? []}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={`Search products...`}
                      showSearch={true}
                      onSearchChange={onProductSearch}
                      emptyText={`No products found`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {applyTo !== 'specific_products' && (
            <FormField
              control={form.control}
              name="target_products.exclude"
              render={({ field }) => (
                <FormItem>
                  <Label>{__('Exclude products', 'yayboost-sales-booster-for-woocommerce')}</Label>
                  <FormControl>
                    <MultiSelect
                      options={products ?? []}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={`Search products...`}
                      showSearch={true}
                      onSearchChange={onProductSearch}
                      emptyText={`No products found`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </SettingsCard>
        <div className="sticky top-6 h-fit space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                <CardTitle>{__('Live Preview', 'yayboost-sales-booster-for-woocommerce')}</CardTitle>
              </div>
              <CardDescription>
                {__('See how the section will look on your store', 'yayboost-sales-booster-for-woocommerce')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ProductPreview currentPosition={displayPosition}>
                <div className="yayboost-pac inline-flex items-center gap-1.5 text-sm">
                  <span> {displayText.replace('{count}', '12')}</span>
                </div>
              </ProductPreview>
            </CardContent>
          </Card>
        </div>
      </div>
    </Form>
  );
}
