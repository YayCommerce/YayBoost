/**
 * Order Bump Global Settings
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';

import { useFeature, useUpdateFeatureSettings } from '@/hooks/use-features';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BumpSettingsProps {
  featureId: string;
}

const settingsSchema = z.object({
  default_position: z.enum(['before_payment', 'after_order_review', 'before_billing', 'after_billing']),
  max_bumps_per_page: z.number().min(1).max(10),
  show_product_image: z.boolean(),
  checkbox_style: z.enum(['default', 'highlighted', 'minimal']),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export function BumpSettings({ featureId }: BumpSettingsProps) {
  const { data: feature, isLoading } = useFeature(featureId);
  const updateSettings = useUpdateFeatureSettings();

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      default_position: 'before_payment',
      max_bumps_per_page: 3,
      show_product_image: true,
      checkbox_style: 'default',
    },
  });

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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={`/features/${featureId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h2 className="text-xl font-semibold">Order Bump Settings</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Display Settings</CardTitle>
          <CardDescription>Configure how bump offers appear on checkout</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="default_position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Position</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="before_payment">Before payment methods</SelectItem>
                        <SelectItem value="after_order_review">After order review</SelectItem>
                        <SelectItem value="before_billing">Before billing form</SelectItem>
                        <SelectItem value="after_billing">After billing form</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Where bump offers appear on the checkout page
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_bumps_per_page"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Bumps Per Page</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 3)}
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum number of bump offers to show at once
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="checkbox_style"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Checkbox Style</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select style" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="highlighted">Highlighted border</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="show_product_image"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Show Product Image</FormLabel>
                      <FormDescription>
                        Display product thumbnail in bump offers
                      </FormDescription>
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
    </div>
  );
}
