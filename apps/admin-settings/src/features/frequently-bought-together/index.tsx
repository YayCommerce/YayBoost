/**
 * Frequently Bought Together Feature Settings
 *
 * Settings form for Frequently Bought Together feature.
 */

import { useEffect } from 'react';
import { FeatureComponentProps } from '@/features';
import { zodResolver } from '@hookform/resolvers/zod';
import { __ } from '@wordpress/i18n';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useFeature, useUpdateFeatureSettings } from '@/hooks/use-features';
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
import FeatureLayoutHeader from '@/components/feature-layout-header';
import UnavailableFeature from '@/components/unavailable-feature';

// Settings schema
const settingsSchema = z.object({
  enabled: z.boolean(),
  max_products: z.number().min(1).max(20),
  min_order_threshold: z.number().min(0).max(100), // percentage
  show_on: z.array(z.string()), // ['product_page', 'cart_page', 'mini_cart']
  layout: z.enum(['grid', 'list', 'slider']),
  section_title: z.string().min(1),
  hide_if_in_cart: z.enum(['hide', 'show']), // 'hide' = hide it, 'show' = still show it
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const showOnOptions = [
  { id: 'product_page', label: __('Product Page', 'yayboost') },
  { id: 'cart_page', label: __('Cart Page', 'yayboost') },
  { id: 'mini_cart', label: __('Mini Cart', 'yayboost') },
];

const layoutOptions = [
  { value: 'grid', label: __('Grid', 'yayboost') },
  { value: 'list', label: __('List', 'yayboost') },
  { value: 'slider', label: __('Slider', 'yayboost') },
];

export default function FrequentlyBoughtTogetherFeature({ featureId }: FeatureComponentProps) {
  const { data: feature, isLoading, isFetching } = useFeature(featureId);
  const updateSettings = useUpdateFeatureSettings();

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: feature?.settings as SettingsFormData,
  });

  const { isDirty } = form.formState;

  const onSubmit = (data: SettingsFormData) => {
    updateSettings.mutate({ id: featureId, settings: data });
  };

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
      <FeatureLayoutHeader title={feature?.name ?? ''} description={feature?.description ?? ''} />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Save Button - Top Right */}
        <div className="flex justify-end">
          <Button type="submit" disabled={updateSettings.isPending || !isDirty}>
            {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>

        {/* General Section */}
        <Card>
          <CardHeader>
            <CardTitle>{__('General', 'yayboost')}</CardTitle>
            <CardDescription>
              {__('Enable or disable the Frequently Bought Together feature', 'yayboost')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{__('Enable Frequently Bought Together', 'yayboost')}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value ? 'on' : 'off'}
                      onValueChange={(value) => field.onChange(value === 'on')}
                      className="flex gap-6"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="on" id="enabled-on" />
                        <label htmlFor="enabled-on" className="cursor-pointer">
                          {__('On', 'yayboost')}
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="off" id="enabled-off" />
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

        {/* Recommend Products Section */}
        <Card>
          <CardHeader>
            <CardTitle>{__('Recommend products', 'yayboost')}</CardTitle>
            <CardDescription>
              {__('Configure product recommendation settings', 'yayboost')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="max_products"
              render={({ field }) => (
                <FormItem className="w-60">
                  <FormLabel>{__('Maximum products to show', 'yayboost')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="min_order_threshold"
              render={({ field }) => (
                <FormItem className="w-60">
                  <FormLabel>{__('Minimum Order Threshold', 'yayboost')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    {__('Recommend products appear in at least', 'yayboost')}{' '}
                    <strong>{field.value}%</strong> {__('of orders', 'yayboost')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Display Settings Section */}
        <Card>
          <CardHeader>
            <CardTitle>{__('Display Settings', 'yayboost')}</CardTitle>
            <CardDescription>
              {__(
                'Configure where and how to display frequently bought together products',
                'yayboost',
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="show_on"
              render={() => (
                <FormItem>
                  <FormLabel>{__('Show on', 'yayboost')}</FormLabel>
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
                            <FormLabel className="text-sm font-normal">{option.label}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={__('Select layout', 'yayboost')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {layoutOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="section_title"
              render={({ field }) => (
                <FormItem className="w-60">
                  <FormLabel>{__('Section title', 'yayboost')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={__('Complete Your Purchase', 'yayboost')} />
                  </FormControl>
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
            <CardDescription>
              {__(
                'Configure how to handle suggested products that are already in cart',
                'yayboost',
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="hide_if_in_cart"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {__('If suggested product is already in cart:', 'yayboost')}
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex gap-6"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="hide" id="hide-if-in-cart" />
                        <label htmlFor="hide-if-in-cart" className="cursor-pointer">
                          {__('Hide it', 'yayboost')}
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="show" id="show-if-in-cart" />
                        <label htmlFor="show-if-in-cart" className="cursor-pointer">
                          {__('Still show it', 'yayboost')}
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

        {/* Save Button - Bottom Right */}
        <div className="flex justify-end">
          <Button type="submit" disabled={updateSettings.isPending || !isDirty}>
            {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
