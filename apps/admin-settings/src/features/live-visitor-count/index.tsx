import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { __ } from '@wordpress/i18n';
import { AlertCircle, Eye } from 'lucide-react';
import z from 'zod';

import { useFeature, useUpdateFeatureSettings } from '@/hooks/use-features';
import { useProductCategories, useProducts } from '@/hooks/use-product-data';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

import { FeatureComponentProps } from '..';

// Settings schema
const settingsSchema = z.object({
  enabled: z.boolean(),
  tracking_mode: z.enum(['real-tracking', 'simulated']),
  real_tracking: z.object({
    active_window: z.number().min(1),
    minimum_count_display: z.union([z.number().min(0), z.string().min(0)]),
  }),
  simulated: z.object({
    min: z.union([z.number().min(1), z.string().min(1)]),
    max: z.union([z.number().min(1), z.string().min(1)]),
  }),
  display: z.object({
    text: z.string().min(1),
    position: z.enum([
      'below_product_title',
      'above_add_to_cart_button',
      'below_add_to_cart_button',
      'below_price',
      'use_block',
    ]),
  }),
  style: z.object({
    style: z.enum(['style_1', 'style_2', 'style_3']),
    text_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    background_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  }),
  apply_on: z.object({
    apply: z.enum(['all', 'specific_categories', 'specific_products']),
    categories: z.array(z.string()).optional(),
    products: z.array(z.string()).optional(),
  }),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

// Style Preview Component
function StylePreview({
  style,
  textColor,
  backgroundColor,
  displayText,
}: {
  style: string;
  textColor: string;
  backgroundColor: string;
  displayText: string;
}) {
  const previewCount = 12;
  const text = displayText.replace('{count}', previewCount.toString());

  if (style === 'style_2') {
    return (
      <div
        className="yayboost-lvc yayboost-lvc-style-2 inline-flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-sm"
        style={{ color: textColor, backgroundColor: backgroundColor }}
      >
        <span>{text}</span>
      </div>
    );
  }

  if (style === 'style_3') {
    return (
      <div className="yayboost-lvc yayboost-lvc-style-3 group relative inline-flex flex-col items-center gap-1">
        <div
          className="yayboost-lvc-text pointer-events-none absolute top-1/2 left-full z-10 ml-2 -translate-y-1/2 rounded-lg px-3.5 py-2.5 whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover:pointer-events-auto group-hover:opacity-100"
          style={{ color: textColor, backgroundColor: backgroundColor }}
        >
          {text}
        </div>
        <div className="yayboost-lvc-icon flex items-center justify-center">
          <span>{previewCount}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="yayboost-lvc yayboost-lvc-style-1 inline-flex items-center gap-1.5 text-sm"
      style={{ color: textColor }}
    >
      <span>{text}</span>
    </div>
  );
}

export default function LiveVisitorCountFeature({ featureId }: FeatureComponentProps) {
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

  const trackingMode = form.watch('tracking_mode');
  const style = form.watch('style.style');
  const applyOn = form.watch('apply_on.apply');
  const textColor = form.watch('style.text_color');
  const backgroundColor = form.watch('style.background_color');
  const displayText = form.watch('display.text');

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
            <h3 className="text-sm font-medium">{__('Tracking Mode', 'yayboost')}</h3>
            <p className="text-muted-foreground text-xs">
              {__('Configure how visitor counts are tracked and displayed.', 'yayboost')}
            </p>
          </div>
          <FormField
            control={form.control}
            name="tracking_mode"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup value={field.value} onValueChange={field.onChange}>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="real-tracking" id="real-tracking" />
                      <div className="space-y-1">
                        <Label htmlFor="real-tracking">{__('Real Tracking', 'yayboost')}</Label>
                        <FormDescription>
                          {__('Track actual visitors viewing the product.', 'yayboost')}
                        </FormDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="simulated" id="simulated" />
                      <div className="space-y-1">
                        <Label htmlFor="simulated">{__('Simulated', 'yayboost')}</Label>
                        <FormDescription>
                          {__('Display randomized visitor counts.', 'yayboost')}
                        </FormDescription>
                      </div>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Real Tracking Settings */}
          {trackingMode === 'real-tracking' && (
            <div className="space-y-4">
              <Label>{__('Real Tracking Settings', 'yayboost')}</Label>
              <div className="space-y-4 pt-2">
                <FormField
                  control={form.control}
                  name="real_tracking.active_window"
                  render={({ field }) => (
                    <FormItem>
                      <Label>{__('Active Window (minutes)', 'yayboost')}</Label>
                      <Select
                        value={field.value?.toString() ?? '5'}
                        onValueChange={(value) => field.onChange(parseInt(value, 10))}
                      >
                        <FormControl>
                          <SelectTrigger className="w-24">
                            <SelectValue placeholder={__('Select active window', 'yayboost')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="15">15</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {__('Count visitors active within this time period', 'yayboost')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="real_tracking.minimum_count_display"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="minimum-count-display">
                        {__('Minimum Count to Display', 'yayboost')}
                      </Label>
                      <FormControl>
                        <div className="w-fit">
                          <InputNumber
                            {...field}
                            id="minimum-count-display"
                            min={0}
                            onValueChange={(value) => field.onChange(value || 0)}
                            value={parseInt(field.value?.toString() ?? '0', 10)}
                            className="w-24"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        {__(
                          'Hide counter if visitors below this number (0 = always show)',
                          'yayboost',
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* Simulated Settings */}
          {trackingMode === 'simulated' && (
            <div className="space-y-4">
              <Label>{__('Simulated Settings', 'yayboost')}</Label>
              <div className="space-y-4 pt-2">
                <FormField
                  control={form.control}
                  name="simulated.min"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="minimum-count">{__('Minimum Count', 'yayboost')}</Label>
                      <FormControl>
                        <div className="w-fit">
                          <InputNumber
                            {...field}
                            id="minimum-count"
                            min={1}
                            onValueChange={(value) => field.onChange(value || 1)}
                            value={parseInt(field.value?.toString() ?? '10', 10)}
                            className="w-24"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="simulated.max"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="maximum-count">{__('Maximum Count', 'yayboost')}</Label>
                      <FormControl>
                        <div className="w-fit">
                          <InputNumber
                            {...field}
                            id="maximum-count"
                            min={1}
                            onValueChange={(value) => field.onChange(value || 1)}
                            value={parseInt(field.value?.toString() ?? '50', 10)}
                            className="w-24"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        {__('Random count will be between min and max', 'yayboost')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
          <Separator />
          <div className="space-y-1">
            <h3 className="text-sm font-medium">{__('Display Settings', 'yayboost')}</h3>
            <p className="text-muted-foreground text-xs">
              {__('Configure how the visitor count is displayed.', 'yayboost')}
            </p>
          </div>
          <FormField
            control={form.control}
            name="display.text"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="display-text">{__('Display Text', 'yayboost')}</Label>
                <FormControl>
                  <Input
                    {...field}
                    id="display-text"
                    placeholder="{count} people are viewing this right now"
                    className="max-w-100"
                  />
                </FormControl>
                <FormDescription>
                  {__('Use {count} as placeholder for the number of visitors', 'yayboost')}
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
                <Label>{__('Position on Product Page', 'yayboost')}</Label>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder={__('Select position', 'yayboost')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="below_product_title">
                      {__('Below product title', 'yayboost')}
                    </SelectItem>
                    <SelectItem value="above_add_to_cart_button">
                      {__('Above add to cart button', 'yayboost')}
                    </SelectItem>
                    <SelectItem value="below_add_to_cart_button">
                      {__('Below add to cart button', 'yayboost')}
                    </SelectItem>
                    <SelectItem value="below_price">{__('Below price', 'yayboost')}</SelectItem>
                    <SelectItem value="use_block">{__('Use block', 'yayboost')}</SelectItem>
                  </SelectContent>
                </Select>
                {field.value === 'use_block' && (
                  <FormDescription>
                    {__(
                      'Drag and drop the block "Live Visitor Count" block directly into the single product page editor to display the number of users currently visiting.',
                      'yayboost',
                    )}
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <Separator />
          <div className="space-y-1">
            <h3 className="text-sm font-medium">{__('Style Settings', 'yayboost')}</h3>
            <p className="text-muted-foreground text-xs">
              {__('Configure the style of the visitor count.', 'yayboost')}
            </p>
          </div>
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="style.style"
              render={({ field }) => (
                <FormItem>
                  <Label>{__('Choose Style', 'yayboost')}</Label>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex items-center gap-6"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="style_1" id="style-1" />
                        <div className="space-y-1">
                          <label htmlFor="style-1">{__('Text only', 'yayboost')}</label>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="style_2" id="style-2" />
                        <div className="space-y-1">
                          <label htmlFor="style-2">{__('Badge style', 'yayboost')}</label>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="style_3" id="style-3" />
                        <div className="space-y-1">
                          <label htmlFor="style-3">{__('Bubble style', 'yayboost')}</label>
                        </div>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="style.text_color"
              render={({ field }) => (
                <FormItem>
                  <Label>{__('Text Color', 'yayboost')}</Label>
                  <FormControl>
                    <ColorPicker {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {style !== 'style_1' && (
              <FormField
                control={form.control}
                name="style.background_color"
                render={({ field }) => (
                  <FormItem>
                    <Label>{__('Background Color', 'yayboost')}</Label>
                    <FormControl>
                      <ColorPicker {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
          <Separator />
          <div className="space-y-1">
            <h3 className="text-sm font-medium">{__('Product targeting', 'yayboost')}</h3>
            <p className="text-muted-foreground text-xs">
              {__(
                'Configure which products and categories the visitor count should be displayed on.',
                'yayboost',
              )}
            </p>
          </div>
          <FormField
            control={form.control}
            name="apply_on.apply"
            render={({ field }) => (
              <FormItem>
                <Label>{__('Show On', 'yayboost')}</Label>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-46">
                      <SelectValue placeholder={__('Select apply on', 'yayboost')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="all">{__('All Products', 'yayboost')}</SelectItem>
                    <SelectItem value="specific_categories">
                      {__('Specific Categories', 'yayboost')}
                    </SelectItem>
                    <SelectItem value="specific_products">
                      {__('Specific Products', 'yayboost')}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {applyOn === 'specific_categories' && (
            <FormField
              control={form.control}
              name="apply_on.categories"
              render={({ field }) => (
                <FormItem>
                  <Label>{__('Specific Categories', 'yayboost')}</Label>
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
          {applyOn === 'specific_products' && (
            <FormField
              control={form.control}
              name="apply_on.products"
              render={({ field }) => (
                <FormItem>
                  <Label>{__('Specific Products', 'yayboost')}</Label>
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
                <CardTitle>{__('Live Preview', 'yayboost')}</CardTitle>
              </div>
              <CardDescription>
                {__('See how the section will look on your store', 'yayboost')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <StylePreview
                style={style || 'style_1'}
                textColor={textColor || '#a74c3c'}
                backgroundColor={backgroundColor || '#fff3f3'}
                displayText={displayText || '{count} people are viewing this right now'}
              />
            </CardContent>
          </Card>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {__(
                'Gutenberg block "Live Visitor Count" is not supported in this version.',
                'yayboost',
              )}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </Form>
  );
}
