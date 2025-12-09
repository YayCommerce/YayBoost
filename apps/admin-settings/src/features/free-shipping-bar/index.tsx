/**
 * Free Shipping Bar Feature Settings
 *
 * Simple settings-only feature with live preview.
 */

import { useEffect, useState } from 'react';
import { FeatureComponentProps } from '@/features';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, Eye, Info } from '@phosphor-icons/react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

// Settings schema
const settingsSchema = z.object({
  enabled: z.boolean(),
  threshold: z.number().min(0),
  threshold_auto_detected: z.boolean().optional(),
  threshold_detected_value: z.number().optional(),
  threshold_source: z.string().optional(),
  message_progress: z.string().min(1),
  message_achieved: z.string().min(1),
  bar_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  background_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  text_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  show_on: z.array(z.string()),
  show_progress_bar: z.boolean(),
  display_style: z.enum(['minimal_text', 'progress_bar', 'compact_progress']),
  behavior_when_unlocked: z.enum(['show_message', 'hide_bar']),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const showOnOptions = [
  { id: 'top_cart', label: __('Top Cart Page', 'yayboost') },
  { id: 'bottom_cart', label: __('Bottom Cart Page', 'yayboost') },
  { id: 'top_checkout', label: __('Top Checkout Page', 'yayboost') },
  { id: 'bottom_checkout', label: __('Bottom Checkout Page', 'yayboost') },
  { id: 'mini_cart', label: __('Mini Cart', 'yayboost') },
];

// Preview component
function ShippingBarPreview({
  settings,
  cartValue = 30,
}: {
  settings: SettingsFormData;
  cartValue?: number;
}) {
  const remaining = Math.max(0, settings.threshold - cartValue);
  const progress =
    settings.threshold > 0 ? Math.min(100, (cartValue / settings.threshold) * 100) : 100;
  const achieved = remaining <= 0;

  const message = achieved
    ? settings.message_achieved
    : settings.message_progress
        .replace('{amount}', `$${remaining.toFixed(2)}`)
        .replace('{remaining}', `$${remaining.toFixed(2)}`)
        .replace('{threshold}', `$${settings.threshold.toFixed(2)}`)
        .replace('{current}', `$${cartValue.toFixed(2)}`);

  const displayStyle = settings.display_style || 'minimal_text';
  const showProgress =
    !achieved && (displayStyle === 'progress_bar' || displayStyle === 'compact_progress');

  return (
    <div
      className="rounded-lg p-4 transition-all"
      style={{
        backgroundColor: achieved ? settings.bar_color : settings.background_color,
        color: achieved ? '#ffffff' : settings.text_color,
      }}
    >
      <div className="text-sm font-medium">{message}</div>
      {showProgress && (
        <div
          className={`mt-2 overflow-hidden rounded-full ${
            displayStyle === 'compact_progress' ? 'h-1.5' : 'h-2'
          }`}
          style={{ backgroundColor: `${settings.text_color}20` }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              backgroundColor: settings.bar_color,
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function FreeShippingBarFeature({ featureId }: FeatureComponentProps) {
  console.log('FreeShippingBarFeature', featureId);
  const { data: feature, isLoading } = useFeature(featureId);
  const updateSettings = useUpdateFeatureSettings();
  const toggleMutation = useToggleFeature();
  const [previewValue, setPreviewValue] = useState(30);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      enabled: true,
      threshold: 50,
      threshold_auto_detected: true,
      threshold_detected_value: 100,
      threshold_source: 'WooCommerce Shipping Zones',
      message_progress: 'Add {amount} more for FREE shipping!',
      message_achieved: "✓ You've unlocked FREE shipping!",
      bar_color: '#4CAF50',
      background_color: '#e8f5e9',
      text_color: '#2e7d32',
      show_on: ['top_cart', 'top_checkout'],
      show_progress_bar: true,
      display_style: 'minimal_text',
      behavior_when_unlocked: 'show_message',
    },
  });

  // Update form when feature data loads
  useEffect(() => {
    if (feature?.settings) {
      form.reset(feature.settings as SettingsFormData);
    }
  }, [feature, form]);

  const onSubmit = (data: SettingsFormData) => {
    console.log('onSubmit', data);
    updateSettings.mutate({ id: featureId, settings: data });
  };

  const watchedValues = form.watch();
  const isEnabled = form.watch('enabled');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Top Save Button */}
        <div className="flex justify-end pb-5">
          <Button type="submit" disabled={updateSettings.isPending}>
            {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
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
                            toggleMutation.mutate({ id: featureId, enabled: newEnabled });
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

                <FormField
                  control={form.control}
                  name="threshold_auto_detected"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{__('Shipping threshold: Auto-detected', 'yayboost')}</FormLabel>
                      {field.value && watchedValues.threshold_detected_value && (
                        <div className="mt-2 flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" weight="fill" />
                          <span className="text-sm">
                            Detected: ${watchedValues.threshold_detected_value.toFixed(2)} (from{' '}
                            {watchedValues.threshold_source || 'WooCommerce Shipping Zones'})
                          </span>
                        </div>
                      )}
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
                            <RadioGroupItem value="compact_progress" id="style-compact" />
                            <label htmlFor="style-compact" className="cursor-pointer">
                              {__('Compact Progress', 'yayboost')}
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
                <CardTitle>{__('Threshold & Messages', 'yayboost')}</CardTitle>
                <CardDescription>
                  {__('Set the free shipping threshold and customize messages', 'yayboost')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="threshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{__('Free Shipping Threshold ($)', 'yayboost')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        {__('Minimum cart value for free shipping', 'yayboost')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                        {__('Available:', 'yayboost')} {'{amount}'}, {'{threshold}'}, {'{current}'}
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
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="bar_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{__('Bar Color', 'yayboost')}</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="background_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{__('Background', 'yayboost')}</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="text_color"
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
                </div>
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
              <Button type="submit" disabled={updateSettings.isPending}>
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
                    {__('Simulate Cart Value ($)', 'yayboost')}
                  </label>
                  <Input
                    type="range"
                    min="0"
                    max={watchedValues.threshold * 1.5}
                    step="1"
                    value={previewValue}
                    onChange={(e) => setPreviewValue(parseInt(e.target.value))}
                    className="mt-2"
                  />
                  <div className="text-muted-foreground mt-1 flex justify-between text-xs">
                    <span>$0</span>
                    <span className="font-medium">${previewValue.toFixed(2)}</span>
                    <span>${(watchedValues.threshold * 1.5).toFixed(2)}</span>
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
                    <ShippingBarPreview
                      settings={watchedValues}
                      cartValue={watchedValues.threshold * 0.6}
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium">{__('Achieved State:', 'yayboost')}</p>
                    <ShippingBarPreview
                      settings={watchedValues}
                      cartValue={watchedValues.threshold + 10}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );
}
