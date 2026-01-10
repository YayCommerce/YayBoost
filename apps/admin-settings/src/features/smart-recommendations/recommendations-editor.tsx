import * as React from 'react';
import { useCreateEntity, useUpdateEntity } from '@/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { FeatureComponentProps } from '..';

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
  layout: z.enum(['grid', 'list', 'slider']),
  section_title: z.string().min(1, 'Section title is required'),
  behavior_if_in_cart: z.enum(['hide', 'show']),
  status: z.enum(['active', 'inactive']),
});

type RecommendationRuleFormData = z.infer<typeof recommendationRuleSchema>;

// ==================== Shared Styles ====================
const SECTION_TITLE_CLASS = 'text-[18px] leading-[28px] tracking-[-0.89px] font-semibold';
const FORM_LABEL_CLASS = 'text-base leading-6 font-normal';
const SECTION_CLASS = 'p-[9px]';

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
}

function SelectField({ control, name, label, placeholder, options }: SelectFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabelText>{label}</FormLabelText>
          <Select onValueChange={field.onChange} value={field.value}>
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
interface MultiSelectTriggerProps {
  selectedLabels: string[];
  placeholder: string;
  className?: string;
}

function MultiSelectTrigger({ selectedLabels, placeholder, className }: MultiSelectTriggerProps) {
  const displayText = selectedLabels.length === 0 ? placeholder : selectedLabels.join(', ');

  return (
    <SelectTrigger className={cn('w-full', className)}>
      <SelectValue>
        <span className={selectedLabels.length === 0 ? 'text-muted-foreground' : ''}>
          {displayText}
        </span>
      </SelectValue>
    </SelectTrigger>
  );
}

interface MultiSelectItemProps {
  value: string;
  label: string;
  isSelected: boolean;
  onSelect: (value: string) => void;
}

function MultiSelectItem({ value, label, isSelected, onSelect }: MultiSelectItemProps) {
  return (
    <SelectItem
      value={value}
      onSelect={() => onSelect(value)}
      className={cn(isSelected && 'bg-accent')}
    >
      <div className="flex items-center gap-2">
        {isSelected && <span className="text-primary">✓</span>}
        {label}
      </div>
    </SelectItem>
  );
}

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
  const [open, setOpen] = React.useState(false);

  const selectedOptions = React.useMemo(
    () => options.filter((o) => value.includes(o.value)),
    [options, value],
  );

  const selectedLabels = React.useMemo(
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

  return (
    <Select open={open} onOpenChange={setOpen} value={value[0] || ''}>
      <MultiSelectTrigger
        selectedLabels={selectedLabels}
        placeholder={placeholder}
        className={className}
      />
      <SelectContent>
        {options.map((option) => (
          <MultiSelectItem
            key={option.value}
            value={option.value}
            label={option.label}
            isSelected={value.includes(option.value)}
            onSelect={handleSelect}
          />
        ))}
      </SelectContent>
    </Select>
  );
}

// ==================== Form Section Components ====================
interface FormSectionProps {
  control: any;
}

function RuleNameSection({ control }: FormSectionProps) {
  return (
    <SectionContainer>
      <SectionTitle>Rule Name</SectionTitle>
      <FormField
        control={control}
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

function WhenCustomerViewsSection({
  control,
  categoryOptions,
}: FormSectionProps & { categoryOptions: { label: string; value: string }[] }) {
  const typeOptions = [
    { label: 'Category', value: 'category' },
    { label: 'Product', value: 'product' },
    { label: 'Tag', value: 'tag' },
  ];

  return (
    <SectionContainer>
      <SectionTitle>When Customer Views</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <SelectField
          control={control}
          name="when_customer_views_type"
          label="Type"
          placeholder="Select type"
          options={typeOptions}
        />
        <SelectField
          control={control}
          name="whenCustomerViewsValue"
          label="Value"
          placeholder="Select value"
          options={categoryOptions}
        />
      </div>
    </SectionContainer>
  );
}

function RecommendProductsFromSection({
  control,
  categoryOptions,
  sortByOptions,
  maxProductsOptions,
}: FormSectionProps & {
  categoryOptions: { label: string; value: string }[];
  sortByOptions: { label: string; value: string }[];
  maxProductsOptions: string[];
}) {
  const typeOptions = [
    { label: 'Category', value: 'category' },
    { label: 'Product', value: 'product' },
    { label: 'Tag', value: 'tag' },
  ];

  const maxProductsOptionsFormatted = maxProductsOptions.map((num) => ({
    label: num,
    value: num,
  }));

  return (
    <SectionContainer>
      <SectionTitle>Recommend Products From</SectionTitle>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            control={control}
            name="recommend_products_from_type"
            label="Type"
            placeholder="Select type"
            options={typeOptions}
          />
          <FormField
            control={control}
            name="recommend_products_from_value"
            render={({ field }) => (
              <FormItem>
                <FormLabelText>Value</FormLabelText>
                <FormControl>
                  <MultiSelectWithSelect
                    options={categoryOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select categories"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            control={control}
            name="max_products_to_show"
            label="Max products to show"
            placeholder="Select max products"
            options={maxProductsOptionsFormatted}
          />
          <SelectField
            control={control}
            name="sort_by"
            label="Sort by"
            placeholder="Select sort option"
            options={sortByOptions}
          />
        </div>
      </div>
    </SectionContainer>
  );
}

function DisplaySettingsSection({ control }: FormSectionProps) {
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
            control={control}
            name="layout"
            label="Layout"
            placeholder="Select layout"
            options={layoutOptions}
          />
          <FormField
            control={control}
            name="sectionTitle"
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

function BehaviorSection({ control }: FormSectionProps) {
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
          control={control}
          name="behavior_if_in_cart"
          options={behaviorOptions}
          direction="col"
          gap="gap-[8px]"
        />
      </div>
    </SectionContainer>
  );
}

function StatusSection({ control }: FormSectionProps) {
  const statusOptions = [
    { value: 'active', label: 'Active', id: 'active' },
    { value: 'inactive', label: 'Inactive', id: 'inactive' },
  ];

  return (
    <SectionContainer className="border-none">
      <SectionTitle>Status</SectionTitle>
      <RadioField control={control} name="status" options={statusOptions} />
    </SectionContainer>
  );
}

// ==================== Main Component ====================
const RecommendationsEditor = ({ featureId }: FeatureComponentProps) => {
  const navigate = useNavigate();
  const { recommendationId } = useParams<{ recommendationId: string }>();
  const isEditing = !!recommendationId;

  const form = useForm<RecommendationRuleFormData>({
    resolver: zodResolver(recommendationRuleSchema),
    defaultValues: {
      name: '',
      when_customer_views_type: 'category',
      when_customer_views_value: 'phones',
      recommend_products_from_type: 'category',
      recommend_products_from_value: ['phone-cases', 'screen-protectors'],
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

  const createEntity = useCreateEntity(featureId);
  const updateEntity = useUpdateEntity(featureId);

  const isPending = createEntity.isPending || updateEntity.isPending;

  const onSubmit = (data: RecommendationRuleFormData) => {
    console.log('Form data:', data);
    // Handle form submission
  };

  // Mock options - replace with actual data from API
  const categoryOptions = [
    { label: 'Phones', value: 'phones' },
    { label: 'Phone Cases', value: 'phone-cases' },
    { label: 'Screen Protectors', value: 'screen-protectors' },
    { label: 'Accessories', value: 'accessories' },
  ];

  const sortByOptions = [
    { label: 'Best Selling', value: 'best_selling' },
    { label: 'Price: Low to High', value: 'price_low' },
    { label: 'Price: High to Low', value: 'price_high' },
    { label: 'Newest', value: 'newest' },
    { label: 'Relevance', value: 'relevance' },
  ];

  const maxProductsOptions = ['1', '2', '3', '4', '5', '6', '8', '10', '12'];

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
            <RuleNameSection control={form.control} />
            <WhenCustomerViewsSection control={form.control} categoryOptions={categoryOptions} />
            <RecommendProductsFromSection
              control={form.control}
              categoryOptions={categoryOptions}
              sortByOptions={sortByOptions}
              maxProductsOptions={maxProductsOptions}
            />
            <DisplaySettingsSection control={form.control} />
            <BehaviorSection control={form.control} />
            <StatusSection control={form.control} />
          </form>
        </Form>
      </div>
      {/* Submit button */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button type="submit" className="bg-[#171717] text-white" disabled={isPending}>
          {isPending ? 'Saving...' : isEditing ? 'Update Rule' : 'Create Rule'}
        </Button>
      </div>
    </div>
  );
};

export default RecommendationsEditor;
