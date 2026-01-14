/**
 * Next Order Coupon Feature Settings
 *
 * Automatically generate a coupon discount after each purchase to encourage repeat orders.
 */

import { FeatureComponentProps } from '@/features';
import { zodResolver } from '@hookform/resolvers/zod';
import { __ } from '@wordpress/i18n';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useFeature, useToggleFeature, useUpdateFeatureSettings } from '@/hooks/use-features';
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
import { Textarea } from '@/components/ui/textarea';
import FeatureLayoutHeader from '@/components/feature-layout-header';
import { SettingsCard } from '@/components/settings-card';
import UnavailableFeature from '@/components/unavailable-feature';

// Get currency symbol from admin data
const currencySymbol = window.yayboostData?.currencySymbol || '$';

// Settings schema
const settingsSchema = z.object({
  enabled: z.boolean(),
  discount_type: z.enum(['percentage', 'fixed_amount', 'free_shipping']),
  discount_value: z.number().min(0).optional(),
  coupon_prefix: z.string().min(1),
  expires_after: z.number().min(1),
  minimum_order_total: z.number().min(0).optional(),
  customer_type: z.enum(['all', 'first_time', 'returning']),
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

// Generate preview coupon code
function generatePreviewCode(prefix: string): string {
  const randomChars = 'ABCDE';
  return `${prefix}${randomChars}`;
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
  const discountType = watchedValues.discount_type;
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
          {/* General Section */}
          <div className="space-y-1">
            <h3 className="text-sm font-medium">{__('General', 'yayboost')}</h3>
            <p className="text-muted-foreground text-xs">
              {__('Enable or disable the Next Order Coupon feature', 'yayboost')}
            </p>
          </div>
          <FormField
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <FormItem>
                <Label>{__('Enable Next Order Coupon', 'yayboost')}</Label>
                <FormControl>
                  <RadioGroup
                    value={field.value ? 'on' : 'off'}
                    onValueChange={(value) => {
                      const newEnabled = value === 'on';
                      field.onChange(newEnabled);
                    }}
                    disabled={toggleMutation.isPending}
                    className="flex items-center gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem
                        value="on"
                        id="enabled-on"
                        disabled={toggleMutation.isPending}
                      />
                      <label htmlFor="enabled-on">{__('On', 'yayboost')}</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem
                        value="off"
                        id="enabled-off"
                        disabled={toggleMutation.isPending}
                      />
                      <label htmlFor="enabled-off">{__('Off', 'yayboost')}</label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />

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
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="percentage" id="discount-percentage" />
                      <label htmlFor="discount-percentage" className="flex items-center gap-2">
                        {__('Percentage off', 'yayboost')}
                      </label>
                      {field.value === 'percentage' && (
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
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="fixed_amount" id="discount-fixed" />
                      <label htmlFor="discount-fixed" className="flex items-center gap-2">
                        {__('Fixed amount off', 'yayboost')}
                      </label>
                      {field.value === 'fixed_amount' && (
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
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="coupon_prefix">{__('Coupon prefix', 'yayboost')}</Label>
                <FormControl>
                  <Input id="coupon_prefix" className="w-64" {...field} />
                </FormControl>
                <FormDescription>
                  {__('Preview:', 'yayboost')} {generatePreviewCode(field.value || couponPrefix)}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
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
    </Form>
  );
}
