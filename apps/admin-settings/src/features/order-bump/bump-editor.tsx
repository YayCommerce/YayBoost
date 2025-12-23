/**
 * Bump Editor - Create/Edit bump offer
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';

import { useCreateEntity, useEntity, useUpdateEntity } from '@/hooks/use-entities';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BumpEditorProps {
  featureId: string;
}

// Form schema
const bumpSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  product_id: z.number().min(1, 'Product is required'),
  headline: z.string().optional(),
  description: z.string().optional(),
  discount_type: z.enum(['none', 'percentage', 'fixed']),
  discount_value: z.number().min(0),
  trigger_type: z.enum(['all', 'specific_products', 'specific_categories', 'cart_total']),
  trigger_products: z.array(z.number()).optional(),
  trigger_categories: z.array(z.number()).optional(),
  min_cart_total: z.number().optional(),
  quantity: z.number().min(1).default(1),
  priority: z.number().default(10),
});

type BumpFormData = z.infer<typeof bumpSchema>;

export function BumpEditor({ featureId }: BumpEditorProps) {
  const navigate = useNavigate();
  const { bumpId } = useParams<{ bumpId: string }>();
  const isEditing = !!bumpId;

  const { data: bump, isLoading } = useEntity(
    featureId,
    bumpId ? parseInt(bumpId) : 0,
    'bump',
  );

  const createEntity = useCreateEntity(featureId);
  const updateEntity = useUpdateEntity(featureId);

  const form = useForm<BumpFormData>({
    resolver: zodResolver(bumpSchema),
    defaultValues: {
      name: '',
      product_id: 0,
      headline: '',
      description: '',
      discount_type: 'none',
      discount_value: 0,
      trigger_type: 'all',
      trigger_products: [],
      trigger_categories: [],
      min_cart_total: 0,
      quantity: 1,
      priority: 10,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (bump) {
      const settings = bump.settings as Record<string, any>;
      form.reset({
        name: bump.name,
        product_id: settings?.product_id || 0,
        headline: settings?.headline || '',
        description: settings?.description || '',
        discount_type: settings?.discount_type || 'none',
        discount_value: settings?.discount_value || 0,
        trigger_type: settings?.trigger_type || 'all',
        trigger_products: settings?.trigger_products || [],
        trigger_categories: settings?.trigger_categories || [],
        min_cart_total: settings?.min_cart_total || 0,
        quantity: settings?.quantity || 1,
        priority: bump.priority,
      });
    }
  }, [bump, form]);

  const onSubmit = async (data: BumpFormData) => {
    const entityData = {
      name: data.name,
      entity_type: 'bump',
      priority: data.priority,
      settings: {
        product_id: data.product_id,
        headline: data.headline,
        description: data.description,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        trigger_type: data.trigger_type,
        trigger_products: data.trigger_products,
        trigger_categories: data.trigger_categories,
        min_cart_total: data.min_cart_total,
        quantity: data.quantity,
      },
    };

    try {
      if (isEditing) {
        await updateEntity.mutateAsync({
          entityId: parseInt(bumpId!),
          entity: entityData,
        });
      } else {
        await createEntity.mutateAsync(entityData);
      }
      navigate(`/features/${featureId}`);
    } catch (error) {
      console.error('Failed to save bump:', error);
    }
  };

  const watchTriggerType = form.watch('trigger_type');
  const watchDiscountType = form.watch('discount_type');

  if (isEditing && isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">
          {isEditing ? 'Edit Bump Offer' : 'Create Bump Offer'}
        </h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column - Basic Info */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Name and product details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bump Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Add Gift Wrapping" />
                        </FormControl>
                        <FormDescription>
                          Internal name for identification
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="product_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bump Product</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            placeholder="Product ID"
                          />
                        </FormControl>
                        <FormDescription>
                          The product to offer as a bump
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="headline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Headline</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Add this to your order!" />
                        </FormControl>
                        <FormDescription>
                          Compelling headline shown to customers
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Describe why customers should add this..."
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Discount</CardTitle>
                  <CardDescription>Optional discount for the bump product</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="discount_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select discount type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No discount</SelectItem>
                            <SelectItem value="percentage">Percentage off</SelectItem>
                            <SelectItem value="fixed">Fixed amount off</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchDiscountType !== 'none' && (
                    <FormField
                      control={form.control}
                      name="discount_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {watchDiscountType === 'percentage' ? 'Discount %' : 'Discount Amount ($)'}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step={watchDiscountType === 'percentage' ? '1' : '0.01'}
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Trigger Conditions */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Display Conditions</CardTitle>
                  <CardDescription>When should this bump be shown?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="trigger_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Show When</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select trigger" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="all">All checkouts</SelectItem>
                            <SelectItem value="specific_products">Cart contains specific products</SelectItem>
                            <SelectItem value="specific_categories">Cart contains category</SelectItem>
                            <SelectItem value="cart_total">Cart total meets minimum</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchTriggerType === 'specific_products' && (
                    <FormField
                      control={form.control}
                      name="trigger_products"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trigger Product IDs</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., 123, 456, 789"
                              value={field.value?.join(', ') || ''}
                              onChange={(e) => {
                                const ids = e.target.value
                                  .split(',')
                                  .map((s) => parseInt(s.trim()))
                                  .filter((n) => !isNaN(n));
                                field.onChange(ids);
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Comma-separated product IDs
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {watchTriggerType === 'specific_categories' && (
                    <FormField
                      control={form.control}
                      name="trigger_categories"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trigger Category IDs</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., 10, 20, 30"
                              value={field.value?.join(', ') || ''}
                              onChange={(e) => {
                                const ids = e.target.value
                                  .split(',')
                                  .map((s) => parseInt(s.trim()))
                                  .filter((n) => !isNaN(n));
                                field.onChange(ids);
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Comma-separated category IDs
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {watchTriggerType === 'cart_total' && (
                    <FormField
                      control={form.control}
                      name="min_cart_total"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Cart Total ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormDescription>
                          Quantity added to cart when bump is selected
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 10)}
                          />
                        </FormControl>
                        <FormDescription>
                          Lower number = shown first
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createEntity.isPending || updateEntity.isPending}
            >
              {createEntity.isPending || updateEntity.isPending
                ? 'Saving...'
                : isEditing
                  ? 'Update Bump'
                  : 'Create Bump'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
