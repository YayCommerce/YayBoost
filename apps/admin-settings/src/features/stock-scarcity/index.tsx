import { useEffect, useState } from 'react';
import { useFeature, useUpdateFeatureSettings } from '@/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { WarningCircle } from '@phosphor-icons/react';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

import {
  useProductCategories,
  useProducts,
} from '@/hooks/use-product-data';
import { Button } from '@/components/ui/button';
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
  useForm,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import FeatureLayoutHeader from '@/components/feature-layout-header';

import { FeatureComponentProps } from '..';

// Settings schema
const settingsSchema = z.object({
  enabled: z.boolean(),
  low_stock_threshold: z.number().min(0),
  show_alert_text: z.boolean(),
  show_progress_bar: z.boolean(),
  default_message: z.string().min(1),
  urgent_threshold: z.number().min(0),
  urgent_message: z.string().min(1),
  fixed_stock_number: z
    .object({
      is_enabled: z.boolean(),
      number: z.number().min(0),
    })
    .optional(),
  fill_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  background_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  position_on_product_page: z.enum(['below_title', 'below_price', 'below_add_to_cart']),
  show_on: z.array(z.string()),
  apply_to: z.enum(['all_products', 'specific_categories', 'specific_products']),
  specific_categories: z.array(z.string()),
  specific_products: z.array(z.string()),
  exclude_products: z.array(z.string()),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const GeneralSection = ({ form }: { form: UseFormReturn<SettingsFormData> }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">General</CardTitle>
        <CardDescription>Configure basic stock scarcity settings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Enable Stock Scarcity</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={(value) => field.onChange(value === 'true')}
                    value={field.value.toString()}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="false" id="off-stock-scarcity" />
                      <Label htmlFor="off-stock-scarcity" className="cursor-pointer font-normal">
                        Off
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="true" id="on-stock-scarcity" />
                      <Label htmlFor="on-stock-scarcity" className="cursor-pointer font-normal">
                        On
                      </Label>
                    </div>
                  </RadioGroup>
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="low_stock_threshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Show when stock is at or below</FormLabel>
                <div className="flex w-fit items-center gap-2">
                  <FormControl>
                    <Input
                      type="number"
                      step="1"
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      value={field.value || 1}
                    />
                  </FormControl>
                  <span className="text-[#6A7282]">items</span>
                </div>
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};

const DisplaySection = ({ form }: { form: UseFormReturn<SettingsFormData> }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Display Options</CardTitle>
        <CardDescription>Choose which elements to show to customers</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <FormField
          control={form.control}
          name="show_alert_text"
          render={({ field }) => (
            <FormItem className="flex items-center">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <span>Show alert text</span>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="show_progress_bar"
          render={({ field }) => (
            <FormItem className="flex items-center">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <span>Show progress bar</span>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

const AlertTextSection = ({ form }: { form: UseFormReturn<SettingsFormData> }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Alert Text</CardTitle>
        <CardDescription>Customize the alert messages shown to customers</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <FormField
          control={form.control}
          name="default_message"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">Default message</FormLabel>
              <FormControl>
                <Input placeholder="🔥 Only {stock} left in stock!" {...field} />
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
              <FormLabel className="text-sm">Urgent threshold</FormLabel>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    className="w-28"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
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
              <FormLabel className="text-sm">Urgent message</FormLabel>
              <FormControl>
                <Input placeholder="⚠️ Hurry! Only {stock} left!" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

const ProgressBarSection = ({ form }: { form: UseFormReturn<SettingsFormData> }) => {
  const fixedNumber = form.watch('fixed_stock_number');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Progress Bar</CardTitle>
        <CardDescription>Configure the visual stock indicator</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <Label className="font-medium">Bar colors</Label>
          <div className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="fill_color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-normal">Fill color</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input type="color" {...field} className="h-10 w-28 p-1" />
                    </FormControl>
                    <Label>{field.value ?? '#E53935'}</Label>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="background_color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-normal">Background</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input type="color" {...field} className="h-10 w-28 p-1" />
                    </FormControl>
                    <Label>{field.value ?? '#EEEEEE'}</Label>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="fixed_stock_number.is_enabled"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-2">
                <FormControl>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                        }}
                      />
                      <Label className="cursor-pointer font-normal">
                        Calculate percentage from Fixed Number
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
                        <Input
                          type="number"
                          step="1"
                          min="1"
                          className="w-28"
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          value={field.value || 1}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <span className="text-[#6A7282]">items</span>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-[#EFF6FF] p-3">
                <div className="flex items-center gap-2">
                  <WarningCircle size={24} color="#155DFC" />
                </div>
                <div className="flex flex-col">
                  <p className="text-sm text-[#1C398E]">How fixed number works</p>
                  <p className="text-sm text-[#193CB8]">
                    If you set {fixedNumber?.number} items and current stock is 8, the progress bar
                    will show {(100 - (8 / Math.max(fixedNumber?.number || 0, 1)) * 100).toFixed(0)}
                    % sold ({fixedNumber?.number - 8} of {fixedNumber?.number}).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const DisplayLocationSection = ({ form }: { form: UseFormReturn<SettingsFormData> }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Display Location</CardTitle>
        <CardDescription>Control where stock scarcity appears</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <Label className="font-medium">Position on product page</Label>
          <FormField
            control={form.control}
            name="position_on_product_page"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="below_title" id="below-title" />
                      <Label htmlFor="below-title" className="cursor-pointer font-normal">
                        Below product title
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="below_price" id="below-price" />
                      <Label htmlFor="below-price" className="cursor-pointer font-normal">
                        Below price
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="below_add_to_cart" id="below-add-to-cart" />
                      <Label htmlFor="below-add-to-cart" className="cursor-pointer font-normal">
                        Below add to cart button
                      </Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-col gap-4">
          <Label className="font-medium">Show on</Label>
          <FormField
            control={form.control}
            name="show_on"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-2">
                <FormControl>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
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
                      <Label className="cursor-pointer font-normal">Product page</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
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
                      <Label className="cursor-pointer font-normal">Shop / Category pages</Label>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Product Targeting</CardTitle>
        <CardDescription>Select which products show stock scarcity</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <Label className="font-medium">Apply to</Label>
          <FormField
            control={form.control}
            name="apply_to"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="all_products" id="all-products" />
                      <Label htmlFor="all-products" className="cursor-pointer font-normal">
                        All products
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="specific_categories" id="specific-categories" />
                      <Label htmlFor="specific-categories" className="cursor-pointer font-normal">
                        Specific categories
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="specific_products" id="specific-products" />
                      <Label htmlFor="specific-products" className="cursor-pointer font-normal">
                        Specific products
                      </Label>
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
                  <FormLabel>Select categories</FormLabel>
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
                  <FormLabel>Select products</FormLabel>
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
        </div>

        <div className="flex flex-col gap-4">
          <Label className="font-medium">Exclude products</Label>
          <FormField
            control={form.control}
            name="exclude_products"
            render={({ field }) => (
              <FormItem>
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
        </div>
      </CardContent>
    </Card>
  );
};

const PreviewSection = ({ form }: { form: UseFormReturn<SettingsFormData> }) => {
  const sampleStockLeft = 8;
  const watchedValues = form.watch();

  const isUrgent = sampleStockLeft <= watchedValues.urgent_threshold;
  const message = isUrgent
    ? watchedValues.urgent_message.replace('{stock}', sampleStockLeft.toString())
    : watchedValues.default_message.replace('{stock}', sampleStockLeft.toString());

  const maxStock =
    watchedValues.fixed_stock_number?.is_enabled && watchedValues.fixed_stock_number?.number
      ? watchedValues.fixed_stock_number.number
      : 50;
  const progress = Math.min(100, (sampleStockLeft / maxStock) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Preview</CardTitle>
        <CardDescription>See how your stock scarcity will look</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-fit min-w-xs rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex flex-col gap-3">
            {/* Alert Text */}
            {watchedValues.show_alert_text && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium whitespace-nowrap text-gray-900">
                  {message ? message : '🔥 Only {stock} left in stock!'}
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
                  {sampleStockLeft} left
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const StockScarcity = ({ featureId }: FeatureComponentProps) => {
  const { data: feature, isLoading } = useFeature(featureId);
  const updateSettings = useUpdateFeatureSettings();

  const onSubmit = (data: SettingsFormData) => {
    updateSettings.mutate({ id: featureId, settings: data });
  };

  // Define default fallback values
  const defaultValues: SettingsFormData = {
    enabled: true,
    low_stock_threshold: 10,
    show_alert_text: true,
    show_progress_bar: true,
    default_message: '',
    urgent_threshold: 5,
    urgent_message: '',
    fixed_stock_number: {
      is_enabled: false,
      number: 50,
    },
    fill_color: '#E53935',
    background_color: '#EEEEEE',
    position_on_product_page: 'below_title',
    show_on: ['product_page', 'shop_category_pages'],
    apply_to: 'all_products',
    specific_categories: [],
    specific_products: [],
    exclude_products: [],
  };

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: (feature?.settings as SettingsFormData) || defaultValues,
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
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4">
              <GeneralSection form={form} />
              <DisplaySection form={form} />
              {form.watch('show_alert_text') && <AlertTextSection form={form} />}
              {form.watch('show_progress_bar') && <ProgressBarSection form={form} />}
              <DisplayLocationSection form={form} />
              <ProductTargetingSection form={form} />
              <PreviewSection form={form} />
            </div>

            {/* Submit button */}
            <div className="flex justify-end gap-3">
              <Button
                type="submit"
                className="bg-[#171717] text-white"
                disabled={updateSettings.isPending}
              >
                {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default StockScarcity;
