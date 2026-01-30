/**
 * Next Order Coupon Feature Settings
 *
 * Automatically generate a coupon discount after each purchase to encourage repeat orders.
 */

import { useMemo } from 'react';
import { FeatureComponentProps } from '@/features';
import { zodResolver } from '@hookform/resolvers/zod';
import { __ } from '@wordpress/i18n';
import { CircleQuestionMark, Eye } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useFeature, useToggleFeature, useUpdateFeatureSettings } from '@/hooks/use-features';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import FeatureLayoutHeader from '@/components/feature-layout-header';
import { SettingsCard } from '@/components/settings-card';
import UnavailableFeature from '@/components/unavailable-feature';

// Get currency symbol from admin data
const currencySymbol = window.yayboostData?.currencySymbol || '$';

// Settings schema
const settingsSchema = z.object({
  enabled: z.boolean(),
  discount_type: z.enum(['percent', 'fixed_cart', 'free_shipping']),
  discount_value: z.number().min(0).optional(),
  coupon_prefix: z.string().min(1),
  expires_after: z.number().min(1),
  minimum_order_total: z.number().min(0).optional(),
  customer_type: z.enum(['all', 'first_time', 'returning']),
  // on_cancel_refund_action: z.enum(['delete_and_reset', 'keep_and_count']),
  minimum_spend_to_use: z.number().min(0),
  exclude_sale_items: z.boolean(),
  display_locations: z.array(z.string()),
  thank_you_headline: z.string().min(1),
  thank_you_message: z.string().min(1),
  email_content: z.string().min(1),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const displayLocationOptions = [
  { id: 'thank_you_page', label: __('Thank you page', 'yayboost') },
  { id: 'order_email', label: __('Order confirmation email', 'yayboost') },
  { id: 'my_account', label: __('My account → Orders', 'yayboost') },
];

// Helper function to format discount display
function formatDiscountDisplay(discountType: string, discountValue?: number): string {
  if (discountType === 'percent') {
    return `${discountValue || 0}%`;
  }
  if (discountType === 'fixed_cart') {
    return `${currencySymbol}${(discountValue || 0).toFixed(2)}`;
  }
  if (discountType === 'free_shipping') {
    return __('Free shipping', 'yayboost');
  }
  return '';
}

// Helper function to format coupon message with placeholders
function formatCouponMessage(
  template: string,
  couponCode: string,
  discount: string,
  expiry: string,
): string {
  return template
    .replace(/{coupon_code}/g, `<strong>${couponCode}</strong>`)
    .replace(/{discount}/g, discount)
    .replace(/{expiry}/g, expiry);
}

// Coupon Display Component (matches PHP render_coupon_display structure)
function CouponDisplay({
  couponCode,
  message,
  headline,
}: {
  couponCode: string;
  message: string;
  headline?: string;
}) {
  return (
    <div
      className="yayboost-next-order-coupon"
      style={{
        margin: '20px 0',
        padding: '20px',
        background: '#f8f9fa',
        borderRadius: '6px',
      }}
    >
      {headline && (
        <h3
          style={{
            margin: '0 0 12px 0',
            fontSize: '18px',
            fontWeight: 600,
          }}
        >
          {headline}
        </h3>
      )}
      <div
        style={{
          margin: '0 0 12px 0',
          fontSize: '14px',
        }}
        dangerouslySetInnerHTML={{ __html: message }}
      />
      <div
        style={{
          margin: 0,
          padding: '12px',
          background: '#ffffff',
          borderRadius: '6px',
          border: '1px solid #dee2e6',
        }}
      >
        <div
          style={{
            margin: '0 0 6px 0',
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'uppercase',
          }}
        >
          {__('Coupon code:', 'yayboost')}
        </div>
        <div
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 700,
          }}
        >
          {couponCode}
        </div>
      </div>
    </div>
  );
}

// Placeholder components for WooCommerce content
function ThankYouHeadingPlaceholder() {
  return (
    <div className="text-muted-foreground opacity-50">
      <h2 className="mb-2 text-2xl font-semibold">{__('Thanks for your order', 'yayboost')}</h2>
      <p className="text-sm">
        {__('We have received your order and will begin processing it right away.', 'yayboost')}
      </p>
    </div>
  );
}

function OrderTablePlaceholder() {
  return (
    <div className="text-muted-foreground rounded-lg border p-4 opacity-50">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{__('Product', 'yayboost')}</span>
          <span>{__('Total', 'yayboost')}</span>
        </div>
        <div className="border-t pt-2">
          <div className="flex justify-between text-sm">
            <span>{__('Sample Product × 1', 'yayboost')}</span>
            <span>{currencySymbol}29.99</span>
          </div>
        </div>
        <div className="flex justify-between border-t pt-2 font-semibold">
          <span>{__('Total:', 'yayboost')}</span>
          <span>{currencySymbol}29.99</span>
        </div>
      </div>
    </div>
  );
}

function EmailHeaderPlaceholder() {
  return (
    <div className="text-muted-foreground space-y-2 border-b pb-4 opacity-50">
      <h2 className="text-lg font-semibold">{__('Order Confirmation', 'yayboost')}</h2>
      <p className="text-sm">{__('Hello,', 'yayboost')}</p>
      <p className="text-sm">
        {__('Your order has been received and is now being processed.', 'yayboost')}
      </p>
    </div>
  );
}

function AddressSectionPlaceholder() {
  return (
    <div className="text-muted-foreground grid grid-cols-2 gap-4 opacity-50">
      <div>
        <h3 className="mb-2 font-semibold">{__('Shipping address', 'yayboost')}</h3>
        <div className="rounded border border-gray-300 bg-white p-3 text-sm">
          <div>{__('John Doe', 'yayboost')}</div>
          <div>{__('123 Main St', 'yayboost')}</div>
          <div>{__('City', 'yayboost')}</div>
          <div>{__('0901234567', 'yayboost')}</div>
        </div>
      </div>
      <div>
        <h3 className="mb-2 font-semibold">{__('Billing address', 'yayboost')}</h3>
        <div className="rounded border border-gray-300 bg-white p-3 text-sm">
          <div>{__('John Doe', 'yayboost')}</div>
          <div>{__('123 Main St', 'yayboost')}</div>
          <div>{__('City', 'yayboost')}</div>
          <div>{__('0901234567', 'yayboost')}</div>
        </div>
      </div>
    </div>
  );
}

// Preview component
function NextOrderCouponPreview({ settings }: { settings: SettingsFormData }) {
  const mockData = useMemo(() => {
    const couponCode = `${settings.coupon_prefix || 'THANKS-'}12345`;
    const discount = formatDiscountDisplay(settings.discount_type, settings.discount_value);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (settings.expires_after || 30));

    // Format date using WordPress date API
    const wpDateSettings = (window as any).wp?.date?.getSettings();
    const wpDateFormat = wpDateSettings?.formats?.date || 'F j, Y';
    const expiry =
      (window as any).wp?.date?.format(wpDateFormat, expiryDate) ||
      expiryDate.toLocaleDateString();

    // Format thank you message
    const thankYouMessage = formatCouponMessage(
      settings.thank_you_message || '',
      couponCode,
      discount,
      expiry,
    );

    // Format email content
    const emailMessage = formatCouponMessage(
      settings.email_content || '',
      couponCode,
      discount,
      expiry,
    );

    return {
      couponCode,
      discount,
      expiry,
      thankYouMessage,
      emailMessage,
      headline: settings.thank_you_headline || '',
    };
  }, [
    settings.coupon_prefix,
    settings.discount_type,
    settings.discount_value,
    settings.expires_after,
    settings.thank_you_message,
    settings.email_content,
    settings.thank_you_headline,
  ]);

  return (
    <Tabs defaultValue="thank-you" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="thank-you">{__('Thank You Page', 'yayboost')}</TabsTrigger>
        <TabsTrigger value="email">{__('Email', 'yayboost')}</TabsTrigger>
      </TabsList>

      <TabsContent value="thank-you" className="mt-4 space-y-4">
        <div className="mx-auto max-w-md space-y-4 rounded-lg border-2 border-blue-500 p-4">
          <ThankYouHeadingPlaceholder />
          <CouponDisplay
            couponCode={mockData.couponCode}
            message={mockData.thankYouMessage}
            headline={mockData.headline}
          />
          <OrderTablePlaceholder />
          <AddressSectionPlaceholder />
        </div>
      </TabsContent>

      <TabsContent value="email" className="mt-4 space-y-4">
        <div className="mx-auto max-w-md space-y-4 rounded-lg border-2 border-blue-500 p-4">
          <EmailHeaderPlaceholder />
          <CouponDisplay couponCode={mockData.couponCode} message={mockData.emailMessage} />
          <OrderTablePlaceholder />
          <AddressSectionPlaceholder />
        </div>
      </TabsContent>
    </Tabs>
  );
}

export default function NextOrderCouponFeature({ featureId }: FeatureComponentProps) {
  const { data: feature, isLoading, isFetching } = useFeature(featureId);
  const updateSettings = useUpdateFeatureSettings();
  const toggleMutation = useToggleFeature();

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

  const watchedValues = form.watch();
  const couponPrefix = watchedValues.coupon_prefix || 'THANKS-';

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
          <SettingsCard
            headless
            title="Configure Next Order Coupon"
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
            {/* Coupon Settings Section */}
            <div className="space-y-1">
              <h3 className="text-sm font-medium">{__('Coupon settings', 'yayboost')}</h3>
              <p className="text-muted-foreground text-xs">
                {__('Configure the discount type and coupon code settings', 'yayboost')}
              </p>
            </div>

            <FormField
              control={form.control}
              name="discount_type"
              render={({ field }) => (
                <FormItem>
                  <Label>{__('Discount type', 'yayboost')}</Label>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex flex-col gap-3"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="percent" id="discount-percentage" />
                        <label htmlFor="discount-percentage" className="flex items-center gap-2">
                          {__('Percentage off', 'yayboost')}
                        </label>
                        {field.value === 'percent' && (
                          <FormField
                            control={form.control}
                            name="discount_value"
                            render={({ field: valueField }) => (
                              <div className="flex items-center gap-1">
                                <InputNumber
                                  id="discount_value"
                                  className="h-8 w-20"
                                  value={valueField.value}
                                  onValueChange={(value) => valueField.onChange(value)}
                                  min={0}
                                  max={100}
                                />
                                <span>%</span>
                              </div>
                            )}
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="fixed_cart" id="discount-fixed" />
                        <label htmlFor="discount-fixed" className="flex items-center gap-2">
                          {__('Fixed amount off', 'yayboost')}
                        </label>
                        {field.value === 'fixed_cart' && (
                          <FormField
                            control={form.control}
                            name="discount_value"
                            render={({ field: valueField }) => (
                              <div className="flex items-center gap-1">
                                <span>{currencySymbol}</span>
                                <InputNumber
                                  id="discount_value_fixed"
                                  className="h-8 w-20"
                                  value={valueField.value}
                                  onValueChange={(value) => valueField.onChange(value)}
                                  min={0}
                                />
                              </div>
                            )}
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="free_shipping" id="discount-shipping" />
                        <label htmlFor="discount-shipping">{__('Free shipping', 'yayboost')}</label>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <CircleQuestionMark className="h-4 w-4 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>
                              {__('Requires a', 'yayboost')}{' '}
                              <a
                                href="https://woocommerce.com/document/free-shipping/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-primary underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {__('free shipping method', 'yayboost')}
                              </a>{' '}
                              {__('configured in your shipping zone. See setup guide.', 'yayboost')}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="coupon_prefix"
              render={({ field }) => {
                const previewCode = useMemo(() => {
                  const prefix = field.value || couponPrefix;
                  const randomChars = 'ABCDE';
                  return `${prefix}${randomChars}`;
                }, [field.value, couponPrefix]);

                return (
                  <FormItem>
                    <Label htmlFor="coupon_prefix">{__('Coupon prefix', 'yayboost')}</Label>
                    <FormControl>
                      <Input id="coupon_prefix" className="w-64" {...field} />
                    </FormControl>
                    <FormDescription>
                      {__('Preview:', 'yayboost')} {previewCode}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="expires_after"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="expires_after">{__('Expires after', 'yayboost')}</Label>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(Number(value))}
                      >
                        <SelectTrigger id="expires_after" className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[7, 14, 30, 60, 90].map((days) => (
                            <SelectItem key={days} value={days.toString()}>
                              {days}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm">{__('days from purchase', 'yayboost')}</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Generate Condition Section */}
            <div className="space-y-1">
              <h3 className="text-sm font-medium">{__('Generate condition', 'yayboost')}</h3>
              <p className="text-muted-foreground text-xs">
                {__('Specify when coupons should be generated', 'yayboost')}
              </p>
            </div>

            <FormField
              control={form.control}
              name="minimum_order_total"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="minimum_order_total">
                    {__('Only generate coupon when:', 'yayboost')}
                  </Label>
                  <FormDescription>{__('Order total is at least:', 'yayboost')}</FormDescription>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <span>{currencySymbol}</span>
                      <InputNumber
                        id="minimum_order_total"
                        value={field.value}
                        onValueChange={(value) => field.onChange(value)}
                        min={0}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customer_type"
              render={({ field }) => (
                <FormItem>
                  <Label>{__('Who will get the coupon:', 'yayboost')}</Label>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="all" id="customer-all" />
                        <label htmlFor="customer-all">{__('All customers', 'yayboost')}</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="first_time" id="customer-first-time" />
                        <label htmlFor="customer-first-time">
                          {__('First-time customers only', 'yayboost')}
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="returning" id="customer-returning" />
                        <label htmlFor="customer-returning">
                          {__('Returning customers only', 'yayboost')}
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* <FormField
              control={form.control}
              name="on_cancel_refund_action"
              render={({ field }) => (
                <FormItem>
                  <Label>{__('When order is cancelled or refunded:', 'yayboost')}</Label>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="delete_and_reset" id="cancel-delete" />
                        <label htmlFor="cancel-delete">
                          {__('Delete coupon and reset order count', 'yayboost')}
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="keep_and_count" id="cancel-keep" />
                        <label htmlFor="cancel-keep">
                          {__('Keep coupon and count as ordered', 'yayboost')}
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            /> */}

            <Separator />

            {/* Usage Restriction Section */}
            <div className="space-y-1">
              <h3 className="text-sm font-medium">{__('Usage restriction', 'yayboost')}</h3>
              <p className="text-muted-foreground text-xs">
                {__('Configure restrictions for using the generated coupon', 'yayboost')}
              </p>
            </div>

            <FormField
              control={form.control}
              name="minimum_spend_to_use"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="minimum_spend_to_use">
                    {__('Minimum next order spend to use coupon:', 'yayboost')}
                  </Label>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <span>{currencySymbol}</span>
                      <InputNumber
                        id="minimum_spend_to_use"
                        value={field.value}
                        onValueChange={(value) => field.onChange(value)}
                        min={0}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="exclude_sale_items"
              render={({ field }) => (
                <FormItem>
                  <Label>{__('Exclude sale items', 'yayboost')}</Label>
                  <FormControl>
                    <RadioGroup
                      value={field.value ? 'yes' : 'no'}
                      onValueChange={(value) => field.onChange(value === 'yes')}
                      className="flex items-center gap-6"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="yes" id="exclude-yes" />
                        <label htmlFor="exclude-yes">{__('Yes', 'yayboost')}</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="no" id="exclude-no" />
                        <label htmlFor="exclude-no">{__('No', 'yayboost')}</label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Display Location Section */}
            <div className="space-y-1">
              <h3 className="text-sm font-medium">{__('Display location', 'yayboost')}</h3>
              <p className="text-muted-foreground text-xs">
                {__('Choose where to display the coupon information', 'yayboost')}
              </p>
            </div>
            <FormField
              control={form.control}
              name="display_locations"
              render={() => (
                <FormItem>
                  <div className="space-y-2">
                    {displayLocationOptions.map((option) => (
                      <FormField
                        key={option.id}
                        control={form.control}
                        name="display_locations"
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

            <Separator />

            {/* Thank You Page Display Section */}
            <div className="space-y-1">
              <h3 className="text-sm font-medium">{__('Thank you page display', 'yayboost')}</h3>
              <p className="text-muted-foreground text-xs">
                {__('Customize the content shown on the thank you page', 'yayboost')}
              </p>
            </div>

            <FormField
              control={form.control}
              name="thank_you_headline"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="thank_you_headline">{__('Headline', 'yayboost')}</Label>
                  <FormControl>
                    <Input
                      id="thank_you_headline"
                      {...field}
                      placeholder="🎁 Here's a gift for your next order!"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="thank_you_message"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="thank_you_message">{__('Message', 'yayboost')}</Label>
                  <FormControl>
                    <Textarea
                      id="thank_you_message"
                      {...field}
                      placeholder="Use code {coupon_code} to get {discount} off your next purchase. Expires {expiry}."
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    {__('Available placeholders:', 'yayboost')} {'{coupon_code}'}, {'{discount}'},{' '}
                    {'{expiry}'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Email Content Section */}
            <div className="space-y-1">
              <h3 className="text-sm font-medium">{__('Email content', 'yayboost')}</h3>
              <p className="text-muted-foreground text-xs">
                {__('Customize the email content sent to customers', 'yayboost')}
              </p>
            </div>

            <FormField
              control={form.control}
              name="email_content"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="email_content">{__('Section text', 'yayboost')}</Label>
                  <FormControl>
                    <Textarea
                      id="email_content"
                      {...field}
                      placeholder="As a thank you, here's {discount} off your next order!"
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    {__('Available placeholders:', 'yayboost')} {'{coupon_code}'}, {'{discount}'},{' '}
                    {'{expiry}'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SettingsCard>
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
                {__('See how the coupon will appear to customers', 'yayboost')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NextOrderCouponPreview settings={watchedValues} />
            </CardContent>
          </Card>
        </div>
      </div>
    </Form>
  );
}
