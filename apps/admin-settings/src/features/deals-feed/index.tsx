/**
 * Deals Feed Feature Settings
 *
 * Configure deal sources, filters, layout, and display options.
 * General tab includes live preview with sample data.
 */

import { useMemo, useState } from 'react';
import { FeatureComponentProps } from '@/features';
import { zodResolver } from '@hookform/resolvers/zod';
import { __ } from '@wordpress/i18n';
import { Eye } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useFeature, useUpdateFeatureSettings } from '@/hooks/use-features';
import { useProducts } from '@/hooks/use-product-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FeatureLayoutHeader from '@/components/feature-layout-header';
import { SettingsCard } from '@/components/settings-card';
import UnavailableFeature from '@/components/unavailable-feature';

const currencySymbol = window.yayboostData?.currencySymbol || '$';

// Settings schema
const settingsSchema = z.object({
  enabled: z.boolean(),
  display_pages: z.enum(['woocommerce_pages', 'shop_page', 'custom']),
  feed_title: z.string(),
  layout: z.enum(['grid', 'list', 'reel_story', 'floating_slider']),
  enabled_sources: z.array(z.string()),
  minimum_discount: z.string().optional(),
  stock_status: z.object({
    in_stock: z.boolean(),
    out_stock: z.boolean(),
    backorder: z.boolean(),
  }),
  expired_deals: z.enum(['hide', 'show_grayed_24h']),
  product_targeting: z.object({
    apply_to: z.enum(['all_products', 'specific_categories']),
    exclude_products: z.array(z.string()),
  }),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

// Sample deal data for preview
const SAMPLE_DEALS = [
  { id: '1', name: 'Wireless Headphones', price: 99, salePrice: 69, discount: 30 },
  { id: '2', name: 'Smart Watch', price: 199, salePrice: 149, discount: 25 },
  { id: '3', name: 'Portable Speaker', price: 79, salePrice: 55, discount: 30 },
  { id: '4', name: 'USB-C Hub', price: 49, salePrice: 35, discount: 29 },
  { id: '5', name: 'Mechanical Keyboard', price: 129, salePrice: 89, discount: 31 },
  { id: '6', name: 'Wireless Mouse', price: 59, salePrice: 39, discount: 34 },
];

// Sample deal sources
const DEAL_SOURCES = [
  {
    id: 'woocommerce_sale',
    title: 'WooCommerce Sale Products',
    description: 'Products with sale_price',
    status: 'Found: 12 products on sale',
    disabled: false,
  },
  {
    id: 'woocommerce_coupon',
    title: 'WooCommerce coupon',
    description: 'Products with sale_price',
    status: 'Found: 12 products on sale',
    disabled: false,
  },
  {
    id: 'yaypricing',
    title: 'YayPricing',
    description: 'Plugin not installed',
    status: 'Plugin not installed',
    disabled: true,
  },
  {
    id: 'yith_dynamic_pricing',
    title: 'YITH WooCommerce Dynamic Pricing',
    description: 'Bulk discounts & pricing rules',
    status: 'Found: 5 active rules',
    disabled: false,
  },
];

// Deal card for preview
function DealCard({ deal }: { deal: (typeof SAMPLE_DEALS)[number] }) {
  return (
    <div className="bg-card flex flex-col overflow-hidden rounded-lg border">
      <div className="bg-muted text-muted-foreground flex aspect-square items-center justify-center p-4 text-xs">
        product
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="line-clamp-2 text-sm font-medium">{deal.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-primary text-sm font-semibold">
            {currencySymbol}
            {deal.salePrice}
          </span>
          <span className="text-muted-foreground text-xs line-through">
            {currencySymbol}
            {deal.price}
          </span>
          <span className="bg-destructive/10 text-destructive rounded px-1.5 py-0.5 text-xs font-medium">
            -{deal.discount}%
          </span>
        </div>
      </div>
    </div>
  );
}

// Preview component - renders based on layout
function DealsFeedPreview({ settings }: { settings: SettingsFormData }) {
  const layout = settings.layout;
  const title = settings.feed_title || "Today's Best Deal";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          <CardTitle>{__('Live Preview', 'yayboost')}</CardTitle>
        </div>
        <CardDescription>
          {__('See how the deals feed will look on your store', 'yayboost')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm font-semibold">{title}</div>
        <div
          className={
            layout === 'grid'
              ? 'grid grid-cols-2 gap-3'
              : layout === 'list'
                ? 'flex flex-col gap-2'
                : layout === 'reel_story'
                  ? 'flex gap-3 overflow-x-auto pb-2'
                  : 'flex gap-3 overflow-x-auto pb-2'
          }
        >
          {SAMPLE_DEALS.map((deal) =>
            layout === 'list' ? (
              <div key={deal.id} className="bg-card flex items-center gap-3 rounded-lg border p-3">
                <div className="bg-muted h-14 w-14 shrink-0 rounded" />
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium">{deal.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-primary text-sm font-semibold">
                      {currencySymbol}
                      {deal.salePrice}
                    </span>
                    <span className="text-muted-foreground text-xs line-through">
                      {currencySymbol}
                      {deal.price}
                    </span>
                    <span className="bg-destructive/10 text-destructive rounded px-1.5 py-0.5 text-xs">
                      -{deal.discount}%
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div key={deal.id} className={layout === 'grid' ? '' : 'min-w-[140px] shrink-0'}>
                <DealCard deal={deal} />
              </div>
            ),
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Default form values for when feature is not yet loaded
const defaultFormValues: SettingsFormData = {
  enabled: false,
  display_pages: 'woocommerce_pages',
  feed_title: "Today's Best Deal",
  layout: 'grid',
  enabled_sources: [],
  minimum_discount: '10%',
  stock_status: {
    in_stock: true,
    out_stock: true,
    backorder: true,
  },
  expired_deals: 'show_grayed_24h',
  product_targeting: {
    apply_to: 'all_products',
    exclude_products: [],
  },
};

export default function DealsFeedFeature({ featureId }: FeatureComponentProps) {
  const { data: feature, isLoading, isFetching } = useFeature(featureId);
  const updateSettings = useUpdateFeatureSettings();
  const [excludeProductsSearch, setExcludeProductsSearch] = useState('');
  const { data: excludeProducts } = useProducts(excludeProductsSearch);

  const mergedDefaults = useMemo(() => {
    if (!feature?.settings) return defaultFormValues;
    const s = feature.settings as Record<string, unknown>;
    return {
      ...defaultFormValues,
      ...s,
      stock_status: {
        ...defaultFormValues.stock_status,
        ...((s.stock_status as Record<string, boolean>) || {}),
      },
      product_targeting: {
        ...defaultFormValues.product_targeting,
        ...((s.product_targeting as Record<string, unknown>) || {}),
      },
    } as SettingsFormData;
  }, [feature?.settings]);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: mergedDefaults,
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

  const watchedValues = form.watch();

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
      <FeatureLayoutHeader
        title={feature.name}
        description={feature.description}
        goBackRoute="/features"
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <SettingsCard
            headless
            title=""
            onSave={() => form.handleSubmit(onSubmit)()}
            isDirty={form.formState.isDirty}
            isSaving={updateSettings.isPending}
            isLoading={false}
            onReset={() => form.reset(feature.settings as SettingsFormData)}
          >
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="general">{__('General', 'yayboost')}</TabsTrigger>
                <TabsTrigger value="deal_sources">{__('Deal Sources', 'yayboost')}</TabsTrigger>
                <TabsTrigger value="filters">{__('Filters', 'yayboost')}</TabsTrigger>
                <TabsTrigger value="shortcodes">{__('Shortcodes', 'yayboost')}</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-6">
                <FormField
                  control={form.control}
                  name="display_pages"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{__('Display pages', 'yayboost')}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={__('Select pages', 'yayboost')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="woocommerce_pages">
                            {__('WooCommerce pages', 'yayboost')}
                          </SelectItem>
                          <SelectItem value="shop_page">
                            {__('Shop page only', 'yayboost')}
                          </SelectItem>
                          <SelectItem value="custom">{__('Custom', 'yayboost')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="feed_title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{__('Feed title', 'yayboost')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Today's Best Deal" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="layout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{__('Layout', 'yayboost')}</FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="flex flex-col gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="grid" id="layout-grid" />
                            <Label htmlFor="layout-grid">{__('Grid', 'yayboost')}</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="list" id="layout-list" />
                            <Label htmlFor="layout-list">{__('List', 'yayboost')}</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="reel_story" id="layout-reel" />
                            <Label htmlFor="layout-reel">{__('Reel/Story', 'yayboost')}</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="floating_slider" id="layout-slider" />
                            <Label htmlFor="layout-slider">
                              {__('Floating Slider', 'yayboost')}
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="deal_sources" className="space-y-4">
                <p className="text-muted-foreground mb-2 text-sm">
                  {__('Select which sources to include in the deals feed', 'yayboost')}
                </p>
                <FormField
                  control={form.control}
                  name="enabled_sources"
                  render={({ field }) => (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {DEAL_SOURCES.map((source) => {
                        const isChecked = field.value.includes(source.id);
                        return (
                          <Card
                            key={source.id}
                            className={`cursor-pointer py-4 transition-colors ${
                              isChecked ? 'border-primary' : ''
                            } ${source.disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                            onClick={() =>
                              !source.disabled &&
                              field.onChange(
                                isChecked
                                  ? field.value.filter((v) => v !== source.id)
                                  : [...field.value, source.id],
                              )
                            }
                          >
                            <CardContent className="flex items-start justify-between gap-4 px-4">
                              <div className="min-w-0 flex-1">
                                <div className="font-medium">{source.title}</div>
                                <div className="text-muted-foreground text-sm">
                                  {source.description}
                                </div>
                                <div className="text-muted-foreground mt-1 text-xs">
                                  {source.status}
                                </div>
                              </div>
                              <Checkbox
                                checked={isChecked}
                                disabled={source.disabled}
                                onCheckedChange={(checked) =>
                                  !source.disabled &&
                                  field.onChange(
                                    checked
                                      ? [...field.value, source.id]
                                      : field.value.filter((v) => v !== source.id),
                                  )
                                }
                                onClick={(e) => e.stopPropagation()}
                              />
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                />
              </TabsContent>

              <TabsContent value="filters" className="space-y-6">
                <FormField
                  control={form.control}
                  name="minimum_discount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{__('Minimum Discount', 'yayboost')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="10%" />
                      </FormControl>
                      <FormDescription>
                        {__('Only show deals with at least this discount', 'yayboost')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <FormLabel className="mb-2">{__('Stock status', 'yayboost')}</FormLabel>
                  <div className="flex flex-col gap-2">
                    <FormField
                      control={form.control}
                      name="stock_status.in_stock"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-y-0 space-x-3">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {__('Show in-stock products', 'yayboost')}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="stock_status.out_stock"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-y-0 space-x-3">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {__('Show out-stock products', 'yayboost')}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="stock_status.backorder"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-y-0 space-x-3">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {__('Show backorder products', 'yayboost')}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="expired_deals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{__('Expired deals', 'yayboost')}</FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="flex flex-col gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="hide" id="expired-hide" />
                            <Label htmlFor="expired-hide">
                              {__('Hide expired deals', 'yayboost')}
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="show_grayed_24h" id="expired-show" />
                            <Label htmlFor="expired-show">
                              {__('Show (grayed out) for 24 hours', 'yayboost')}
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <FormLabel>{__('Product Targeting', 'yayboost')}</FormLabel>
                  <FormDescription className="mb-2">
                    {__('Select which products show stock scarcity', 'yayboost')}
                  </FormDescription>
                  <FormField
                    control={form.control}
                    name="product_targeting.apply_to"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel className="text-sm">{__('Apply to', 'yayboost')}</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="flex flex-col gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="all_products" id="apply-all" />
                              <Label htmlFor="apply-all">{__('All products', 'yayboost')}</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="specific_categories" id="apply-categories" />
                              <Label htmlFor="apply-categories">
                                {__('Specific categories', 'yayboost')}
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
                    name="product_targeting.exclude_products"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">
                          {__('Exclude products', 'yayboost')}
                        </FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={excludeProducts ?? []}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={__('Search products...', 'yayboost')}
                            showSearch
                            onSearchChange={setExcludeProductsSearch}
                            emptyText={__('No products found', 'yayboost')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="shortcodes" className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  {__(
                    'Use this shortcode to display the deals feed anywhere on your site',
                    'yayboost',
                  )}
                </p>
                <div className="bg-muted/50 rounded-md border p-4 font-mono text-sm">
                  [yayboost_deals_feed]
                </div>
              </TabsContent>
            </Tabs>
          </SettingsCard>
        </div>

        {/* Preview - only for General tab, show when general is active */}
        <div className="sticky top-6 hidden lg:block">
          <DealsFeedPreview settings={watchedValues} />
        </div>
      </div>
    </Form>
  );
}
