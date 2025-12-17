/**
 * Free Shipping Bar Feature Settings
 *
 * Simple settings-only feature with live preview.
 */

import { useEffect, useMemo, useState } from 'react';
import { FeatureComponentProps } from '@/features';
import { FeatureLayout } from '@/layouts/feature-layout';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, Gift, Info, Truck } from '@phosphor-icons/react';
import { __ } from '@wordpress/i18n';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { cn } from '@/lib/utils';
import { useFeature, useToggleFeature, useUpdateFeatureSettings } from '@/hooks/use-features';
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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';

// Settings schema
const settingsSchema = z.object({
  enabled: z.boolean(),
  threshold: z.number().min(0).optional(),
  message_progress: z.string().min(1),
  message_achieved: z.string().min(1),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  show_on: z.array(z.string()),
  show_progress_bar: z.boolean(),
  display_style: z.enum(['minimal_text', 'progress_bar', 'full_detail']),
  behavior_when_unlocked: z.enum(['show_message', 'hide_bar']),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

// Default values constant - matches PHP defaults
const DEFAULT_FORM_VALUES: SettingsFormData = {
  enabled: false,
  threshold: undefined,
  message_progress: __('Add {remaining} more for free shipping!', 'yayboost'),
  message_achieved: __('🎉 Congratulations! You have free shipping!', 'yayboost'),
  primary_color: '#4CAF50',
  show_on: ['top_cart', 'top_checkout'],
  show_progress_bar: true,
  display_style: 'minimal_text',
  behavior_when_unlocked: 'show_message',
};

const showOnOptions = [
  { id: 'top_cart', label: __('Top Cart Page', 'yayboost') },
  { id: 'bottom_cart', label: __('Bottom Cart Page', 'yayboost') },
  { id: 'top_checkout', label: __('Top Checkout Page', 'yayboost') },
  { id: 'bottom_checkout', label: __('Bottom Checkout Page', 'yayboost') },
  { id: 'mini_cart', label: __('Mini Cart', 'yayboost') },
];

// Helper function to convert hex color to rgba with opacity
function applyOpacity(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// Color presets for quick color scheme selection
const COLOR_PRESETS = [
  {
    id: 'blue',
    name: __('Blue', 'yayboost'),
    primaryColor: '#0061fe',
  },
  {
    id: 'green',
    name: __('Green', 'yayboost'),
    primaryColor: '#4CAF50',
  },
  {
    id: 'black',
    name: __('Black', 'yayboost'),
    primaryColor: '#000000',
  },
];

// Minimal Text Bar Component
function MinimalTextBar({
  message,
  achieved,
  settings,
}: {
  message: string;
  achieved: boolean;
  settings: SettingsFormData;
}) {
  const primaryColor = settings.primary_color;
  const backgroundColor = achieved ? primaryColor : applyOpacity(primaryColor, 0.2);
  const textColor = achieved ? '#ffffff' : primaryColor;

  return (
    <div
      className="flex items-center gap-2 rounded-lg px-4 py-3 transition-all"
      style={{
        backgroundColor: backgroundColor,
        color: textColor,
      }}
    >
      <Truck
        className="h-5 w-5 shrink-0"
        style={{
          color: textColor,
        }}
      />
      <div className="text-sm font-medium">{message}</div>
    </div>
  );
}

// Progress Bar Component
function ProgressBarBar({
  message,
  achieved,
  progress,
  settings,
}: {
  message: string;
  achieved: boolean;
  progress: number;
  settings: SettingsFormData;
}) {
  const primaryColor = settings.primary_color;
  const backgroundColor = applyOpacity(primaryColor, 0.2);

  return (
    <div className="space-y-2">
      <div
        className="h-2 overflow-hidden rounded-full"
        style={{ backgroundColor: backgroundColor }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            backgroundColor: primaryColor,
          }}
        />
      </div>
      <div
        className="text-center text-sm"
        style={{
          color: primaryColor,
        }}
      >
        {message}
      </div>
    </div>
  );
}

// Full Detail Bar Component
function FullDetailBar({
  message,
  achieved,
  progress,
  cartTotal,
  threshold,
  settings,
}: {
  message: string;
  achieved: boolean;
  progress: number;
  cartTotal: number;
  threshold: number;
  settings: SettingsFormData;
}) {
  const currencySymbol = window.yayboostData?.currencySymbol || '$';
  const primaryColor = settings.primary_color;
  const backgroundColor = applyOpacity(primaryColor, 0.2);

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: primaryColor }}
          >
            <Truck className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-base font-semibold" style={{ color: primaryColor }}>
              {__('Free Shipping', 'yayboost')}
            </div>
            <div className="text-xs" style={{ color: primaryColor }}>
              {__('On orders over', 'yayboost')} {currencySymbol}
              {threshold.toFixed(2)}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-base font-semibold" style={{ color: primaryColor }}>
            {currencySymbol}
            {cartTotal.toFixed(2)}
          </div>
          <div className="text-xs" style={{ color: primaryColor }}>
            {__('Cart total', 'yayboost')}
          </div>
        </div>
      </div>

      {/* Progress Bar Section */}
      <div className="relative">
        <div
          className="h-1.5 overflow-hidden rounded-full"
          style={{ backgroundColor: backgroundColor }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              backgroundColor: primaryColor,
            }}
          />
        </div>
        <div
          className="absolute top-1/2 right-0 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full"
          style={{ backgroundColor: achieved ? primaryColor : backgroundColor }}
        >
          <Gift className="h-3.5 w-3.5 text-white" />
        </div>
      </div>

      {/* CTA Section */}
      <div
        className="rounded-lg px-4 py-3 text-center text-sm font-medium"
        style={{
          backgroundColor: achieved ? primaryColor : backgroundColor,
          color: achieved ? '#ffffff' : primaryColor,
        }}
      >
        {message}
      </div>
    </div>
  );
}

// Preview component
function ShippingBarPreview({
  settings,
  cartValue = 30,
}: {
  settings: SettingsFormData;
  cartValue?: number;
}) {
  // Get currency symbol from admin data
  const currencySymbol = window.yayboostData?.currencySymbol || '$';

  // Use default threshold value
  const threshold = 100;
  const remaining = Math.max(0, threshold - cartValue);
  const progress = threshold > 0 ? Math.min(100, (cartValue / threshold) * 100) : 100;
  const achieved = remaining <= 0;

  // Add fallback values to prevent undefined errors
  const messageProgress = settings.message_progress || '';
  const messageAchieved = settings.message_achieved || '';

  const message = achieved
    ? messageAchieved
    : messageProgress
        .replace('{remaining}', `${currencySymbol}${remaining.toFixed(2)}`)
        .replace('{threshold}', `${currencySymbol}${threshold.toFixed(2)}`)
        .replace('{current}', `${currencySymbol}${cartValue.toFixed(2)}`);

  const displayStyle = settings.display_style || 'minimal_text';

  // Route to appropriate component based on display style
  if (displayStyle === 'minimal_text') {
    return <MinimalTextBar message={message} achieved={achieved} settings={settings} />;
  } else if (displayStyle === 'progress_bar') {
    return (
      <ProgressBarBar
        message={message}
        achieved={achieved}
        progress={progress}
        settings={settings}
      />
    );
  } else if (displayStyle === 'full_detail') {
    return (
      <FullDetailBar
        message={message}
        achieved={achieved}
        progress={progress}
        cartTotal={cartValue}
        threshold={threshold}
        settings={settings}
      />
    );
  }

  // Fallback to minimal_text
  return <MinimalTextBar message={message} achieved={achieved} settings={settings} />;
}

export default function FreeShippingBarFeature({ featureId }: FeatureComponentProps) {
  const { data: feature, isLoading } = useFeature(featureId, true);
  const updateSettings = useUpdateFeatureSettings();
  const toggleMutation = useToggleFeature();
  const [previewValue, setPreviewValue] = useState(30);

  // Get currency symbol from admin data
  const currencySymbol = window.yayboostData?.currencySymbol || '$';

  // Merge default values with feature settings
  const defaultValues = useMemo(() => {
    if (feature?.settings) {
      return { ...DEFAULT_FORM_VALUES, ...(feature.settings as SettingsFormData) };
    }
    return DEFAULT_FORM_VALUES;
  }, [feature]);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: defaultValues,
  });

  // Update form when feature data loads
  useEffect(() => {
    if (feature?.settings) {
      form.reset({ ...DEFAULT_FORM_VALUES, ...(feature.settings as SettingsFormData) });
    }
  }, [feature, form]);

  const onSubmit = (data: SettingsFormData) => {
    updateSettings.mutate({ id: featureId, settings: data });
  };

  const submitForm = () => {
    form.handleSubmit(onSubmit)();
  };

  // Handle preset color selection
  const handlePresetClick = (preset: (typeof COLOR_PRESETS)[number]) => {
    form.setValue('primary_color', preset.primaryColor, { shouldDirty: true });
    form.trigger(['primary_color']);
  };

  const watchedValues = form.watch();
  const isEnabled = form.watch('enabled');

  if (isLoading || !feature?.settings) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <FeatureLayout featureId={featureId} isPending={updateSettings.isPending} onSave={submitForm}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Settings Form */}
            <div className="space-y-6">
              {/* General Section */}
              <Card>
                <CardHeader>
                  <CardTitle>{__('General', 'yayboost')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{__('Enable Free Shipping Bar', 'yayboost')}</FormLabel>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{__('Show On', 'yayboost')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="show_on"
                    render={() => (
                      <FormItem>
                        <div className="space-y-2">
                          {showOnOptions.map((option) => (
                            <FormField
                              key={option.id}
                              control={form.control}
                              name="show_on"
                              render={({ field }) => (
                                <FormItem className="flex items-center space-y-0 space-x-3">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(option.id)}
                                      onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        if (checked) {
                                          field.onChange([...current, option.id]);
                                        } else {
                                          field.onChange(current.filter((v) => v !== option.id));
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal">
                                    {option.label}
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Style Section */}
              <Card>
                <CardHeader>
                  <CardTitle>{__('Style', 'yayboost')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="display_style"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{__('Display style', 'yayboost')}</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="flex flex-col gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="minimal_text" id="style-minimal" />
                              <label htmlFor="style-minimal" className="cursor-pointer">
                                {__('Minimal Text', 'yayboost')}
                              </label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="progress_bar" id="style-progress" />
                              <label htmlFor="style-progress" className="cursor-pointer">
                                {__('Progress Bar', 'yayboost')}
                              </label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="full_detail" id="style-compact" />
                              <label htmlFor="style-compact" className="cursor-pointer">
                                {__('Full Detail', 'yayboost')}
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

              <Card>
                <CardHeader>
                  <CardTitle>{__('Messages', 'yayboost')}</CardTitle>
                  <CardDescription>
                    {__('Customize messages for the free shipping bar', 'yayboost')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="message_progress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{__('Progress Message', 'yayboost')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          {__('Available:', 'yayboost')} {'{remaining}'}, {'{threshold}'},{' '}
                          {'{current}'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message_achieved"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{__('Achievement Message', 'yayboost')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          {__('Shown when customer qualifies for free shipping', 'yayboost')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{__('Appearance', 'yayboost')}</CardTitle>
                  <CardDescription>{__('Customize colors and style', 'yayboost')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Color Presets */}
                  <div>
                    <FormLabel className="mb-3 block">{__('Color Presets', 'yayboost')}</FormLabel>
                    <div className="flex flex-wrap gap-5">
                      {COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handlePresetClick(preset)}
                          className={cn(
                            'hover:border-primary rounded-full border-2 transition-all hover:shadow-sm',
                            'border-border h-10 w-10 overflow-hidden',
                          )}
                          style={{
                            backgroundColor: preset.primaryColor,
                          }}
                          title={preset.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Primary Color Input */}
                  <FormField
                    control={form.control}
                    name="primary_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{__('Primary Color', 'yayboost')}</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input type="color" {...field} className="h-10 w-14 p-1" />
                            <Input {...field} className="flex-1" />
                          </div>
                        </FormControl>
                        <FormDescription>
                          {__('Background will use 20% opacity of this color', 'yayboost')}
                        </FormDescription>
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
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="behavior_when_unlocked"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{__('When free shipping unlocked', 'yayboost')}</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="flex flex-col gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="show_message" id="behavior-show" />
                              <label htmlFor="behavior-show" className="cursor-pointer">
                                {__('Show success message', 'yayboost')}
                              </label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="hide_bar" id="behavior-hide" />
                              <label htmlFor="behavior-hide" className="cursor-pointer">
                                {__('Hide bar completely', 'yayboost')}
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

              {/* Gutenberg Block Info Section */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-3 rounded-lg bg-blue-50 p-4 dark:bg-blue-950/20">
                    <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                    <div className="space-y-1 text-sm">
                      <p className="text-blue-900 dark:text-blue-100">
                        Use the <strong className="font-bold">"Free Shipping Bar"</strong> block in
                        Gutenberg editor to place the bar anywhere on your site.
                      </p>
                      <p className="text-blue-700 dark:text-blue-300">
                        {__(
                          'Block inherits style settings from above, or override per block.',
                          'yayboost',
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bottom Save Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={updateSettings.isPending || !form.formState.isDirty}
                >
                  {updateSettings.isPending
                    ? __('Saving...', 'yayboost')
                    : __('Save Settings', 'yayboost')}
                </Button>
              </div>
            </div>

            {/* Preview Panel */}
            <div className={cn('space-y-6', !isEnabled && 'opacity-60')}>
              <Card className="sticky top-6">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    <CardTitle>{__('Live Preview', 'yayboost')}</CardTitle>
                  </div>
                  <CardDescription>
                    {__('See how the bar will look on your store', 'yayboost')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Preview controls */}
                  <div>
                    <label className="text-sm font-medium">
                      {__('Simulate Cart Value', 'yayboost')} ({currencySymbol})
                    </label>
                    <Input
                      type="range"
                      min="0"
                      max={150}
                      step="1"
                      value={previewValue}
                      onChange={(e) => setPreviewValue(parseInt(e.target.value))}
                      className="mt-2"
                    />
                    <div className="text-muted-foreground mt-1 flex justify-between text-xs">
                      <span>{currencySymbol}0</span>
                      <span className="font-medium">
                        {currencySymbol}
                        {previewValue.toFixed(2)}
                      </span>
                      <span>
                        {currencySymbol}
                        {(150).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Preview states */}
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-sm font-medium">{__('Current State:', 'yayboost')}</p>
                      <ShippingBarPreview settings={watchedValues} cartValue={previewValue} />
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-medium">
                        {__('Progress State (example):', 'yayboost')}
                      </p>
                      <ShippingBarPreview settings={watchedValues} cartValue={60} />
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-medium">
                        {__('Achieved State:', 'yayboost')}
                      </p>
                      <ShippingBarPreview settings={watchedValues} cartValue={110} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </FeatureLayout>
    </Form>
  );
}
