import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { __ } from '@wordpress/i18n';
import { CircleQuestionMark, Eye } from 'lucide-react';
import z from 'zod';

import { useFeature, useUpdateFeatureSettings } from '@/hooks/use-features';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { InputNumber } from '@/components/ui/input-number';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import FeatureLayoutHeader from '@/components/feature-layout-header';
import { SettingsCard } from '@/components/settings-card';
import UnavailableFeature from '@/components/unavailable-feature';

import { FeatureComponentProps } from '..';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Settings schema
const settingsSchema = z.object({
  enabled: z.boolean(),
  trigger: z.object({
    leaves_viewport: z.boolean(),
    back_button_pressed: z.boolean(),
  }),
  offer: z.object({
    type: z.enum(['percent', 'fixed_amount', 'free_shipping', 'no_discount']),
    value: z.number().min(0),
    prefix: z.string().min(1),
    expires: z.number().min(1),
  }),
  content: z.object({
    headline: z.string().min(1),
    message: z.string().min(1),
    button_text: z.string().min(1),
  }),
  behavior: z.enum(['checkout_page', 'cart_page']),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function ExitIntentPopupFeature({ featureId }: FeatureComponentProps) {
  const { data: feature, isLoading, isFetching } = useFeature(featureId);
  const updateSettings = useUpdateFeatureSettings();

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: feature?.settings as SettingsFormData,
  });

  const offerType = form.watch('offer.type');
  const offerValue = form.watch('offer.value');
  const offerPrefix = form.watch('offer.prefix');
  const contentPreview = form.watch('content');

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

  const previewCouponCode = useMemo(() => {
    return `${offerPrefix}ABCDE`;
  }, [offerPrefix]);

  const previewButtonText = useMemo(() => {
    if (offerType === 'percent') {
      return contentPreview?.button_text?.replace('{amount}', `${offerValue}%`);
    } else if (offerType === 'fixed_amount') {
      return contentPreview?.button_text?.replace('{amount}', `$${offerValue}`);
    } else {
      return contentPreview?.button_text;
    }
  }, [contentPreview?.button_text, offerType, offerValue]);

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
            <h3 className="text-sm font-medium">{__('Trigger', 'yayboost')}</h3>
            <p className="text-muted-foreground text-xs">{__('Show popup when:', 'yayboost')}</p>
          </div>
          <div className="flex flex-col gap-2">
            <FormField
              control={form.control}
              name="trigger.leaves_viewport"
              render={({ field }) => (
                <FormItem className="flex items-center">
                  <FormControl>
                    <Checkbox
                      id="trigger-leaves-viewport"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <Label htmlFor="trigger-leaves-viewport" className="text-sm font-normal">
                    {__('Leaves viewport', 'yayboost')}
                  </Label>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="trigger.back_button_pressed"
              render={({ field }) => (
                <FormItem className="flex items-center">
                  <FormControl>
                    <Checkbox
                      id="trigger-back-button-pressed"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <Label htmlFor="trigger-back-button-pressed" className="text-sm font-normal">
                    {__('Back button pressed', 'yayboost')}
                  </Label>
                </FormItem>
              )}
            />
          </div>
          <Separator />
          <div className="space-y-1">
            <h3 className="text-sm font-medium">{__('Offer', 'yayboost')}</h3>
          </div>
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="offer.type"
              render={({ field }) => (
                <FormItem>
                  <Label>{__('Discount type:', 'yayboost')}</Label>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="no_discount" id="no-discount" />
                        <div className="space-y-1">
                          <label htmlFor="no-discount">
                            {__('No discount (just reminder)', 'yayboost')}
                          </label>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="percent" id="percent" />
                        <div className="flex items-center gap-2 space-y-1">
                          <label htmlFor="percent">{__('Percentage off', 'yayboost')}</label>
                          {offerType === 'percent' && (
                            <FormField
                              control={form.control}
                              name="offer.value"
                              render={({ field: valueField }) => (
                                <FormItem className="flex items-center gap-1">
                                  <FormControl>
                                    <InputNumber
                                      id="offer-value-percent"
                                      placeholder="20"
                                      className="w-16"
                                      value={valueField.value}
                                      onValueChange={(val) => valueField.onChange(val)}
                                    />
                                  </FormControl>
                                  <span className="text-sm">%</span>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="fixed_amount" id="fixed-amount" />
                        <div className="flex items-center gap-2 space-y-1">
                          <label htmlFor="fixed-amount">{__('Fixed amount off', 'yayboost')}</label>
                          {offerType === 'fixed_amount' && (
                            <FormField
                              control={form.control}
                              name="offer.value"
                              render={({ field: valueField }) => (
                                <FormItem className="flex items-center gap-1">
                                  <FormControl>
                                    <InputNumber
                                      id="offer-value-fixed"
                                      placeholder="10"
                                      className="w-16"
                                      value={valueField.value}
                                      onValueChange={(val) => valueField.onChange(val)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="free_shipping" id="free-shipping" />
                        <div className="space-y-1">
                          <label htmlFor="free-shipping">{__('Free shipping', 'yayboost')}</label>
                        </div>
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
          </div>
          {offerType !== 'no_discount' && (
            <>
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="offer.prefix"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex flex-row gap-2">
                        <Label>{__('Coupon prefix', 'yayboost')}</Label>
                        <FormControl>
                          <Input id="offer-prefix" placeholder="GO-" className="w-24" {...field} />
                        </FormControl>
                        <FormMessage />
                      </div>
                      <FormDescription>
                        {__('Preview:', 'yayboost')} {previewCouponCode}
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Label className="text-sm">{__('Expires after', 'yayboost')}</Label>
                <FormField
                  control={form.control}
                  name="offer.expires"
                  render={({ field }) => (
                    <FormItem className="m-0">
                      <FormControl>
                        <InputNumber
                          id="offer-expires"
                          placeholder="1"
                          min={1}
                          className="w-24"
                          value={field.value}
                          onValueChange={(val) => field.onChange(val)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="text-sm">{__('hours', 'yayboost')}</div>
              </div>
            </>
          )}
          <Separator />
          <div className="space-y-1">
            <h3 className="text-sm font-medium">{__('Content', 'yayboost')}</h3>
          </div>
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="content.headline"
              render={({ field }) => (
                <FormItem>
                  <Label>{__('Headline:', 'yayboost')}</Label>
                  <FormControl>
                    <Input
                      id="content-headline"
                      placeholder="You're leaving?"
                      className="w-full"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="content.message"
              render={({ field }) => (
                <FormItem>
                  <Label>{__('Message:', 'yayboost')}</Label>
                  <FormControl>
                    <Textarea
                      id="content-message"
                      placeholder="Completed your order now and receive 10% discount"
                      className="w-full"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="content.button_text"
              render={({ field }) => (
                <FormItem>
                  <Label>{__('Button text:', 'yayboost')}</Label>
                  <FormControl>
                    <Input
                      id="content-button_text"
                      placeholder="Complete my order"
                      className="w-full"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {__('Available placeholders:', 'yayboost')} {'{amount}'}. {__('Just use them for percentage & fixed discount type')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Separator />
          <div className="space-y-1">
            <h3 className="text-sm font-medium">{__('Behavior', 'yayboost')}</h3>
            <p className="text-muted-foreground text-xs">
              {__('When customer clicks button', 'yayboost')}
            </p>
          </div>
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="behavior"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="checkout_page" id="checkout_page" />
                        <div className="space-y-1">
                          <label htmlFor="checkout_page">
                            {__('Go to checkout page (with applying discount)', 'yayboost')}
                          </label>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="cart_page" id="cart_page" />
                        <div className="space-y-1">
                          <label htmlFor="cart_page">
                            {__('Go to cart page (with applying discount)', 'yayboost')}
                          </label>
                        </div>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </SettingsCard>
        <div className="sticky top-6 h-fit space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                <CardTitle>{__('Live Preview', 'yayboost')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl p-4">
                <div className="relative mx-auto flex max-w-4xl flex-col overflow-hidden rounded-xl border bg-white shadow-lg md:flex-row">
                  {/* Left column: content */}
                  <div className="flex-1 p-8 md:p-10">
                    <div className="flex flex-col items-center justify-center gap-4 text-center">
                      <h4 className="text-3xl leading-tight font-black text-slate-900">
                        {contentPreview?.headline || __('Headline will appear here', 'yayboost')}
                      </h4>
                      <p className="text-base leading-relaxed text-slate-700">
                        {contentPreview?.message || __('Message will appear here', 'yayboost')}
                      </p>
                      <button
                        type="button"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-semibold transition-colors"
                      >
                        {previewButtonText || __('Button text', 'yayboost')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Form>
  );
}
