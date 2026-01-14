/**
 * Free Shipping Bar Feature Settings
 *
 * Simple settings-only feature with live preview.
 */

import { useMemo, useState } from 'react';
import { FeatureComponentProps } from '@/features';
import { zodResolver } from '@hookform/resolvers/zod';
import { __ } from '@wordpress/i18n';
import { AlertCircle, Eye, Gift, Truck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  DisplayPositionMultiSelect,
  PAGE_CART,
  PAGE_CHECKOUT,
  type PositionsByPage,
} from '@/lib/display-position';
import { cn } from '@/lib/utils';
import { useFeature, useToggleFeature, useUpdateFeatureSettings } from '@/hooks/use-features';
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
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import FeatureLayoutHeader from '@/components/feature-layout-header';
import { SettingsCard } from '@/components/settings-card';
import UnavailableFeature from '@/components/unavailable-feature';

// Get currency symbol from admin data
const currencySymbol = window.yayboostData?.currencySymbol || '$';

// Display positions schema (grouped by page type)
const displayPositionsSchema = z.object({
  cart: z.array(z.string()).optional(),
  checkout: z.array(z.string()).optional(),
});

// Settings schema
const settingsSchema = z.object({
  enabled: z.boolean(),
  threshold: z.number().min(0).optional(),
  message_progress: z.string().min(1),
  message_achieved: z.string().min(1),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  display_positions: displayPositionsSchema,
  show_on_mini_cart: z.boolean(),
  show_progress_bar: z.boolean(),
  display_style: z.enum(['minimal_text', 'progress_bar', 'full_detail']),
  behavior_when_unlocked: z.enum(['show_message', 'hide_bar']),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

/** Allowed positions for cart page */
const CART_POSITIONS = ['before_cart_table', 'after_cart_table'];

/** Allowed positions for checkout page */
const CHECKOUT_POSITIONS = ['before_checkout_form', 'after_checkout_form'];

// Helper function to convert hex color to rgba with opacity
function applyOpacity(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function getBlockColors(
  primaryColor: string,
  achieved?: boolean,
): {
  backgroundColor: string;
  textColor: string;
  primaryColor: string;
} {
  return {
    primaryColor: primaryColor,
    backgroundColor: achieved ? primaryColor : applyOpacity(primaryColor, 0.2),
    textColor: achieved ? '#ffffff' : primaryColor,
  };
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
  const { backgroundColor, textColor } = getBlockColors(settings.primary_color, achieved);

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
  const { primaryColor, backgroundColor } = getBlockColors(settings.primary_color, achieved);

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
  const { primaryColor, backgroundColor, textColor } = getBlockColors(
    settings.primary_color,
    achieved,
  );

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
          style={{ backgroundColor: backgroundColor }}
        >
          <Gift className="h-3.5 w-3.5 text-white" />
        </div>
      </div>

      {/* CTA Section */}
      <div
        className="rounded-lg px-4 py-3 text-center text-sm font-medium"
        style={{
          backgroundColor: backgroundColor,
          color: textColor,
        }}
      >
        {message}
      </div>
    </div>
  );
}

const MOCK_THRESHOLD = 100;

// Preview component
function ShippingBarPreview({
  settings,
  cartValue = 30,
}: {
  settings: SettingsFormData;
  cartValue?: number;
}) {
  // Use default threshold value
  const mockData = useMemo(() => {
    const remaining = Math.max(0, MOCK_THRESHOLD - cartValue);
    const achieved = remaining <= 0;
    return {
      threshold: MOCK_THRESHOLD,
      remaining: remaining,
      progress: MOCK_THRESHOLD > 0 ? Math.min(100, (cartValue / MOCK_THRESHOLD) * 100) : 100,
      achieved: achieved,
      message: achieved
        ? settings.message_achieved
        : settings.message_progress.replace(
            '{remaining}',
            `${currencySymbol}${remaining.toFixed(2)}`,
          ),
      displayStyle: settings.display_style || 'minimal_text',
    };
  }, [cartValue, settings.message_progress, settings.message_achieved, settings.display_style]);

  switch (mockData.displayStyle) {
    case 'progress_bar':
      return (
        <ProgressBarBar
          message={mockData.message}
          achieved={mockData.achieved}
          progress={mockData.progress}
          settings={settings}
        />
      );
    case 'full_detail':
      return (
        <FullDetailBar
          message={mockData.message}
          achieved={mockData.achieved}
          progress={mockData.progress}
          cartTotal={cartValue}
          threshold={mockData.threshold}
          settings={settings}
        />
      );
    default:
      return (
        <MinimalTextBar
          message={mockData.message}
          achieved={mockData.achieved}
          settings={settings}
        />
      );
  }
}

export default function FreeShippingBarFeature({ featureId }: FeatureComponentProps) {
  const { data: feature, isLoading, isFetching } = useFeature(featureId);
  const updateSettings = useUpdateFeatureSettings();
  const toggleMutation = useToggleFeature();
  const [previewValue, setPreviewValue] = useState(30);

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

  // Handle preset color selection
  const handlePresetClick = (preset: (typeof COLOR_PRESETS)[number]) => {
    form.setValue('primary_color', preset.primaryColor, { shouldDirty: true });
    form.trigger(['primary_color']);
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
      <FeatureLayoutHeader title={feature.name} description={feature.description} />
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Settings Form */}
        <div className="space-y-6">
          {/* General Section */}
          <SettingsCard
            headless
            title="Configure Free Shipping Bar"
            onSave={() => {
              form.handleSubmit(onSubmit)();
            }}
            isDirty={form.formState.isDirty}
            isSaving={updateSettings.isPending}
            isLoading={isLoading}
            onReset={() => {
              form.reset(feature.settings as SettingsFormData);
            }}
          >
            <div className="space-y-1">
              <h3 className="text-sm font-medium">{__('Show On', 'yayboost')}</h3>
              <p className="text-muted-foreground text-xs">
                {__('Configure where the free shipping bar should be displayed', 'yayboost')}
              </p>
            </div>
            <FormField
              control={form.control}
              name="display_positions"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormControl>
                    <DisplayPositionMultiSelect
                      pageTypes={[PAGE_CART, PAGE_CHECKOUT]}
                      value={field.value as PositionsByPage}
                      onChange={field.onChange}
                      allowedPositions={{
                        [PAGE_CART]: CART_POSITIONS,
                        [PAGE_CHECKOUT]: CHECKOUT_POSITIONS,
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <Label className="text-sm font-medium mb-2">{__('Other places', 'yayboost')}</Label>
              <FormField
                control={form.control}
                name="show_on_mini_cart"
                render={({ field }) => (
                  <FormItem className="flex items-center space-y-0 space-x-3 pl-1">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      {__('Mini Cart', 'yayboost')}
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>
            <Separator />
            <div className="space-y-1">
              <h3 className="text-sm font-medium">{__('Style', 'yayboost')}</h3>
              <p className="text-muted-foreground text-xs">
                {__('Customize the style of the free shipping bar', 'yayboost')}
              </p>
            </div>
            <FormField
              control={form.control}
              name="display_style"
              render={({ field }) => (
                <FormItem>
                  <Label>{__('Display style', 'yayboost')}</Label>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="minimal_text" id="style-minimal" />
                        <label htmlFor="style-minimal">{__('Minimal Text', 'yayboost')}</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="progress_bar" id="style-progress" />
                        <label htmlFor="style-progress">{__('Progress Bar', 'yayboost')}</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="full_detail" id="style-compact" />
                        <label htmlFor="style-compact">{__('Full Detail', 'yayboost')}</label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />
            <div className="space-y-1">
              <h3 className="text-sm font-medium">{__('Messages', 'yayboost')}</h3>
              <p className="text-muted-foreground text-xs">
                {__('Customize messages for the free shipping bar', 'yayboost')}
              </p>
            </div>
            <FormField
              control={form.control}
              name="message_progress"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="message-progress">{__('Progress Message', 'yayboost')}</Label>
                  <FormControl>
                    <Input id="message-progress" {...field} />
                  </FormControl>
                  <FormDescription>
                    {__('Available:', 'yayboost')} {'{remaining}'}, {'{threshold}'}, {'{current}'}
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
                  <Label htmlFor="message-achieved">{__('Achievement Message', 'yayboost')}</Label>
                  <FormControl>
                    <Input id="message-achieved" {...field} />
                  </FormControl>
                  <FormDescription>
                    {__('Shown when customer qualifies for free shipping', 'yayboost')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />
            <div className="space-y-1">
              <h3 className="text-sm font-medium">{__('Appearance', 'yayboost')}</h3>
              <p className="text-muted-foreground text-xs">
                {__('Customize colors and style of the free shipping bar', 'yayboost')}
              </p>
            </div>
            {/* Color Presets */}
            <div>
              <Label className="mb-3">{__('Color Presets', 'yayboost')}</Label>
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
                  <Label>{__('Primary Color', 'yayboost')}</Label>
                  <FormControl>
                    <ColorPicker
                      value={field.value}
                      defaultColor="#000000"
                      onChangeColor={field.onChange}
                    />
                  </FormControl>
                  <FormDescription>
                    {__('Background will use 20% opacity of this color', 'yayboost')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />
            <div className="space-y-1">
              <h3 className="text-sm font-medium">{__('Behavior', 'yayboost')}</h3>
              <p className="text-muted-foreground text-xs">
                {__('Configure behavior of the free shipping bar', 'yayboost')}
              </p>
            </div>
            <FormField
              control={form.control}
              name="behavior_when_unlocked"
              render={({ field }) => (
                <FormItem>
                  <Label>{__('When free shipping unlocked', 'yayboost')}</Label>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="show_message" id="behavior-show" />
                        <label htmlFor="behavior-show">
                          {__('Show success message', 'yayboost')}
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="hide_bar" id="behavior-hide" />
                        <label htmlFor="behavior-hide">
                          {__('Hide bar completely', 'yayboost')}
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SettingsCard>
          {/* Gutenberg Block Info Section */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
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
            </AlertDescription>
          </Alert>
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
                {__('See how the bar will look on your store', 'yayboost')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Preview controls */}
              <div>
                <label className="text-sm font-medium">
                  {__('Simulate Cart Value', 'yayboost')} ({currencySymbol})
                </label>
                <Slider
                  value={[previewValue]}
                  onValueChange={(value) => setPreviewValue(value[0])}
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
                  <p className="mb-2 text-sm font-medium">{__('Achieved State:', 'yayboost')}</p>
                  <ShippingBarPreview settings={watchedValues} cartValue={110} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Form>
  );
}
