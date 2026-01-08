import { useEffect, useMemo, useState } from 'react';
import { useCreateEntity, useEntity, useUpdateEntity } from '@/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Check } from '@phosphor-icons/react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { FeatureComponentProps } from '..';
import { getOptionsFromLocalize } from './helpers';

// ==================== Schema & Types ====================
const recommendationRuleSchema = z.object({
  name: z.string().min(1, 'Rule name is required'),
  when_customer_views_type: z.enum(['category', 'product', 'tag']),
  when_customer_views_value: z.string().min(1, 'Value is required'),
  recommend_products_from_type: z.enum(['category', 'product', 'tag']),
  recommend_products_from_value: z.array(z.string()).min(1, 'At least one value is required'),
  max_products_to_show: z.string(),
  sort_by: z.enum(['best_selling', 'price_low', 'price_high', 'newest', 'relevance']),
  layout: z.enum(['grid', 'list']),
  section_title: z.string().min(1, 'Section title is required'),
  behavior_if_in_cart: z.enum(['hide', 'show']),
  status: z.enum(['active', 'inactive']),
});

type RecommendationRuleFormData = z.infer<typeof recommendationRuleSchema>;

// ==================== MultiSelect Component ====================
interface MultiSelectProps {
  options: { label: string; value: string }[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

function MultiSelect({ options, value, onChange, placeholder = 'Select options' }: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedLabels = useMemo(
    () => options.filter((o) => value.includes(o.value)).map((o) => o.label),
    [options, value],
  );

  const handleSelect = (selectedValue: string) => {
    if (value.includes(selectedValue)) {
      onChange(value.filter((v) => v !== selectedValue));
    } else {
      onChange([...value, selectedValue]);
    }
  };

  const displayText = selectedLabels.length === 0 ? placeholder : selectedLabels.join(', ');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            'h-9 w-full justify-between font-normal',
            selectedLabels.length === 0 && 'text-muted-foreground',
          )}
        >
          <span className="truncate text-left">{displayText}</span>
          <svg
            className={cn('ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform', open && 'rotate-180')}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="max-h-[300px] overflow-auto">
          {options.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">No options available</div>
          ) : (
            options.map((option) => {
              const isSelected = value.includes(option.value);
              return (
                <div
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent outline-none select-none',
                    isSelected && 'bg-accent',
                  )}
                >
                  {isSelected ? (
                    <Check className="h-4 w-4 shrink-0 text-primary" weight="bold" />
                  ) : (
                    <div className="h-4 w-4 shrink-0" />
                  )}
                  <span className="flex-1">{option.label}</span>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ==================== Section Components ====================
const RuleNameSection = ({ form }: { form: UseFormReturn<RecommendationRuleFormData> }) => {
  return (
    <div className="p-[9px]">
      <h3 className="text-[18px] leading-[28px] tracking-[-0.89px] font-semibold">Rule Name</h3>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input {...field} placeholder="Phone Accessories" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <hr className="mt-[32px]" />
    </div>
  );
};

const WhenCustomerViewsSection = ({ form }: { form: UseFormReturn<RecommendationRuleFormData> }) => {
  const watchType = form.watch('when_customer_views_type');
  const valueOptions = useMemo(() => getOptionsFromLocalize(watchType), [watchType]);
  
  const typeOptions = [
    { label: 'Category', value: 'category' },
    { label: 'Product', value: 'product' },
    { label: 'Tag', value: 'tag' },
  ];

  return (
    <div className="p-[9px]">
      <h3 className="text-[18px] leading-[28px] tracking-[-0.89px] font-semibold">When Customer Views</h3>
      <div className="grid grid-cols-2 gap-4">
        {/* Type Select */}
        <FormField
          control={form.control}
          name="when_customer_views_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base leading-6 font-normal">Type</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  form.resetField('when_customer_views_value');
                }}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {typeOptions.map((option) => (
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

        {/* Value Select */}
        <FormField
          control={form.control}
          name="when_customer_views_value"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base leading-6 font-normal">Value</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} key={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select value" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {valueOptions.map((option: { label: string; value: string }) => (
                    <SelectItem key={option.value} value={option.value as string}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <hr className="mt-[32px]" />
    </div>
  );
};

const RecommendProductsFromSection = ({ form }: { form: UseFormReturn<RecommendationRuleFormData> }) => {
  const watchType = form.watch('recommend_products_from_type');
  const valueOptions = useMemo(() => getOptionsFromLocalize(watchType), [watchType]);

  const typeOptions = [
    { label: 'Category', value: 'category' },
    { label: 'Product', value: 'product' },
    { label: 'Tag', value: 'tag' },
  ];

  const maxProductsOptions = ['1', '2', '3', '4', '5', '6', '8', '10', '12'].map((num) => ({
    label: num,
    value: num,
  }));

  const sortByOptions = [
    { label: 'Best Selling', value: 'best_selling' },
    { label: 'Price: Low to High', value: 'price_low' },
    { label: 'Price: High to Low', value: 'price_high' },
    { label: 'Newest', value: 'newest' },
    { label: 'Relevance', value: 'relevance' },
  ];

  return (
    <div className="p-[9px]">
      <h3 className="text-[18px] leading-[28px] tracking-[-0.89px] font-semibold">Recommend Products From</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Type Select */}
          <FormField
            control={form.control}
            name="recommend_products_from_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base leading-6 font-normal">Type</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.resetField('recommend_products_from_value');
                  }}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {typeOptions.map((option) => (
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

          {/* Value MultiSelect */}
          <FormField
            control={form.control}
            name="recommend_products_from_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base leading-6 font-normal">Value</FormLabel>
                <FormControl>
                  <MultiSelect
                    options={valueOptions}
                    value={field.value || []}
                    onChange={field.onChange}
                    placeholder="Select options"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Max Products */}
          <FormField
            control={form.control}
            name="max_products_to_show"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base leading-6 font-normal">Max products to show</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select max products" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {maxProductsOptions.map((option) => (
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

          {/* Sort By */}
          <FormField
            control={form.control}
            name="sort_by"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base leading-6 font-normal">Sort by</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select sort option" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {sortByOptions.map((option) => (
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
        </div>
      </div>
      <hr className="mt-[32px]" />
    </div>
  );
};

const DisplaySettingsSection = ({ form }: { form: UseFormReturn<RecommendationRuleFormData> }) => {
  const layoutOptions = [
    { label: 'Grid', value: 'grid' },
    { label: 'List', value: 'list' },
  ];

  return (
    <div className="p-[9px]">
      <h3 className="text-[18px] leading-[28px] tracking-[-0.89px] font-semibold">Display Settings</h3>
      <div className="space-y-4">
        {/* Layout */}
        <FormField
          control={form.control}
          name="layout"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base leading-6 font-normal">Layout</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
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

        {/* Section Title */}
        <FormField
          control={form.control}
          name="section_title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base leading-6 font-normal">Section title</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Complete Your Purchase" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <hr className="mt-[32px]" />
    </div>
  );
};

const BehaviorSection = ({ form }: { form: UseFormReturn<RecommendationRuleFormData> }) => {
  return (
    <div className="p-[9px]">
      <h3 className="text-[18px] leading-[28px] tracking-[-0.89px] font-semibold">Behavior</h3>
      <div className="space-y-3">
        <Label className="text-base leading-6 font-normal">If recommended product is already in cart:</Label>
        <FormField
          control={form.control}
          name="behavior_if_in_cart"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col gap-[8px]">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="hide" id="hide" />
                    <Label htmlFor="hide" className="cursor-pointer font-normal">
                      Hide it
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="show" id="show" />
                    <Label htmlFor="show" className="cursor-pointer font-normal">
                      Still show it
                    </Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <hr className="mt-[32px]" />
    </div>
  );
};

const StatusSection = ({ form }: { form: UseFormReturn<RecommendationRuleFormData> }) => {
  return (
    <div className="p-[9px]">
      <h3 className="text-[18px] leading-[28px] tracking-[-0.89px] font-semibold ">Status</h3>
      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center gap-[24px]">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="active" id="active" />
                  <Label htmlFor="active" className="cursor-pointer font-normal">
                    Active
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="inactive" id="inactive" />
                  <Label htmlFor="inactive" className="cursor-pointer font-normal">
                    Inactive
                  </Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

// ==================== Main Component ====================
const RecommendationsEditor = ({ featureId }: FeatureComponentProps) => {
  const navigate = useNavigate();
  const { recommendationId } = useParams<{ recommendationId: string }>();
  const isEditing = !!recommendationId;

  const { data: recommendation, isLoading } = useEntity(
    featureId,
    recommendationId ? parseInt(recommendationId) : 0,
    'recommendation',
  );

  const form = useForm<RecommendationRuleFormData>({
    resolver: zodResolver(recommendationRuleSchema),
    defaultValues: {
      name: '',
      when_customer_views_type: 'category',
      when_customer_views_value: '',
      recommend_products_from_type: 'category',
      recommend_products_from_value: [],
      max_products_to_show: '3',
      sort_by: 'best_selling',
      layout: 'grid',
      section_title: '',
      behavior_if_in_cart: 'hide',
      status: 'active',
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (recommendation && isEditing) {
      const settings = recommendation.settings as Record<string, any>;

      const entityStatus = settings?.status || recommendation.status;
      const status = ['active', 'inactive'].includes(entityStatus) ? entityStatus : 'active';

      form.reset({
        name: recommendation.name || '',
        when_customer_views_type: settings?.when_customer_views_type || 'category',
        when_customer_views_value: settings?.when_customer_views_value || '',
        recommend_products_from_type: settings?.recommend_products_from_type || 'category',
        recommend_products_from_value: settings?.recommend_products_from_value || [],
        max_products_to_show: settings?.max_products_to_show || '3',
        sort_by: settings?.sort_by || 'best_selling',
        layout: settings?.layout || 'grid',
        section_title: settings?.section_title || '',
        behavior_if_in_cart: settings?.behavior_if_in_cart || 'hide',
        status: status as 'active' | 'inactive',
      });
    }
  }, [recommendation, isEditing, form]);

  const createEntity = useCreateEntity(featureId);
  const updateEntity = useUpdateEntity(featureId);

  const isPending = createEntity.isPending || updateEntity.isPending;

  const onSubmit = async (data: RecommendationRuleFormData) => {
    const entityData = {
      name: data.name,
      entity_type: 'recommendation',
      status: data.status,
      settings: {
        when_customer_views_type: data.when_customer_views_type,
        when_customer_views_value: data.when_customer_views_value,
        recommend_products_from_type: data.recommend_products_from_type,
        recommend_products_from_value: data.recommend_products_from_value,
        max_products_to_show: data.max_products_to_show,
        sort_by: data.sort_by,
        layout: data.layout,
        section_title: data.section_title,
        behavior_if_in_cart: data.behavior_if_in_cart,
      },
    };

    try {
      if (isEditing) {
        await updateEntity.mutateAsync({
          entityId: parseInt(recommendationId!),
          entity: entityData,
        });
      } else {
        await createEntity.mutateAsync(entityData);
      }
      navigate(`/features/${featureId}`);
    } catch (error) {
      console.error('Failed to save recommendation:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={`/features/${featureId}`}
            className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">
              {isEditing ? 'Edit Rule' : 'Create Rule'}
            </h1>
            <p className="text-sm text-muted-foreground">
              Configure your product recommendation rule
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-6" key={recommendation?.id}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-[14px]">
            <RuleNameSection form={form} />
            <WhenCustomerViewsSection form={form} />
            <RecommendProductsFromSection form={form} />
            <DisplaySettingsSection form={form} />
            <BehaviorSection form={form} />
            <StatusSection form={form} />

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#171717] text-white" disabled={isPending}>
                {isPending ? 'Saving...' : isEditing ? 'Update Rule' : 'Create Rule'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default RecommendationsEditor;