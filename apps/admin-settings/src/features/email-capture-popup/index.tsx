/**
 * Email Capture Popup Feature Settings
 *
 * Show a popup when customers try to leave with items in cart.
 * Offer discount to complete purchase NOW. Capture emails for follow-up.
 */

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import { Eye, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { emailCaptureApi } from '@/lib/api';
import { useFeature, useUpdateFeatureSettings } from '@/hooks/use-features';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { MultiSelect } from '@/components/ui/multi-select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import FeatureLayoutHeader from '@/components/feature-layout-header';
import { SettingsCard } from '@/components/settings-card';
import UnavailableFeature from '@/components/unavailable-feature';

import { FeatureComponentProps } from '..';

// Settings schema
const settingsSchema = z.object({
  content: z.object({
    headline: z.string().min(1),
    message: z.string().min(1),
    button_text: z.string().min(1),
  }),
  email_trigger: z.object({
    send_after_days: z.number().min(0),
    subject: z.string().min(1),
    email_heading: z.string().min(1),
    email_content: z.string().min(1),
  }),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const statusLabels: Record<string, string> = {
  pending: __('Pending', 'yayboost'),
  sent: __('Sent', 'yayboost'),
  skipped: __('Skipped', 'yayboost'),
  account_created: __('Account created', 'yayboost'),
  failed: __('Failed', 'yayboost'),
};

export default function EmailCapturePopupFeature({ featureId }: FeatureComponentProps) {
  const { data: feature, isLoading, isFetching } = useFeature(featureId);
  const updateSettings = useUpdateFeatureSettings();
  const [activeTab, setActiveTab] = useState<string>('settings');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const queryClient = useQueryClient();
  const {
    data: emailListData,
    isLoading: listLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['email-capture-list', activeTab],
    queryFn: ({ pageParam }) => emailCaptureApi.getList({ page: pageParam, per_page: 50 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    enabled: activeTab === 'email-list',
  });

  const sendMutation = useMutation({
    mutationFn: (id: number) => emailCaptureApi.sendFollowup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-capture-list', activeTab] });
    },
  });

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: feature?.settings as SettingsFormData,
  });

  const contentPreview = form.watch('content');
  const emailTriggerPreview = form.watch('email_trigger');

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

  const handleSendMail = async () => {
    for (const id of selectedIds) {
      await sendMutation.mutateAsync(Number(id));
    }
    setSelectedIds([]);
  };

  const allItems = emailListData?.pages?.flatMap((page) => page.items) ?? [];
  const emailOptions = allItems.map((row) => ({
    label: `${row.email} (${statusLabels[row.status] ?? row.status})`,
    value: String(row.id),
  }));

  if (isLoading || isFetching) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Use UnavailableFeature only when feature data exists but has no settings
  if (feature && !feature?.settings) {
    return <UnavailableFeature />;
  }

  return (
    <Form {...form}>
      <FeatureLayoutHeader
        title={feature?.name ?? 'Email Popup'}
        description={feature?.description}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: Settings with Tabs */}
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="settings">{__('Settings', 'yayboost')}</TabsTrigger>
              <TabsTrigger value="email-list">{__('Email list', 'yayboost')}</TabsTrigger>
            </TabsList>

            {/* Settings tab */}
            <TabsContent value="settings" className="mt-4">
              <SettingsCard
                headless
                onSave={() => form.handleSubmit(onSubmit)()}
                onReset={() => {
                  form.reset(feature?.settings as SettingsFormData);
                }}
                isSaving={updateSettings.isPending}
                isDirty={form.formState.isDirty}
                isLoading={isLoading || isFetching}
              >
                {/* Content section */}
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">{__('Content', 'yayboost')}</h3>
                </div>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="content.headline"
                    render={({ field }) => (
                      <FormItem>
                        <Label>{__('Headline:', 'yayboost')}</Label>
                        <FormControl>
                          <Input
                            id="content-headline"
                            placeholder="Wait! Don't leave"
                            className="w-full"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="content.message"
                    render={({ field }) => (
                      <FormItem>
                        <Label>{__('Message', 'yayboost')}</Label>
                        <FormControl>
                          <Textarea
                            id="content-message"
                            placeholder="Complete your order now and receive 10% discount"
                            className="w-full"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="content.button_text"
                    render={({ field }) => (
                      <FormItem>
                        <Label>{__('Button text', 'yayboost')}</Label>
                        <FormControl>
                          <Input
                            id="content-button_text"
                            placeholder="Submit email"
                            className="w-full"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Email trigger section */}
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">{__('Email trigger', 'yayboost')}</h3>
                </div>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email_trigger.send_after_days"
                    render={({ field }) => (
                      <FormItem>
                        <Label>{__('Send email after (days)', 'yayboost')}</Label>
                        <FormControl>
                          <div className="w-24">
                            <InputNumber
                              id="email_trigger-send_after_days"
                              placeholder="1"
                              min={0}
                              value={field.value}
                              onValueChange={(val) => field.onChange(val ?? 0)}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          {__('Number of days to wait after submission before sending the email')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email_trigger.subject"
                    render={({ field }) => (
                      <FormItem>
                        <Label>{__('Subject', 'yayboost')}</Label>
                        <FormControl>
                          <Input
                            id="email_trigger-subject"
                            placeholder="Wait! Don't leave"
                            className="w-full"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email_trigger.email_heading"
                    render={({ field }) => (
                      <FormItem>
                        <Label>{__('Email heading', 'yayboost')}</Label>
                        <FormControl>
                          <Input
                            id="email_trigger-email_heading"
                            placeholder="Wait! Don't leave"
                            className="w-full"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email_trigger.email_content"
                    render={({ field }) => (
                      <FormItem>
                        <Label>{__('Email content', 'yayboost')}</Label>
                        <FormControl>
                          <Textarea
                            id="email_trigger-email_content"
                            placeholder={__('Enter email content...', 'yayboost')}
                            className="min-h-16 resize-y"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </SettingsCard>
            </TabsContent>

            {/* Email list tab */}
            <TabsContent value="email-list" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>{__('Manual send', 'yayboost')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{__('Select emails to send', 'yayboost')}</Label>
                    {listLoading ? (
                      <Skeleton className="h-24 w-full" />
                    ) : (
                      <MultiSelect
                        options={emailOptions}
                        value={selectedIds}
                        onChange={setSelectedIds}
                        placeholder={__('Select emails...', 'yayboost')}
                        showSearch
                        emptyText={__('No captured emails yet', 'yayboost')}
                        hasMore={hasNextPage ?? false}
                        onLoadMore={() => fetchNextPage()}
                        isLoading={isFetchingNextPage}
                      />
                    )}
                  </div>
                  <Button
                    onClick={() => handleSendMail()}
                    disabled={selectedIds.length === 0 || sendMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                    {__('Send mail', 'yayboost')}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column: Preview with Tabs */}
        <div className="sticky top-6 h-fit space-y-6 transition-opacity duration-300">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                <CardTitle>{__('Live Preview', 'yayboost')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="popup" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="popup">{__('Popup content', 'yayboost')}</TabsTrigger>
                  <TabsTrigger value="email">{__('Email', 'yayboost')}</TabsTrigger>
                </TabsList>

                {/* Popup content preview - email capture with input + submit */}
                <TabsContent value="popup" className="mt-4">
                  <div className="rounded-xl p-4">
                    <div className="relative mx-auto flex max-w-4xl flex-col overflow-hidden rounded-xl border bg-white shadow-lg md:flex-row">
                      <div className="flex-1 p-8 md:p-10">
                        <div className="flex flex-col items-center justify-center gap-4 text-center">
                          <h4 className="text-3xl leading-tight font-black text-slate-900">
                            {contentPreview?.headline ||
                              __('Headline will appear here', 'yayboost')}
                          </h4>
                          <p className="text-base leading-relaxed text-slate-700">
                            {contentPreview?.message || __('Message will appear here', 'yayboost')}
                          </p>
                          <div className="flex w-full max-w-sm flex-col gap-3">
                            <Input
                              type="email"
                              placeholder={__('Enter your email', 'yayboost')}
                              className="h-11"
                              disabled
                              readOnly
                            />
                            <button
                              type="button"
                              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-lg border-none bg-black px-6 text-sm font-medium text-white transition-opacity hover:opacity-85"
                            >
                              {contentPreview?.button_text || __('Button text', 'yayboost')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Email preview - styled like next-order-coupon, without order content */}
                <TabsContent value="email" className="mt-4 space-y-4">
                  <div className="mx-auto max-w-md space-y-4 rounded-lg border-2 border-blue-500 p-4">
                    <div className="text-muted-foreground space-y-2 border-b pb-4">
                      <h2 className="text-foreground text-lg font-semibold">
                        {emailTriggerPreview?.email_heading ||
                          __('Email heading will appear here', 'yayboost')}
                      </h2>
                    </div>
                    <p className="whitespace-pre-wrap text-slate-700">
                      {emailTriggerPreview?.email_content ||
                        __('Email content will appear here', 'yayboost')}
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </Form>
  );
}
