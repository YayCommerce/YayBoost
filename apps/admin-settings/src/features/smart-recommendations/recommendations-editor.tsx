import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { useCreateEntity, useEntity, useUpdateEntity } from '@/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Check } from '@phosphor-icons/react';
import { useForm, UseFormReturn, useWatch } from 'react-hook-form';
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
import {
  FORM_LABEL_CLASS,
  MAX_PRODUCTS_OPTIONS,
  SECTION_CLASS,
  SECTION_TITLE_CLASS,
  SORT_BY_OPTIONS,
  TYPE_OPTIONS,
} from './constants';
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
  show_on_product_page: z.boolean(),
  show_on_cart_page: z.boolean(),
  show_on_mini_cart: z.boolean(),
  layout: z.enum(['grid', 'list']),
  section_title: z.string().min(1, 'Section title is required'),
  behavior_if_in_cart: z.enum(['hide', 'show']),
  status: z.enum(['active', 'inactive']),
});

type RecommendationRuleFormData = z.infer<typeof recommendationRuleSchema>;

// ==================== Shared Components ====================
interface SectionTitleProps {
  children: React.ReactNode;
  className?: string;
}

function SectionTitle({ children, className }: SectionTitleProps) {
  return <h3 className={cn(SECTION_TITLE_CLASS, className)}>{children}</h3>;
}

interface SectionContainerProps {
  children: React.ReactNode;
  className?: string;
}

function SectionContainer({ children, className }: SectionContainerProps) {
  return (
    <div className={cn(SECTION_CLASS, className)}>
      {children}
      {className !== 'border-none' && <hr className="mt-[32px]" />}
    </div>
  );
}

interface FormLabelTextProps {
  children: React.ReactNode;
  className?: string;
}

function FormLabelText({ children, className }: FormLabelTextProps) {
  return <FormLabel className={cn(FORM_LABEL_CLASS, className)}>{children}</FormLabel>;
}

interface SelectFieldProps {
  control: any;
  name: string;
  label: string;
  placeholder: string;
  options: { label: string; value: string }[];
  onChange?: (value: string) => void;
}

function SelectField({ control, name, label, placeholder, options, onChange }: SelectFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabelText>{label}</FormLabelText>
          <Select onValueChange={(value) => { field.onChange(value); onChange?.(value); }} value={field.value} >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
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
  );
}

interface RadioFieldProps {
  control: any;
  name: string;
  options: { value: string; label: string; id: string }[];
  direction?: 'row' | 'col';
  gap?: string;
}

function RadioField({
  control,
  name,
  options,
  direction = 'row',
  gap = 'gap-[24px]',
}: RadioFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              value={field.value}
              className={cn(direction === 'row' ? 'flex items-center' : 'flex flex-col', gap)}
            >
              {options.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <RadioGroupItem value={option.value} id={option.id} />
                  <Label htmlFor={option.id} className="cursor-pointer font-normal">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ==================== MultiSelect Components ====================
interface MultiSelectWithSelectProps {
  options: { label: string; value: string }[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
}

function MultiSelectWithSelect({
  options,
  value,
  onChange,
  placeholder = 'Select options',
  className,
}: MultiSelectWithSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedOptions = useMemo(
    () => options.filter((o) => value.includes(o.value)),
    [options, value],
  );

  const selectedLabels = useMemo(
    () => selectedOptions.map((opt) => opt.label),
    [selectedOptions],
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
          aria-expanded={open}
          className={cn(
            'h-9 w-full justify-between font-normal',
            selectedLabels.length === 0 && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate text-left">{displayText}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(
              'ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform',
              open && 'rotate-180',
            )}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="max-h-[300px] overflow-auto">
          {options.length === 0 ? (
            <div className="text-muted-foreground px-2 py-1.5 text-sm">No options available</div>
          ) : (
            options.map((option) => {
              const isSelected = value.includes(option.value);
              return (
                <div
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'hover:bg-accent relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors outline-none select-none',
                    isSelected && 'bg-accent',
                  )}
                >
                  <div className="flex w-full items-center gap-2">
                    {isSelected ? (
                      <Check className="text-primary h-4 w-4 shrink-0" weight="bold" />
                    ) : (
                      <div className="h-4 w-4 shrink-0" />
                    )}
                    <span className="flex-1">{option.label}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ==================== Form Section Components ====================

function RuleNameSection({ form }: { form: UseFormReturn<RecommendationRuleFormData> }) {
  return (
    <SectionContainer>
      <SectionTitle>Rule Name</SectionTitle>
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
    </SectionContainer>
  );
}

function WhenCustomerViewsSection({form}: { form: UseFormReturn<RecommendationRuleFormData> } ) {
  const watchType = useWatch({
    control: form.control,
    name: 'when_customer_views_type',
  }) as 'category' | 'product' | 'tag';

  const valueOptions = useMemo(() => {
    return getOptionsFromLocalize(watchType);
  }, [watchType]);

  return (
    <SectionContainer>
      <SectionTitle>When Customer Views</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <SelectField
          control={form.control}
          name="when_customer_views_type"
          label="Type"
          placeholder="Select type"
          options={TYPE_OPTIONS}
          onChange={(value) => {
            form.setValue('when_customer_views_value', '');
          }}
        />
        <SelectField
          key={`${watchType}`}
          control={form.control}
          name="when_customer_views_value"
          label="Value"
          placeholder="Select value"
          options={valueOptions}
        />
      </div>
    </SectionContainer>
  );
}

function RecommendProductsFromSection({form}: { form: UseFormReturn<RecommendationRuleFormData> } ) {
  const watchType = useWatch({
    control: form.control,
    name: 'recommend_products_from_type',
  }) as 'category' | 'product' | 'tag';

  const valueOptions = useMemo(() => {
    return getOptionsFromLocalize(watchType);
  }, [watchType]);

  const maxProductsOptionsFormatted = MAX_PRODUCTS_OPTIONS.map((num) => ({
    label: num,
    value: num,
  }));

  return (
    <SectionContainer>
      <SectionTitle>Recommend Products From</SectionTitle>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            control={form.control}
            name="recommend_products_from_type"
            label="Type"
            placeholder="Select type"
            options={TYPE_OPTIONS}
            onChange={(value) => {
              form.setValue('recommend_products_from_value', []);
            }}
          />
          <FormField
            control={form.control}
            name="recommend_products_from_value"
            render={({ field }) => (
              <FormItem>
                <FormLabelText>Value</FormLabelText>
                <FormControl>
                  <MultiSelectWithSelect
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
          <SelectField
            control={form.control}
            name="max_products_to_show"
            label="Max products to show"
            placeholder="Select max products"
            options={maxProductsOptionsFormatted}
          />
          <SelectField
            control={form.control}
            name="sort_by"
            label="Sort by"
            placeholder="Select sort option"
            options={SORT_BY_OPTIONS}
          />
        </div>
      </div>
    </SectionContainer>
  );
}

function DisplaySettingsSection({ form }: { form: UseFormReturn<RecommendationRuleFormData> } ) {
  const layoutOptions = [
    { label: 'Grid', value: 'grid' },
    { label: 'List', value: 'list' },
  ];

  return (
    <SectionContainer>
      <SectionTitle>Display Settings</SectionTitle>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <SelectField
            control={form.control}
            name="layout"
            label="Layout"
            placeholder="Select layout"
            options={layoutOptions}
          />
          <FormField
            control={form.control}
            name="section_title"
            render={({ field }) => (
              <FormItem>
                <FormLabelText>Section title</FormLabelText>
                <FormControl>
                  <Input {...field} placeholder="Complete Your Purchase" className="w-full" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </SectionContainer>
  );
}

function BehaviorSection({ form }: { form: UseFormReturn<RecommendationRuleFormData> } ) {
  const behaviorOptions = [
    { value: 'hide', label: 'Hide it', id: 'hide' },
    { value: 'show', label: 'Still show it', id: 'show' },
  ];

  return (
    <SectionContainer>
      <SectionTitle>Behavior</SectionTitle>
      <div className="space-y-3">
        <Label className={FORM_LABEL_CLASS}>If recommended product is already in cart:</Label>
        <RadioField
          control={form.control}
          name="behavior_if_in_cart"
          options={behaviorOptions}
          direction="col"
          gap="gap-[8px]"
        />
      </div>
    </SectionContainer>
  );
}

function StatusSection({ form }: { form: UseFormReturn<RecommendationRuleFormData> } ) {
  const statusOptions = [
    { value: 'active', label: 'Active', id: 'active' },
    { value: 'inactive', label: 'Inactive', id: 'inactive' },
  ];

  return (
    <SectionContainer className="border-none">
      <SectionTitle>Status</SectionTitle>
      <RadioField control={form.control} name="status" options={statusOptions} />
    </SectionContainer>
  );
}

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
      when_customer_views_value: 'phones',
      recommend_products_from_type: 'category',
      recommend_products_from_value: [],
      max_products_to_show: '3',
      sort_by: 'best_selling',
      show_on_product_page: true,
      show_on_cart_page: true,
      show_on_mini_cart: false,
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
        show_on_product_page: settings?.show_on_product_page ?? true,
        show_on_cart_page: settings?.show_on_cart_page ?? true,
        show_on_mini_cart: settings?.show_on_mini_cart ?? false,
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
        show_on_product_page: data.show_on_product_page,
        show_on_cart_page: data.show_on_cart_page,
        show_on_mini_cart: data.show_on_mini_cart,
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
            className="hover:bg-muted flex h-8 w-8 items-center justify-center rounded-md border"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{'Edit Rule'}</h1>
            <p className="text-muted-foreground text-sm">
              {'Configure your product recommendation rule'}
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-lg border p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-[14px]">
            <RuleNameSection form={form} />
            <WhenCustomerViewsSection form={form} />
            <RecommendProductsFromSection form={form}/>
            <DisplaySettingsSection form={form} />
            <BehaviorSection form={form} />
            <StatusSection form={form} />

            {/* Submit button */}
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
