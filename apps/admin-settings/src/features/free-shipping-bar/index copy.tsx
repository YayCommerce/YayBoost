/**
 * Free Shipping Bar Feature Settings
 *
 * Simple settings-only feature with live preview.
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye } from '@phosphor-icons/react';

import { useFeature, useUpdateFeatureSettings } from '@/hooks/use-features';
import { FeatureComponentProps } from '@/features';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Settings schema
const settingsSchema = z.object({
  threshold: z.number().min(0),
  message_progress: z.string().min(1),
  message_achieved: z.string().min(1),
  bar_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  background_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  text_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  position: z.enum(['top', 'bottom', 'floating']),
  show_on: z.array(z.string()),
  show_progress_bar: z.boolean(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const showOnOptions = [
  { id: 'cart', label: 'Cart Page' },
  { id: 'checkout', label: 'Checkout Page' },
  { id: 'mini_cart', label: 'Mini Cart Widget' },
];

// Preview component
function ShippingBarPreview({ settings, cartValue = 30 }: { settings: SettingsFormData; cartValue?: number }) {
  const remaining = Math.max(0, settings.threshold - cartValue);
  const progress = settings.threshold > 0 ? Math.min(100, (cartValue / settings.threshold) * 100) : 100;
  const achieved = remaining <= 0;

  const message = achieved
    ? settings.message_achieved
    : settings.message_progress
        .replace('{remaining}', `$${remaining.toFixed(2)}`)
        .replace('{threshold}', `$${settings.threshold.toFixed(2)}`)
        .replace('{current}', `$${cartValue.toFixed(2)}`);

  return (
    <div
      className="rounded-lg p-4 transition-all"
      style={{
        backgroundColor: achieved ? settings.bar_color : settings.background_color,
        color: achieved ? '#ffffff' : settings.text_color,
      }}
    >
      <div className="text-sm font-medium">{message}</div>
      {!achieved && settings.show_progress_bar && (
        <div
          className="mt-2 h-2 rounded-full overflow-hidden"
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
  const [previewValue, setPreviewValue] = useState(30);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      threshold: 50,
      message_progress: 'Add {remaining} more for free shipping!',
      message_achieved: '🎉 Congratulations! You have free shipping!',
      bar_color: '#4CAF50',
      background_color: '#e8f5e9',
      text_color: '#2e7d32',
      position: 'top',
      show_on: ['cart', 'checkout'],
      show_progress_bar: true,
    },
  });

  // Update form when feature data loads
  useEffect(() => {
    if (feature?.settings) {
      form.reset(feature.settings as SettingsFormData);
    }
  }, [feature, form]);

  const onSubmit = (data: SettingsFormData) => {
    updateSettings.mutate({ id: featureId, settings: data });
  };

  const watchedValues = form.watch();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Settings Form */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Threshold & Messages</CardTitle>
            <CardDescription>Set the free shipping threshold and customize messages</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="threshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Free Shipping Threshold ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum cart value for free shipping
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
                      <FormLabel>Progress Message</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        Use {'{remaining}'}, {'{threshold}'}, {'{current}'} as placeholders
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
                      <FormLabel>Achievement Message</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        Shown when customer qualifies for free shipping
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button type="submit" disabled={updateSettings.isPending}>
                    {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize colors and style</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="bar_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bar Color</FormLabel>
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
                        <FormLabel>Background</FormLabel>
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
                        <FormLabel>Text Color</FormLabel>
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

                <FormField
                  control={form.control}
                  name="show_progress_bar"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Show Progress Bar</FormLabel>
                        <FormDescription>Display visual progress indicator</FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button type="submit" disabled={updateSettings.isPending}>
                    {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Display Settings</CardTitle>
            <CardDescription>Choose where to show the shipping bar</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select position" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="top">Top of page</SelectItem>
                          <SelectItem value="bottom">Bottom of page</SelectItem>
                          <SelectItem value="floating">Floating (sticky)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="show_on"
                  render={() => (
                    <FormItem>
                      <FormLabel>Show On</FormLabel>
                      <div className="space-y-2">
                        {showOnOptions.map((option) => (
                          <FormField
                            key={option.id}
                            control={form.control}
                            name="show_on"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-3 space-y-0">
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
                                <FormLabel className="font-normal">{option.label}</FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button type="submit" disabled={updateSettings.isPending}>
                    {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Preview Panel */}
      <div className="space-y-6">
        <Card className="sticky top-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              <CardTitle>Live Preview</CardTitle>
            </div>
            <CardDescription>See how the bar will look on your store</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preview controls */}
            <div>
              <label className="text-sm font-medium">Simulate Cart Value ($)</label>
              <Input
                type="range"
                min="0"
                max={watchedValues.threshold * 1.5}
                step="1"
                value={previewValue}
                onChange={(e) => setPreviewValue(parseInt(e.target.value))}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>$0</span>
                <span className="font-medium">${previewValue.toFixed(2)}</span>
                <span>${(watchedValues.threshold * 1.5).toFixed(2)}</span>
              </div>
            </div>

            {/* Preview states */}
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Current State:</p>
                <ShippingBarPreview settings={watchedValues} cartValue={previewValue} />
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Progress State (example):</p>
                <ShippingBarPreview settings={watchedValues} cartValue={watchedValues.threshold * 0.6} />
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Achieved State:</p>
                <ShippingBarPreview settings={watchedValues} cartValue={watchedValues.threshold + 10} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
