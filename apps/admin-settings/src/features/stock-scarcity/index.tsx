import { useMemo, useState } from 'react';
import { useFeature, useUpdateFeatureSettings } from '@/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

import { DisplayPositionSelect, getPositionValues, PAGE_PRODUCT } from '@/lib/display-position';
import { __ } from '@/lib/utils';
import { useProductCategories, useProducts } from '@/hooks/use-product-data';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ColorPicker } from '@/components/ui/color-picker';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import FeatureLayoutHeader from '@/components/feature-layout-header';
import { ProductPreview } from '@/components/product-preview';
import { SettingsCard } from '@/components/settings-card';

import { FeatureComponentProps } from '..';

// Allowed positions for this feature on product page
const ALLOWED_PRODUCT_POSITIONS = [
  'below_product_title',
  'below_short_description',
  'below_add_to_cart_button',
];

// Get valid position values for schema
const validProductPositions = getPositionValues(PAGE_PRODUCT, ALLOWED_PRODUCT_POSITIONS) as [
  string,
  ...string[],
];

// Settings schema
const settingsSchema = z.object({
  enabled: z.boolean(),
  low_stock_threshold: z.number().min(0),
  show_alert_text: z.boolean(),
  show_progress_bar: z.boolean(),
  default_message: z.string().optional(),
  urgent_threshold: z.number().min(0),
  urgent_message: z.string().optional(),
  fixed_stock_number: z
    .object({
      is_enabled: z.boolean(),
      number: z.number().min(0),
    })
    .optional(),
  fill_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  background_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  position_on_product_page: z.enum(validProductPositions),
  show_on: z.array(z.string()),
  apply_to: z.enum(['all_products', 'specific_categories', 'specific_products']),
  specific_categories: z.array(z.string()),
  specific_products: z.array(z.string()),
  exclude_products: z.array(z.string()),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const GeneralSection = ({ form }: { form: UseFormReturn<SettingsFormData> }) => {
  return (
    <>
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{__('General', 'yayboost')}</h3>
        <p className="text-muted-foreground text-xs">
          {__('Configure general settings for stock scarcity', 'yayboost')}
        </p>
      </div>
      <FormField
        control={form.control}
        name="low_stock_threshold"
        render={({ field }) => (
          <FormItem>
            <Label className="text-sm" htmlFor="low-stock-threshold">
              Show when stock is at or below
            </Label>
            <div className="flex w-fit items-center gap-2">
              <FormControl>
                <InputNumber
                  id="low-stock-threshold"
                  {...field}
                  min={1}
                  onValueChange={(value) => field.onChange(value || 1)}
                  className="w-24"
                />
              </FormControl>
              <span className="text-[#6A7282]">items</span>
            </div>
          </FormItem>
        )}
      />
    </>
  );
};

const DisplaySection = ({ form }: { form: UseFormReturn<SettingsFormData> }) => {
  return (
    <>
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{__('Display', 'yayboost')}</h3>
        <p className="text-muted-foreground text-xs">
          {__('Configure display settings for stock scarcity', 'yayboost')}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <FormField
          control={form.control}
          name="show_alert_text"
          render={({ field }) => (
            <FormItem className="flex items-center">
              <FormControl>
                <Checkbox
                  id="show-alert-text"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <Label htmlFor="show-alert-text" className="text-sm font-normal">
                Show alert text
              </Label>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="show_progress_bar"
          render={({ field }) => (
            <FormItem className="flex items-center">
              <FormControl>
                <Checkbox
                  id="show-progress-bar"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <Label htmlFor="show-progress-bar" className="text-sm font-normal">
                Show progress bar
              </Label>
            </FormItem>
          )}
        />
      </div>
    </>
  );
};

const AlertTextSection = ({ form }: { form: UseFormReturn<SettingsFormData> }) => {
  return (
    <>
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{__('Alert Text', 'yayboost')}</h3>
        <p className="text-muted-foreground text-xs">
          {__('Configure alert text for stock scarcity', 'yayboost')}
        </p>
      </div>
      <FormField
        control={form.control}
        name="default_message"
        render={({ field }) => (
          <FormItem>
            <Label className="text-sm" htmlFor="default-message">
              Default message
            </Label>
            <FormControl>
              <Input id="default-message" placeholder="🔥 Only {stock} left in stock!" {...field} />
            </FormControl>
            <FormDescription className="text-sm">
              Use {'{stock}'} to display the current stock count
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="urgent_threshold"
        render={({ field }) => (
          <FormItem>
            <Label className="text-sm" htmlFor="urgent-threshold">
              Urgent threshold
            </Label>
            <div className="flex items-center gap-2">
              <FormControl>
                <InputNumber
                  id="urgent-threshold"
                  {...field}
                  min={1}
                  onValueChange={(value) => field.onChange(value || 1)}
                  className="w-24"
                />
              </FormControl>
              <span className="text-sm text-[#6A7282]">items or below</span>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="urgent_message"
        render={({ field }) => (
          <FormItem>
            <Label className="text-sm" htmlFor="urgent-message">
              Urgent message
            </Label>
            <FormControl>
              <Input id="urgent-message" placeholder="⚠️ Hurry! Only {stock} left!" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};

const ProgressBarSection = ({ form }: { form: UseFormReturn<SettingsFormData> }) => {
  const fixedNumber = form.watch('fixed_stock_number');

  return (
    <>
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{__('Progress Bar', 'yayboost')}</h3>
        <p className="text-muted-foreground text-xs">
          {__('Configure progress bar settings for stock scarcity', 'yayboost')}
        </p>
      </div>
      <FormField
        control={form.control}
        name="fill_color"
        render={({ field }) => (
          <FormItem>
            <Label>Fill color</Label>
            <ColorPicker value={field.value} onChangeColor={field.onChange} />
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="background_color"
        render={({ field }) => (
          <FormItem>
            <Label>Background</Label>
            <ColorPicker value={field.value} onChangeColor={field.onChange} />
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="fixed_stock_number.is_enabled"
        render={({ field }) => (
          <FormItem className="flex flex-col gap-2">
            <FormControl>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="calculate-percentage-from-fixed-number"
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                    }}
                  />
                  <Label htmlFor="calculate-percentage-from-fixed-number">
                    Calculate percentage from "fixed number"
                  </Label>
                </div>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {fixedNumber?.is_enabled && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <FormField
              control={form.control}
              name="fixed_stock_number.number"
              render={({ field }) => (
                <FormItem className="m-0">
                  <FormControl>
                    <InputNumber
                      {...field}
                      min={1}
                      onValueChange={(value) => field.onChange(value || 1)}
                      className="w-24"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <span>items</span>
          </div>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p>How fixed number works</p>
              <p>
                If you set {fixedNumber?.number} items and current stock is 8, the progress bar will
                show {(100 - (8 / Math.max(fixedNumber?.number || 0, 1)) * 100).toFixed(0)}% sold (
                {fixedNumber?.number - 8} of {fixedNumber?.number}).
              </p>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </>
  );
};

const DisplayLocationSection = ({ form }: { form: UseFormReturn<SettingsFormData> }) => {
  return (
    <>
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{__('Display Location', 'yayboost')}</h3>
        <p className="text-muted-foreground text-xs">
          {__('Configure display location for stock scarcity', 'yayboost')}
        </p>
      </div>
      <FormField
        control={form.control}
        name="position_on_product_page"
        render={({ field }) => (
          <FormItem>
            <Label>Position on product page</Label>
            <FormControl>
              <DisplayPositionSelect
                pageType={PAGE_PRODUCT}
                value={field.value}
                onValueChange={field.onChange}
                allowedPositions={ALLOWED_PRODUCT_POSITIONS}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="show_on"
        render={({ field }) => (
          <FormItem className="flex flex-col gap-2">
            <Label className="font-medium">Show on</Label>
            <FormControl>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="product-page"
                    checked={field.value?.includes('product_page')}
                    onCheckedChange={(checked) => {
                      const currentValue = field.value || [];
                      if (checked) {
                        field.onChange([...currentValue, 'product_page']);
                      } else {
                        field.onChange(currentValue.filter((v) => v !== 'product_page'));
                      }
                    }}
                  />
                  <Label htmlFor="product-page">Product page</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="shop-category-pages"
                    checked={field.value?.includes('shop_category_pages')}
                    onCheckedChange={(checked) => {
                      const currentValue = field.value || [];
                      if (checked) {
                        field.onChange([...currentValue, 'shop_category_pages']);
                      } else {
                        field.onChange(currentValue.filter((v) => v !== 'shop_category_pages'));
                      }
                    }}
                  />
                  <Label htmlFor="shop-category-pages">Shop / Category pages</Label>
                </div>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};

const ProductTargetingSection = ({ form }: { form: UseFormReturn<SettingsFormData> }) => {
  const [selectProductsSearch, setSelectProductsSearch] = useState('');
  const [excludeProductsSearch, setExcludeProductsSearch] = useState('');

  const { data: categories } = useProductCategories();
  const { data: selectProducts } = useProducts(selectProductsSearch);
  const { data: excludeProducts } = useProducts(excludeProductsSearch);

  const onSelectProductsSearch = (search: string) => {
    setSelectProductsSearch(search);
  };

  const onExcludeProductsSearch = (search: string) => {
    setExcludeProductsSearch(search);
  };

  const applyTo = form.watch('apply_to');
  const isCategories = applyTo === 'specific_categories';
  const isProducts = applyTo === 'specific_products';

  return (
    <>
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{__('Product Targeting', 'yayboost')}</h3>
        <p className="text-muted-foreground text-xs">
          {__('Configure product targeting for stock scarcity', 'yayboost')}
        </p>
      </div>
      <FormField
        control={form.control}
        name="apply_to"
        render={({ field }) => (
          <FormItem>
            <Label className="font-medium">Apply to</Label>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="all_products" id="all-products" />
                  <Label htmlFor="all-products">All products</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="specific_categories" id="specific-categories" />
                  <Label htmlFor="specific-categories">Specific categories</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="specific_products" id="specific-products" />
                  <Label htmlFor="specific-products">Specific products</Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* MultiSelect cho categories/products */}
      {isCategories && (
        <FormField
          control={form.control}
          name={'specific_categories'}
          render={({ field }) => (
            <FormItem>
              <Label>Select categories</Label>
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

      {isProducts && (
        <FormField
          control={form.control}
          name={'specific_products'}
          render={({ field }) => (
            <FormItem>
              <Label>Select products</Label>
              <FormControl>
                <MultiSelect
                  options={selectProducts ?? []}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={`Search products...`}
                  showSearch={true}
                  onSearchChange={onSelectProductsSearch}
                  emptyText={`No products found`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {!isProducts && (
        <FormField
          control={form.control}
          name="exclude_products"
          render={({ field }) => (
            <FormItem>
              <Label className="font-medium">Exclude products</Label>
              <FormControl>
                <MultiSelect
                  key={'exclude_products'}
                  options={excludeProducts ?? []}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={`Search products...`}
                  onSearchChange={onExcludeProductsSearch}
                  showSearch={true}
                  emptyText={`No products found`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
};

const SAMPLE_STOCK_LEFT = 8;
const SAMPLE_MAX_STOCK = 50;

const PreviewSection = ({ form }: { form: UseFormReturn<SettingsFormData> }) => {
  const watchedValues = form.watch();

  const message = useMemo(() => {
    const isUrgent = SAMPLE_STOCK_LEFT <= watchedValues.urgent_threshold;
    let message = watchedValues.default_message || '⚠️ Hurry! Only {stock} left!';
    if (isUrgent) {
      message = watchedValues.urgent_message || '🔥 Only {stock} left in stock!';
    }
    return message.replace('{stock}', SAMPLE_STOCK_LEFT.toString());
  }, [watchedValues]);

  const progress = useMemo(() => {
    let maxStock = SAMPLE_MAX_STOCK;

    if (watchedValues.fixed_stock_number?.is_enabled && watchedValues.fixed_stock_number?.number) {
      maxStock = watchedValues.fixed_stock_number.number;
    }

    return Math.min(100, (SAMPLE_STOCK_LEFT / maxStock) * 100);
  }, [watchedValues]);

  return (
    <div className="sticky top-6 h-fit space-y-6">
      <Card>
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
          <ProductPreview currentPosition={watchedValues.position_on_product_page}>
            <div className="flex flex-col gap-1">
              {/* Alert Text */}
              {watchedValues.show_alert_text && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium whitespace-nowrap text-gray-900">
                    {message}
                  </span>
                </div>
              )}

              {/* Progress Bar */}
              {watchedValues.show_progress_bar && (
                <div className="flex items-center gap-3">
                  <div
                    className="h-2 min-w-[200px] overflow-hidden rounded-full"
                    style={{ backgroundColor: watchedValues.background_color }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: watchedValues.fill_color,
                      }}
                    />
                  </div>
                  <span className="shrink-0 text-sm whitespace-nowrap text-gray-600">
                    {SAMPLE_STOCK_LEFT} left
                  </span>
                </div>
              )}
            </div>
          </ProductPreview>
        </CardContent>
      </Card>
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {__('Gutenberg block "Stock Scarcity" is not supported in this version.', 'yayboost')}
        </AlertDescription>
      </Alert>
    </div>
  );
};

const StockScarcity = ({ featureId }: FeatureComponentProps) => {
  const { data: feature, isLoading } = useFeature(featureId);
  const updateSettings = useUpdateFeatureSettings();

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

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: feature?.settings,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recommendations Table */}
      <FeatureLayoutHeader
        title={feature?.name ?? ''}
        description={feature?.description ?? ''}
        goBackRoute={'/features'}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Form {...form}>
          <SettingsCard
            headless
            title="Configure Stock Scarcity"
            onSave={() => {
              form.handleSubmit(onSubmit)();
            }}
            isDirty={form.formState.isDirty}
            isSaving={updateSettings.isPending}
            isLoading={isLoading}
            onReset={() => {
              form.reset(feature?.settings);
            }}
          >
            <GeneralSection form={form} />
            <Separator />
            <DisplaySection form={form} />
            <Separator />
            {form.watch('show_alert_text') && <AlertTextSection form={form} />}
            <Separator />
            {form.watch('show_progress_bar') && <ProgressBarSection form={form} />}
            <Separator />
            <DisplayLocationSection form={form} />
            <Separator />
            <ProductTargetingSection form={form} />
          </SettingsCard>
        </Form>
        {/* Preview Panel */}
        <PreviewSection form={form} />
      </div>
    </div>
  );
};

export default StockScarcity;
