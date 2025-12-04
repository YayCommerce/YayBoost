/**
 * Sample Boost Feature - Recently Viewed Products
 *
 * This is an example of a simple settings-only feature.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

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
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';

// Settings schema
const settingsSchema = z.object({
  max_products: z.number().min(1).max(50),
  display_limit: z.number().min(1).max(20),
  columns: z.number().min(1).max(6),
  show_on_product_page: z.boolean(),
  title: z.string().min(1).max(100),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SampleBoostFeature({ featureId }: FeatureComponentProps) {
  const { data: feature, isLoading } = useFeature(featureId);
  const updateSettings = useUpdateFeatureSettings();

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      max_products: 10,
      display_limit: 5,
      columns: 4,
      show_on_product_page: true,
      title: 'Recently Viewed Products',
    },
    values: feature?.settings as SettingsFormData,
  });

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
      <Card>
        <CardHeader>
          <CardTitle>Display Settings</CardTitle>
          <CardDescription>Configure how recently viewed products are displayed</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Recently Viewed Products" />
                    </FormControl>
                    <FormDescription>
                      The heading displayed above the product list
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="max_products"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Products to Track</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>Maximum products to remember</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="display_limit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Limit</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>Products shown at once</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="columns"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Columns</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>Grid columns (1-6)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="show_on_product_page"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Show on Product Pages</FormLabel>
                      <FormDescription>
                        Automatically display recently viewed products on product pages
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
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
          <CardTitle>Shortcode</CardTitle>
          <CardDescription>Use this shortcode to display recently viewed products</CardDescription>
        </CardHeader>
        <CardContent>
          <code className="block rounded bg-muted p-3 text-sm">
            [yayboost_recently_viewed limit="5" columns="4"]
          </code>
        </CardContent>
      </Card>
    </div>
  );
}
