/**
 * Frequently Bought Together Feature Settings
 *
 * Settings form for Frequently Bought Together feature.
 */
import { useMemo, useState } from 'react';
import { FeatureComponentProps } from '@/features';
import { zodResolver } from '@hookform/resolvers/zod';
import { __ } from '@wordpress/i18n';
import { Eye } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { cn } from '@/lib/utils';
import { useFeature, useUpdateFeatureSettings } from '@/hooks/use-features';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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

import { FBTBackfillCard } from './fbt-backfill-card';

// Get currency symbol from admin data
const currencySymbol = window.yayboostData?.currencySymbol || '$';

// Mock products for preview
const MOCK_PRODUCTS = [
  { id: 1, name: 'Product A', price: 18 },
  { id: 2, name: 'Product B', price: 16 },
  { id: 3, name: 'Product C', price: 55 },
];

// Settings schema
const settingsSchema = z.object({
  enabled: z.boolean(),
  max_products: z.number().min(1).max(20),
  min_order_threshold: z.number().min(0).max(100), // percentage
  layout: z.enum(['grid', 'list']),
  section_title: z.string().min(1),
  hide_if_in_cart: z.enum(['hide', 'show']), // 'hide' = hide it, 'show' = still show it
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const layoutOptions = [
  { value: 'grid', label: __('Grid', 'yayboost') },
  { value: 'list', label: __('List', 'yayboost') },
];

// Preview component - matches frontend template structure (fbt-products.php + fbt.css)
function FBTPreview({ settings }: { settings: SettingsFormData }) {
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(
    new Set(MOCK_PRODUCTS.map((p) => p.id)),
  );

  // Calculate total price from selected products
  const totalPrice = useMemo(() => {
    return MOCK_PRODUCTS.filter((product) => selectedProducts.has(product.id)).reduce(
      (sum, product) => sum + (product.price || 0),
      0,
    );
  }, [selectedProducts]);

  // Limit products by max_products setting
  const displayProducts = MOCK_PRODUCTS.slice(0, settings.max_products || 4);

  const toggleProduct = (productId: number) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const formatPrice = (price: number) => {
    return `${currencySymbol}${price.toFixed(2)}`;
  };

  const isGrid = settings.layout === 'grid';

  return (
    <div
      className="yayboost-fbt"
      style={{
        padding: '1.5rem',
        background: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
      }}
    >
      {/* Title */}
      <h2
        className="yayboost-fbt__title"
        style={{ margin: '0 0 1.5rem', textAlign: 'center', fontSize: '1.25rem', fontWeight: 600 }}
      >
        {settings.section_title || __('Frequently Bought Together', 'yayboost')}
      </h2>

      {/* Products Grid/List */}
      <div
        className={`yayboost-fbt__products yayboost-fbt__products--${settings.layout}`}
        style={
          isGrid
            ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }
            : { display: 'flex', flexDirection: 'column', gap: '1rem' }
        }
      >
        {displayProducts.map((product) => {
          const isSelected = selectedProducts.has(product.id);
          return (
            <label
              key={product.id}
              htmlFor={`fbt-preview-${product.id}`}
              className={cn('yayboost-fbt__product', !isSelected && 'is-unchecked')}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: isGrid ? 'column' : 'row',
                alignItems: isGrid ? 'stretch' : 'center',
                gap: isGrid ? '0' : '1rem',
                padding: '1rem',
                background: '#fafafa',
                border: '1px solid #eee',
                borderRadius: '6px',
                cursor: 'pointer',
                opacity: isSelected ? 1 : 0.6,
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            >
              {/* Checkbox - absolute positioned top-left */}
              <div
                className="yayboost-fbt__checkbox"
                style={{
                  position: 'absolute',
                  top: '0.75rem',
                  left: '0.75rem',
                  zIndex: 10,
                }}
              >
                <input
                  type="checkbox"
                  id={`fbt-preview-${product.id}`}
                  checked={isSelected}
                  onChange={() => toggleProduct(product.id)}
                  style={{ width: '18px', height: '18px', margin: 0, cursor: 'pointer' }}
                />
              </div>

              {/* Image */}
              <div
                className="yayboost-fbt__image"
                style={{
                  marginBottom: isGrid ? '0.75rem' : 0,
                  textAlign: 'center',
                  width: isGrid ? 'auto' : '80px',
                  flexShrink: 0,
                }}
              >
                <img
                  src={window.yayboostData?.urls?.wcPlaceholderImage}
                  alt={product.name}
                  style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }}
                />
              </div>

              {/* Info */}
              <div
                className="yayboost-fbt__info"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  flexGrow: 1,
                }}
              >
                <h3
                  className="yayboost-fbt__name"
                  style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500 }}
                >
                  {product.name}
                </h3>
                <span
                  className="yayboost-fbt__price"
                  style={{ fontWeight: 600, color: '#333' }}
                >
                  {formatPrice(product.price)}
                </span>
              </div>
            </label>
          );
        })}
      </div>

      {/* Footer */}
      <div
        className="yayboost-fbt__footer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginTop: '1.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid #eee',
        }}
      >
        <div className="yayboost-fbt__total" style={{ fontSize: '1.1rem' }}>
          <span className="yayboost-fbt__total-label" style={{ color: '#666', marginRight: '0.5rem' }}>
            {__('Total:', 'yayboost')}
          </span>
          <span className="yayboost-fbt__total-price" style={{ fontWeight: 600, color: '#0073aa' }}>
            {formatPrice(totalPrice)}
          </span>
        </div>
        <button
          type="button"
          className="yayboost-fbt__add-btn button alt"
          disabled={selectedProducts.size === 0}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '0.9rem',
            cursor: selectedProducts.size === 0 ? 'not-allowed' : 'pointer',
            opacity: selectedProducts.size === 0 ? 0.6 : 1,
          }}
        >
          {__('Add Selected to Cart', 'yayboost')}
        </button>
      </div>
    </div>
  );
}

export default function FrequentlyBoughtTogetherFeature({ featureId }: FeatureComponentProps) {
  const { data: feature, isLoading, isFetching } = useFeature(featureId);
  const updateSettings = useUpdateFeatureSettings();

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: feature?.settings as SettingsFormData,
  });

  const { isDirty } = form.formState;

  const watchedValues = form.watch();

  const onSubmit = (data: SettingsFormData) => {
    updateSettings.mutate(
      { id: featureId, settings: data },
      {
        onSuccess: () => {
          form.reset(data);
        },
      },
    );
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
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <SettingsCard
            headless
            title="Configure Frequently Bought Together"
            onSave={() => {
              form.handleSubmit(onSubmit)();
            }}
            isDirty={form.formState.isDirty}
            isSaving={updateSettings.isPending}
            isLoading={isLoading}
            onReset={() => {
              form.reset(feature?.settings as SettingsFormData);
            }}
          >
            <div className="space-y-1">
              <h3 className="text-sm font-medium">{__('Recommend products', 'yayboost')}</h3>
              <p className="text-muted-foreground text-xs">
                {__('Configure product recommendation settings', 'yayboost')}
              </p>
            </div>
            <FormField
              control={form.control}
              name="max_products"
              render={({ field }) => (
                <FormItem className="w-60">
                  <Label>{__('Maximum products to show', 'yayboost')}</Label>
                  <FormControl>
                    <InputNumber
                      value={field.value}
                      onValueChange={field.onChange}
                      min={1}
                      max={20}
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
                  <Label>{__('Minimum Order Threshold', 'yayboost')}</Label>
                  <FormControl>
                    <InputNumber
                      value={field.value}
                      onValueChange={field.onChange}
                      min={0}
                      max={100}
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
            <Separator />
            <div className="space-y-1">
              <h3 className="text-sm font-medium">{__('Display Settings', 'yayboost')}</h3>
              <p className="text-muted-foreground text-xs">
                {__(
                  'Configure where and how to display frequently bought together products',
                  'yayboost',
                )}
              </p>
            </div>
            <FormField
              control={form.control}
              name="layout"
              render={({ field }) => (
                <FormItem>
                  <Label>{__('Layout', 'yayboost')}</Label>
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
                  <Label>{__('Section title', 'yayboost')}</Label>
                  <FormControl>
                    <Input {...field} placeholder={__('Frequently Bought Together', 'yayboost')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />
            <div className="space-y-1">
              <h3 className="text-sm font-medium">{__('Behavior', 'yayboost')}</h3>
              <p className="text-muted-foreground text-xs">
                {__(
                  'Configure how to handle suggested products that are already in cart',
                  'yayboost',
                )}
              </p>
            </div>
            <FormField
              control={form.control}
              name="hide_if_in_cart"
              render={({ field }) => (
                <FormItem>
                  <Label>{__('If suggested product is already in cart:', 'yayboost')}</Label>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex gap-6"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="hide" id="hide-if-in-cart" />
                        <label htmlFor="hide-if-in-cart">{__('Hide it', 'yayboost')}</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="show" id="show-if-in-cart" />
                        <label htmlFor="show-if-in-cart">{__('Still show it', 'yayboost')}</label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SettingsCard>
          <FBTBackfillCard />
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
                {__('See how the section will look on your store', 'yayboost')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FBTPreview settings={watchedValues} />
            </CardContent>
          </Card>
        </div>
      </div>
    </Form>
  );
}
