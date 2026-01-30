import { zodResolver } from '@hookform/resolvers/zod';
import { __ } from '@wordpress/i18n';
import { Eye } from 'lucide-react';
import z from 'zod';

import { useFeature, useUpdateFeatureSettings } from '@/hooks/use-features';
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
import { InputNumber } from '@/components/ui/input-number';
import { Label } from '@/components/ui/label';
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
  tracking_mode: z.enum(['real-orders', 'simulated']),
  real_orders: z.object({
    order_time_range: z.enum(['last-24-hours', 'last-7-days', 'last-30-days', 'all-time']),
    order_status: z.array(z.enum(['completed', 'processing', 'on-hold'])),
    minimum_order_required: z.number().min(1),
  }),
  timing: z.object({
    delay: z.number().min(1),
    interval: z.number().min(1),
  }),
  display: z.object({
    customer_name: z.enum([
      'full-name',
      'first-name-only',
      'first-name-initial',
      'initial-only',
      'Anonymous',
    ]),
    product_details: z.array(z.enum(['title', 'price', 'rating'])),
  }),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function RecentPurchaseNotificationFeature({ featureId }: FeatureComponentProps) {
  const { data: feature, isLoading, isFetching } = useFeature(featureId);
  const updateSettings = useUpdateFeatureSettings();

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
          </div>
          <FormField
            control={form.control}
            name="tracking_mode"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup value={field.value} onValueChange={field.onChange}>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="real-orders" id="real-orders" />
                      <div className="space-y-1">
                        <Label htmlFor="real-orders">{__('Real Orders', 'yayboost')}</Label>
                        <FormDescription>
                          {__('Display actual purchases from your store.', 'yayboost')}
                        </FormDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="simulated" id="simulated" />
                      <div className="space-y-1">
                        <Label htmlFor="simulated">{__('Simulated', 'yayboost')}</Label>
                        <FormDescription>
                          {__('Generate virtual purchase notifications.', 'yayboost')}
                        </FormDescription>
                      </div>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Real Orders Settings */}
          {trackingMode === 'real-orders' && (
            <div className="space-y-4">
              <Label>{__('Real Order Settings', 'yayboost')}</Label>
              <div className="space-y-4 pt-2">
                <FormField
                  control={form.control}
                  name="real_orders.order_time_range"
                  render={({ field }) => (
                    <FormItem>
                      <Label>{__('Order time range', 'yayboost')}</Label>
                      <Select
                        value={field.value?.toString() ?? 'last-24-hours'}
                        onValueChange={(value) => field.onChange(value)}
                      >
                        <FormControl>
                          <SelectTrigger className="w-46">
                            <SelectValue placeholder={__('Select order time range', 'yayboost')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="last-24-hours">Last 24 hours</SelectItem>
                          <SelectItem value="last-7-days">Last 7 days</SelectItem>
                          <SelectItem value="last-30-days">Last 30 days</SelectItem>
                          <SelectItem value="all-time">All time</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="real_orders.order_status"
                  render={({ field }) => (
                    <FormItem className="flex flex-col gap-2">
                      <Label>{__('Order status to include', 'yayboost')}</Label>
                      <FormControl>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="order-status-completed"
                              checked={field.value?.includes('completed')}
                              onCheckedChange={(checked) => {
                                const currentValue = field.value ?? [];
                                if (checked) {
                                  field.onChange([...currentValue, 'completed']);
                                } else {
                                  field.onChange(currentValue.filter((v) => v !== 'completed'));
                                }
                              }}
                            />
                            <Label htmlFor="product-details-title" className="text-sm font-normal">
                              {__('Completed', 'yayboost')}
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="order-status-processing"
                              checked={field.value?.includes('processing')}
                              onCheckedChange={(checked) => {
                                const currentValue = field.value ?? [];
                                if (checked) {
                                  field.onChange([...currentValue, 'processing']);
                                } else {
                                  field.onChange(currentValue.filter((v) => v !== 'processing'));
                                }
                              }}
                            />
                            <Label
                              htmlFor="order-status-processing"
                              className="text-sm font-normal"
                            >
                              {__('Processing', 'yayboost')}
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="order-status-on-hold"
                              checked={field.value?.includes('on-hold')}
                              onCheckedChange={(checked) => {
                                const currentValue = field.value ?? [];
                                if (checked) {
                                  field.onChange([...currentValue, 'on-hold']);
                                } else {
                                  field.onChange(currentValue.filter((v) => v !== 'on-hold'));
                                }
                              }}
                            />
                            <Label htmlFor="order-status-on-hold" className="text-sm font-normal">
                              {__('On hold', 'yayboost')}
                            </Label>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="real_orders.minimum_order_required"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="minimum-order-required">
                        {__('Minimum order required', 'yayboost')}
                      </Label>
                      <FormControl>
                        <div className="w-fit">
                          <InputNumber
                            {...field}
                            id="minimum-order-required"
                            min={1}
                            onValueChange={(value) => field.onChange(value || 1)}
                            value={parseInt(field.value?.toString() ?? '1', 10)}
                            className="w-24"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        {__('If fewer orders exist, notifications will be hidden.', 'yayboost')}
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
              <span>
                {__('The system will use a random product to simulate an order.', 'yayboost')}
              </span>
            </div>
          )}
          {/* Timing Settings */}
          <Separator />
          <div className="space-y-1">
            <h3 className="text-sm font-medium">{__('Timing', 'yayboost')}</h3>
          </div>
          <FormField
            control={form.control}
            name="timing.delay"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="delay">{__('Initial delay (seconds)', 'yayboost')}</Label>
                <FormControl>
                  <div className="w-fit">
                    <InputNumber
                      {...field}
                      id="delay"
                      min={1}
                      onValueChange={(value) => field.onChange(value || 1)}
                      value={parseInt(field.value?.toString() ?? '1', 10)}
                      className="w-24"
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  {__('Wait before showing first notification.', 'yayboost')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="timing.interval"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="interval">
                  {__('Interval between notifications (seconds)', 'yayboost')}
                </Label>
                <FormControl>
                  <div className="w-fit">
                    <InputNumber
                      {...field}
                      id="interval"
                      min={1}
                      onValueChange={(value) => field.onChange(value || 1)}
                      value={parseInt(field.value?.toString() ?? '1', 10)}
                      className="w-24"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Separator />
          <div className="space-y-1">
            <h3 className="text-sm font-medium">{__('Display Settings', 'yayboost')}</h3>
          </div>
          <FormField
            control={form.control}
            name="display.customer_name"
            render={({ field }) => (
              <FormItem>
                <Label>{__('Customer name', 'yayboost')}</Label>
                <Select
                  value={field.value ?? 'full_name'}
                  onValueChange={(value) => field.onChange(value)}
                >
                  <FormControl>
                    <SelectTrigger className="w-46">
                      <SelectValue placeholder={__('Select options', 'yayboost')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="full-name">{__('Full name', 'yayboost')}</SelectItem>
                    <SelectItem value="first-name-only">
                      {__('First name only', 'yayboost')}
                    </SelectItem>
                    <SelectItem value="first-name-initial">
                      {__('First name + Initial', 'yayboost')}
                    </SelectItem>
                    <SelectItem value="initial-only">{__('Initial only', 'yayboost')}</SelectItem>
                    <SelectItem value="Anonymous">{__('Anonymous', 'yayboost')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="display.product_details"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-2">
                <Label>{__('Product details', 'yayboost')}</Label>
                <FormControl>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="product-details-title"
                        checked={field.value?.includes('title')}
                        onCheckedChange={(checked) => {
                          const currentValue = field.value ?? [];
                          if (checked) {
                            field.onChange([...currentValue, 'title']);
                          } else {
                            field.onChange(currentValue.filter((v) => v !== 'title'));
                          }
                        }}
                      />
                      <Label htmlFor="product-details-title" className="text-sm font-normal">
                        {__('Title', 'yayboost')}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="product-details-price"
                        checked={field.value?.includes('price')}
                        onCheckedChange={(checked) => {
                          const currentValue = field.value ?? [];
                          if (checked) {
                            field.onChange([...currentValue, 'price']);
                          } else {
                            field.onChange(currentValue.filter((v) => v !== 'price'));
                          }
                        }}
                      />
                      <Label htmlFor="product-details-price" className="text-sm font-normal">
                        {__('Price', 'yayboost')}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="product-details-rating"
                        checked={field.value?.includes('rating')}
                        onCheckedChange={(checked) => {
                          const currentValue = field.value ?? [];
                          if (checked) {
                            field.onChange([...currentValue, 'rating']);
                          } else {
                            field.onChange(currentValue.filter((v) => v !== 'rating'));
                          }
                        }}
                      />
                      <Label htmlFor="product-details-rating" className="text-sm font-normal">
                        {__('Rating', 'yayboost')}
                      </Label>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
            <CardContent className="space-y-6">Preview</CardContent>
          </Card>
        </div>
      </div>
    </Form>
  );
}
