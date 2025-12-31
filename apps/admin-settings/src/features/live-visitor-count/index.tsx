import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { __ } from '@wordpress/i18n';
import { ChevronDownIcon } from 'lucide-react';
import z from 'zod';

import { useFeature, useToggleFeature, useUpdateFeatureSettings } from '@/hooks/use-features';
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
  useForm,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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
    icon: z.enum(['eye', 'person', 'fire', 'lightning', 'none']),
    position: z.enum([
      'below_product_title',
      'above_add_to_cart_button',
      'below_add_to_cart_button',
      'below_price',
    ]),
  }),
  style: z.object({
    style: z.enum(['style_1', 'style_2', 'style_3']),
    text_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    background_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  }),
  apply_on: z.object({
    apply: z.enum(['all', 'specific_categories', 'specific_products']),
    categories: z.array(z.union([z.string(), z.number()])).optional(),
    products: z.array(z.union([z.string(), z.number()])).optional(),
  }),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function LiveVisitorCountFeature({ featureId }: FeatureComponentProps) {
  const { data: feature, isLoading, isFetching } = useFeature(featureId);
  const updateSettings = useUpdateFeatureSettings();
  const toggleMutation = useToggleFeature();
  const [realTrackingExpanded, setRealTrackingExpanded] = useState(true);
  const [simulatedExpanded, setSimulatedExpanded] = useState(true);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: feature?.settings as SettingsFormData,
  });

  const onSubmit = (data: SettingsFormData) => {
    updateSettings.mutate({ id: featureId, settings: data });
  };

  const trackingMode = form.watch('tracking_mode');
  const style = form.watch('style.style');
  const applyOn = form.watch('apply_on.apply');

  // Update expanded state based on tracking mode
  useEffect(() => {
    if (trackingMode === 'real-tracking') {
      setRealTrackingExpanded(true);
      setSimulatedExpanded(false);
    } else {
      setRealTrackingExpanded(false);
      setSimulatedExpanded(true);
    }
  }, [trackingMode]);

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
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{__('Live Visitor Count', 'yayboost')}</CardTitle>
              <CardDescription>
                {__('Configure how visitor counts are tracked and displayed.', 'yayboost')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{__('Enable Live Visitor Count', 'yayboost')}</FormLabel>
                    <FormControl>
                      <FormControl>
                        <RadioGroup
                          value={field.value ? 'on' : 'off'}
                          onValueChange={(value) => {
                            const newEnabled = value === 'on';
                            field.onChange(newEnabled);
                          }}
                          disabled={toggleMutation.isPending}
                          className="flex items-center gap-6"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem
                              value="on"
                              id="enabled-on"
                              disabled={toggleMutation.isPending}
                            />
                            <label htmlFor="enabled-on" className="cursor-pointer">
                              {__('On', 'yayboost')}
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem
                              value="off"
                              id="enabled-off"
                              disabled={toggleMutation.isPending}
                            />
                            <label htmlFor="enabled-off" className="cursor-pointer">
                              {__('Off', 'yayboost')}
                            </label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Separator className="my-4" />
              {/* Tracking Mode */}
              <div className="space-y-4">
                <FormLabel>{__('Tracking Mode', 'yayboost')}</FormLabel>
                <FormField
                  control={form.control}
                  name="tracking_mode"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="flex flex-col gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="real-tracking" id="real-tracking" />
                            <div className="space-y-1">
                              <label htmlFor="real-tracking" className="cursor-pointer">
                                {__('Real Tracking', 'yayboost')}
                              </label>
                              <FormDescription>
                                {__('Track actual visitors viewing the product.', 'yayboost')}
                              </FormDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="simulated" id="simulated" />
                            <div className="space-y-1">
                              <label htmlFor="simulated" className="cursor-pointer">
                                {__('Simulated', 'yayboost')}
                              </label>
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
              </div>
              <Separator className="my-4" />
              {/* Real Tracking Settings */}
              {trackingMode === 'real-tracking' && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setRealTrackingExpanded(!realTrackingExpanded)}
                    className="flex w-full cursor-pointer items-center gap-2 text-left"
                  >
                    <ChevronDownIcon
                      className={`h-4 w-4 transition-transform ${realTrackingExpanded ? 'rotate-180' : ''}`}
                    />
                    <label className="!mb-0">{__('Real Tracking Settings', 'yayboost')}</label>
                  </button>

                  {realTrackingExpanded && (
                    <div className="space-y-4 pt-2">
                      <FormField
                        control={form.control}
                        name="real_tracking.active_window"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{__('Active Window (minutes)', 'yayboost')}</FormLabel>
                            <Select
                              value={field.value?.toString() ?? '5'}
                              onValueChange={(value) => field.onChange(parseInt(value, 10))}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue
                                    placeholder={__('Select active window', 'yayboost')}
                                  />
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
                            <FormLabel>{__('Minimum Count to Display', 'yayboost')}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                value={field.value ?? 0}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value, 10) || 0;
                                  field.onChange(value);
                                }}
                                onBlur={field.onBlur}
                                name={field.name}
                                ref={field.ref}
                              />
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
                  )}
                </div>
              )}

              {/* Simulated Settings */}
              {trackingMode === 'simulated' && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setSimulatedExpanded(!simulatedExpanded)}
                    className="flex w-full cursor-pointer items-center gap-2 text-left"
                  >
                    <ChevronDownIcon
                      className={`h-4 w-4 transition-transform ${simulatedExpanded ? 'rotate-180' : ''}`}
                    />
                    <label className="!mb-0">{__('Simulated Settings', 'yayboost')}</label>
                  </button>

                  {simulatedExpanded && (
                    <div className="space-y-4 pt-2">
                      <FormField
                        control={form.control}
                        name="simulated.min"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{__('Minimum Count', 'yayboost')}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                value={field.value ?? 10}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value, 10) || 0;
                                  field.onChange(value);
                                }}
                                onBlur={field.onBlur}
                                name={field.name}
                                ref={field.ref}
                              />
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
                            <FormLabel>{__('Maximum Count', 'yayboost')}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                value={field.value ?? 50}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value, 10) || 0;
                                  field.onChange(value);
                                }}
                                onBlur={field.onBlur}
                                name={field.name}
                                ref={field.ref}
                              />
                            </FormControl>
                            <FormDescription>
                              {__('Random count will be between min and max', 'yayboost')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Display Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{__('Display Settings', 'yayboost')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="display.text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{__('Display Text', 'yayboost')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="{count} people are viewing this right now" />
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
                name="display.icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{__('Icon', 'yayboost')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={__('Select icon', 'yayboost')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="eye">👁️ {__('Eye', 'yayboost')}</SelectItem>
                        <SelectItem value="person">👤 {__('Person', 'yayboost')}</SelectItem>
                        <SelectItem value="fire">🔥 {__('Fire', 'yayboost')}</SelectItem>
                        <SelectItem value="lightning">⚡ {__('Lightning', 'yayboost')}</SelectItem>
                        <SelectItem value="none"> {__('None', 'yayboost')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="display.position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{__('Position on Product Page', 'yayboost')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
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
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Style Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{__('Style', 'yayboost')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="style.style"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{__('Choose Style', 'yayboost')}</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex gap-4"
                      >
                        <label
                          htmlFor="style_1"
                          className={`flex flex-1 cursor-pointer flex-col items-center rounded-lg border-2 p-4 transition-all ${
                            field.value === 'style_1' ? 'border-black' : 'border-gray-200'
                          }`}
                        >
                          <div className="mb-3 text-center font-medium">
                            {__('Style 1', 'yayboost')}
                          </div>
                          <div className="mb-4 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm">
                            {__('Text only', 'yayboost')}
                          </div>
                          <RadioGroupItem
                            value="style_1"
                            id="style_1"
                            className="h-4 w-4 border-gray-300 data-[state=checked]:border-black data-[state=checked]:bg-black [&[data-state=checked]>span>span]:hidden"
                          />
                        </label>
                        <label
                          htmlFor="style_2"
                          className={`flex flex-1 cursor-pointer flex-col items-center rounded-lg border-2 p-4 transition-all ${
                            field.value === 'style_2' ? 'border-black' : 'border-gray-200'
                          }`}
                        >
                          <div className="mb-3 text-center font-medium">
                            {__('Style 2', 'yayboost')}
                          </div>
                          <div className="mb-4 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm">
                            {__('Badge style', 'yayboost')}
                          </div>
                          <RadioGroupItem
                            value="style_2"
                            id="style_2"
                            className="h-4 w-4 border-gray-300 data-[state=checked]:border-black data-[state=checked]:bg-black [&[data-state=checked]>span>span]:hidden"
                          />
                        </label>
                        <label
                          htmlFor="style_3"
                          className={`flex flex-1 cursor-pointer flex-col items-center rounded-lg border-2 p-4 transition-all ${
                            field.value === 'style_3' ? 'border-black' : 'border-gray-200'
                          }`}
                        >
                          <div className="mb-3 text-center font-medium">
                            {__('Style 3', 'yayboost')}
                          </div>
                          <div className="mb-4 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm">
                            {__('Bubble style', 'yayboost')}
                          </div>
                          <RadioGroupItem
                            value="style_3"
                            id="style_3"
                            className="h-4 w-4 border-gray-300 data-[state=checked]:border-black data-[state=checked]:bg-black [&[data-state=checked]>span>span]:hidden"
                          />
                        </label>
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
                    <FormLabel>{__('Text Color', 'yayboost')}</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input type="color" {...field} className="h-10 w-14 p-1" />
                        <Input {...field} className="flex-1" />
                      </div>
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
                      <FormLabel>
                        {__('Background Color (for Badge/Bubble styles)', 'yayboost')}
                      </FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input type="color" {...field} className="h-10 w-14 p-1" />
                          <Input {...field} className="flex-1" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Apply To Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{__('Apply To', 'yayboost')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="apply_on.apply"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{__('Show On', 'yayboost')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
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
                      <FormLabel>{__('Specific Categories', 'yayboost')}</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={
                            window.yayboostData?.product_categories.map((category) => ({
                              label: category.name,
                              value: category.id.toString(),
                            })) ?? []
                          }
                          value={
                            field.value
                              ? field.value.map((v) => (typeof v === 'number' ? v.toString() : v))
                              : []
                          }
                          onChange={(value) => field.onChange(value.map((v) => parseInt(v, 10)))}
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
                      <FormLabel>{__('Specific Products', 'yayboost')}</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={
                            window.yayboostData?.products.map((product) => ({
                              label: product.name,
                              value: product.id.toString(),
                            })) ?? []
                          }
                          value={
                            field.value
                              ? field.value.map((v) => (typeof v === 'number' ? v.toString() : v))
                              : []
                          }
                          onChange={(value) => field.onChange(value.map((v) => parseInt(v, 10)))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending
                ? __('Saving...', 'yayboost')
                : __('Save Settings', 'yayboost')}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
