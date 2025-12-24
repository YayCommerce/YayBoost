import { useFeature } from '@/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { WarningCircle } from '@phosphor-icons/react';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

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
  useForm,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import FeatureLayoutHeader from '@/components/feature-layout-header';

import { FeatureComponentProps } from '..';

// Settings schema
const settingsSchema = z.object({
  enabled: z.boolean(),
  low_stock_threshold: z.number().min(0),
  show_alert_text: z.boolean(),
  show_progress_bar: z.boolean(),
  default_message: z.string().min(1),
  urgent_threshold: z.number().min(0),
  urgent_message: z.string().min(1),
  progress_source: z.enum(['auto', 'fixed']),
  fixed_stock_number: z.number().min(0),
  fill_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  background_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  position_on_product_page: z.enum(['below_title', 'below_price', 'below_add_to_cart']),
  show_on: z.array(z.string()),
  apply_to: z.enum(['all_products', 'specific_categories', 'specific_products']),
  exclude_products: z.array(z.string()),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const GeneralSection = ({ form }: { form: UseFormReturn<SettingsFormData> }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-lg'>General</CardTitle>
        <CardDescription>Configure basic stock scarcity settings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-sm'>Enable Stock Scarcity</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value.toString()}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="false" id="off-stock-scarcity" />
                      <Label htmlFor="off-stock-scarcity" className="cursor-pointer font-normal">
                        Off
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="true" id="on-stock-scarcity" />
                      <Label htmlFor="on-stock-scarcity" className="cursor-pointer font-normal">
                        On
                      </Label>
                    </div>
                  </RadioGroup>
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="low_stock_threshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-sm'>Show when stock is at or below</FormLabel>
                <div className="flex w-fit items-center gap-2">
                  <FormControl>
                    <Input type="number" step="1" {...field} />
                  </FormControl>
                  <span className='text-[#6A7282]'>items</span>
                </div>
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};

const DisplaySection = ({ form }: { form: UseFormReturn<SettingsFormData> }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-lg'>Display Options</CardTitle>
        <CardDescription>Choose which elements to show to customers</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <FormField
          control={form.control}
          name="show_alert_text"
          render={({ field }) => (
            <FormItem className="flex items-center">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <span>Show alert text</span>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="show_progress_bar"
          render={({ field }) => (
            <FormItem className="flex items-center">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <span>Show progress bar</span>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

const AlertTextSection = ({ form }: { form: UseFormReturn<SettingsFormData> }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-lg'>Alert Text</CardTitle>
        <CardDescription>Customize the alert messages shown to customers</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <FormField
          control={form.control}
          name="default_message"
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-sm'>Default message</FormLabel>
              <FormControl>
                <Input placeholder="🔥 Only {stock} left in stock!" {...field} />
              </FormControl>
              <FormDescription className='text-sm'>Use {'{stock}'} to display the current stock count</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="urgent_threshold"
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-sm'>Urgent threshold</FormLabel>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    className="w-28"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                  />
                </FormControl>
                <span className='text-sm text-[#6A7282]'>items or below</span>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="urgent_message"
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-sm'>Urgent message</FormLabel>
              <FormControl>
                <Input placeholder="⚠️ Hurry! Only {stock} left!" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

const ProgressBarSection = ({ form }: { form: UseFormReturn<SettingsFormData> }) => {
  const progressSource = form.watch('progress_source');
  const fixedNumber = form.watch('fixed_stock_number');

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-lg'>Progress Bar</CardTitle>
        <CardDescription>Configure the visual stock indicator</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <Label className="font-medium">Calculate percentage from</Label>
          <FormField
            control={form.control}
            name="progress_source"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="auto" id="progress-auto" />
                      <Label htmlFor="progress-auto" className="cursor-pointer font-normal">
                        Auto-detect from WooCommerce stock
                      </Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="fixed" id="progress-fixed" />
                      <Label htmlFor="progress-fixed" className="cursor-pointer font-normal">
                        Fixed number:
                      </Label>
                      <FormField
                        control={form.control}
                        name="fixed_stock_number"
                        render={({ field: fixedField }) => (
                          <FormItem className="m-0">
                            <FormControl>
                              <Input
                                type="number"
                                step="1"
                                min="1"
                                className="w-28"
                                {...fixedField}
                                disabled={progressSource !== 'fixed'}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <span className='text-[#6A7282]'>items</span>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {progressSource === 'fixed' && (
            <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-[#EFF6FF] p-3">
              <div className="flex items-center gap-2">
                <WarningCircle size={24} color="#155DFC" />
              </div>
              <div className="flex flex-col">
                <p className='text-sm text-[#1C398E]'>How fixed number works</p>
                <p className='text-sm text-[#193CB8]'>
                  If you set {fixedNumber} items and current stock is 8, the progress bar will show{' '}
                  {(100 - (8 / Math.max(fixedNumber, 1)) * 100).toFixed(0)}% sold ({fixedNumber - 8}{' '}
                  of {fixedNumber}).
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Label className="font-medium">Bar colors</Label>
          <div className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="fill_color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-sm font-normal'>Fill color</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input type="color" {...field} className="h-10 w-28 p-1" />
                    </FormControl>
                    <Label>{field.value ?? '#000000'}</Label>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="background_color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-sm font-normal'>Background</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input type="color" {...field} className="h-10 w-28 p-1" />
                    </FormControl>
                    <Label>{field.value ?? '#000000'}</Label>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const DisplayLocationSection = ({ form }: { form: UseFormReturn<SettingsFormData> }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-lg'>Display Location</CardTitle>
        <CardDescription>Control where stock scarcity appears</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <Label className="font-medium">Position on product page</Label>
          <FormField
            control={form.control}
            name="position_on_product_page"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="below_title" id="below-title" />
                      <Label htmlFor="below-title" className="cursor-pointer font-normal">
                        Below product title
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="below_price" id="below-price" />
                      <Label htmlFor="below-price" className="cursor-pointer font-normal">
                        Below price
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="below_add_to_cart" id="below-add-to-cart" />
                      <Label htmlFor="below-add-to-cart" className="cursor-pointer font-normal">
                        Below add to cart button
                      </Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-col gap-4">
          <Label className="font-medium">Show on</Label>
          <FormField
            control={form.control}
            name="show_on"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-2">
                <FormControl>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={field.value?.includes('product_page')}
                        onCheckedChange={(checked) => {
                          const currentValue = field.value || [];
                          if (checked) {
                            field.onChange([...currentValue, 'product_page']);
                          } else {
                            field.onChange(currentValue.filter((v) => v !== 'product_page'));
                          }
                        }}
                      />
                      <Label className="cursor-pointer font-normal">Product page</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={field.value?.includes('shop_category_pages')}
                        onCheckedChange={(checked) => {
                          const currentValue = field.value || [];
                          if (checked) {
                            field.onChange([...currentValue, 'shop_category_pages']);
                          } else {
                            field.onChange(currentValue.filter((v) => v !== 'shop_category_pages'));
                          }
                        }}
                      />
                      <Label className="cursor-pointer font-normal">Shop / Category pages</Label>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};

const ProductTargetingSection = ({ form }: { form: UseFormReturn<SettingsFormData> }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-lg'>Product Targeting</CardTitle>
        <CardDescription>Select which products show stock scarcity</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <Label className="font-medium">Apply to</Label>
          <FormField
            control={form.control}
            name="apply_to"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="all_products" id="all-products" />
                      <Label htmlFor="all-products" className="cursor-pointer font-normal">
                        All products
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="specific_categories" id="specific-categories" />
                      <Label htmlFor="specific-categories" className="cursor-pointer font-normal">
                        Specific categories
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="specific_products" id="specific-products" />
                      <Label htmlFor="specific-products" className="cursor-pointer font-normal">
                        Specific products
                      </Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-col gap-4">
          <Label className="font-medium">Exclude products</Label>
          <FormField
            control={form.control}
            name="exclude_products"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="Search products..." value="" onChange={(e) => {}} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};

const PreviewSection = ({ form }: { form: UseFormReturn<SettingsFormData> }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-lg'>Preview</CardTitle>
        <CardDescription>See how your stock scarcity will look</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Single preview - no slider, no multiple states */}
        Preview
      </CardContent>
    </Card>
  );
};

const StockScarcity = ({ featureId }: FeatureComponentProps) => {
  const { data: feature } = useFeature(featureId);

  const onSubmit = (data: SettingsFormData) => {
    console.log(data);
  };

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      enabled: false,
      low_stock_threshold: 10,
      show_alert_text: true,
      show_progress_bar: true,
      default_message: '',
      urgent_threshold: 5,
      urgent_message: '',
      progress_source: 'auto',
      fixed_stock_number: 100,
      fill_color: '#000000',
      background_color: '#000000',
      position_on_product_page: 'below_title',
      show_on: ['product_page', 'shop_category_pages'],
      apply_to: 'all_products',
      exclude_products: [],
    },
  });
  return (
    <div className="space-y-6">
      {/* Recommendations Table */}
      <FeatureLayoutHeader
        title={feature?.name ?? ''}
        description={feature?.description ?? ''}
        goBackRoute={'/features'}
      />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4">
              <GeneralSection form={form} />
              <DisplaySection form={form} />
              <AlertTextSection form={form} />
              <ProgressBarSection form={form} />
              <DisplayLocationSection form={form} />
              <ProductTargetingSection form={form} />
              <PreviewSection form={form} />
            </div>

            {/* Submit button */}
            <div className="flex justify-end gap-3">
              <Button type="submit" className="bg-[#171717] text-white">
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default StockScarcity;
