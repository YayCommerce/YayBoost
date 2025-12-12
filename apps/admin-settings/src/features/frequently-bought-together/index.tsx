/**
 * Frequently Bought Together Feature Settings
 *
 * Settings form for Frequently Bought Together feature.
 */

import { useEffect } from 'react';
import { FeatureComponentProps } from '@/features';
import { zodResolver } from '@hookform/resolvers/zod';
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

// Settings schema
const settingsSchema = z.object({
  enabled: z.boolean(),
  max_products: z.number().min(1).max(20),
  min_order_threshold: z.number().min(0).max(100), // percentage
  show_on: z.array(z.string()), // ['product_page', 'cart_page', 'mini_cart']
  layout: z.enum(['grid', 'list', 'slider']),
  section_title: z.string().min(1),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const showOnOptions = [
  { id: 'product_page', label: 'Product Page' },
  { id: 'cart_page', label: 'Cart Page' },
  { id: 'mini_cart', label: 'Mini Cart' },
];

const layoutOptions = [
  { value: 'grid', label: 'Grid' },
  { value: 'list', label: 'List' },
  { value: 'slider', label: 'Slider' },
];

export default function FrequentlyBoughtTogetherFeature({ featureId }: FeatureComponentProps) {
  const { data: feature, isLoading } = useFeature(featureId);
  const updateSettings = useUpdateFeatureSettings();

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      enabled: false,
      max_products: 4,
      min_order_threshold: 5,
      show_on: ['product_page', 'cart_page'],
      layout: 'grid',
      section_title: 'Complete Your Purchase',
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
      {/* General Section */}
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            Enable or disable the Frequently Bought Together feature
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enable Frequently Bought Together</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value ? 'on' : 'off'}
                        onValueChange={(value) => field.onChange(value === 'on')}
                        className="flex gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="on" id="enabled-on" />
                          <label htmlFor="enabled-on" className="cursor-pointer">
                            On
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="off" id="enabled-off" />
                          <label htmlFor="enabled-off" className="cursor-pointer">
                            Off
                          </label>
                        </div>
                      </RadioGroup>
                    </FormControl>
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

      {/* Recommend Products Section */}
      <Card>
        <CardHeader>
          <CardTitle>Recommend products</CardTitle>
          <CardDescription>Configure product recommendation settings</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="max_products"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum products to show</FormLabel>
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
                  <FormItem>
                    <FormLabel>Minimum Order Threshold</FormLabel>
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
                      Recommend products appear in at least <strong>{field.value}%</strong> of
                      orders
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

      {/* Display Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle>Display Settings</CardTitle>
          <CardDescription>
            Choose where to show frequently bought together products
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="show_on"
                render={() => (
                  <FormItem>
                    <FormLabel>Show on</FormLabel>
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
                              <FormLabel className="cursor-pointer font-normal">
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

              <div className="flex justify-end">
                <Button type="submit" disabled={updateSettings.isPending}>
                  {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Layout Section */}
      <Card>
        <CardHeader>
          <CardTitle>Layout</CardTitle>
          <CardDescription>Choose the display layout for products</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="layout"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Layout</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select layout" />
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

              <div className="flex justify-end">
                <Button type="submit" disabled={updateSettings.isPending}>
                  {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Section Title Section */}
      <Card>
        <CardHeader>
          <CardTitle>Section title</CardTitle>
          <CardDescription>Customize the section title displayed to customers</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="section_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Complete Your Purchase" />
                    </FormControl>
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
  );
}
