'use client';

import * as React from 'react';
import { CaretDownIcon, CheckIcon, MagnifyingGlassIcon, XCircleIcon } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input, InputSuffix } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type Option = { label: string; value: string };

type MultiSelectProps = {
  name?: string;
  options: Option[];
  defaultValue?: string[];
  value?: string[];
  disabled?: boolean;
  placeholder?: string;
  size?: 'sm' | 'default';
  showSearch?: boolean;
  emptyText?: string;
  onChange?: (values: string[]) => void;
  className?: string;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onSearchChange?: (search: string) => void;
};

// Core MultiSelect component - supports both controlled and uncontrolled modes
function MultiSelect({
  name,
  options,
  defaultValue,
  value,
  disabled,
  placeholder = 'Select options',
  size = 'default',
  showSearch = false,
  emptyText = 'No results',
  onChange,
  className,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onSearchChange,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const isControlled = value !== undefined;
  const [internalValues, setInternalValues] = React.useState<string[]>(() =>
    Array.isArray(defaultValue) ? [...defaultValue] : [],
  );
  const selectedValues = isControlled ? (Array.isArray(value) ? value : []) : internalValues;
  const listRef = React.useRef<HTMLDivElement>(null);

  // Sync internal state with controlled value prop
  React.useEffect(() => {
    if (isControlled && Array.isArray(value)) {
      setInternalValues(value);
    }
  }, [value, isControlled]);

  const selectedOptions = React.useMemo(
    () => options.filter((o) => selectedValues.includes(o.value)),
    [options, selectedValues],
  );

  function toggle(val: string) {
    const exists = selectedValues.includes(val);
    const next = exists ? selectedValues.filter((v) => v !== val) : [...selectedValues, val];
    onChange?.(next);
    if (!isControlled) {
      setInternalValues(next);
    }
  }

  function clearAll(e?: React.MouseEvent) {
    e?.stopPropagation();
    onChange?.([]);
    if (!isControlled) {
      setInternalValues([]);
    }
  }

  const filtered = React.useMemo(() => {
    // If external search handler is provided, don't filter locally
    if (onSearchChange) return options;
    if (!showSearch || !search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, showSearch, search, onSearchChange]);

  // Handle search with debounce for external search
  React.useEffect(() => {
    if (!onSearchChange) return;
    const timeoutId = setTimeout(() => {
      onSearchChange(search);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [search, onSearchChange]);

  // Handle scroll for infinite loading
  const handleScroll = React.useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!hasMore || !onLoadMore || isLoading) return;
      const target = e.currentTarget;
      const bottom = target.scrollHeight - target.scrollTop - target.clientHeight < 50;
      if (bottom) {
        onLoadMore();
      }
    },
    [hasMore, onLoadMore, isLoading],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          data-slot="select-trigger"
          data-size={size}
          disabled={disabled}
          className={cn(
            "border-input hover:bg-accent data-placeholder:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50 disabled:hover:border-input flex w-full items-center gap-2 rounded-md border bg-transparent px-3 py-2 text-sm font-normal transition-all outline-none disabled:cursor-not-allowed disabled:bg-[#f2f5f9] disabled:opacity-50",
            selectedOptions.length === 0
              ? 'data-[size=default]:h-9 data-[size=sm]:h-8'
              : 'min-h-9 data-[size=sm]:min-h-8',
            'relative whitespace-normal',
            className,
          )}
        >
          <div className="flex min-h-5 flex-1 items-center gap-1 text-left">
            {selectedOptions.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1">
                  {selectedOptions.map((opt) => (
                    <Badge key={opt.value} variant="outline" className="shrink-0 pr-1 pl-2">
                      <span className="max-w-[200px] truncate">{opt.label}</span>
                      <div
                        role="button"
                        tabIndex={0}
                        className="text-muted-foreground hover:text-foreground ml-1 grid cursor-pointer place-items-center rounded-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(opt.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            toggle(opt.value);
                          }
                        }}
                        aria-label={`Remove ${opt.label}`}
                      >
                        <XCircleIcon className="size-3.5" />
                      </div>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {selectedValues.length > 0 && (
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  clearAll(e);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    clearAll();
                  }
                }}
                className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 text-xs"
                aria-label="Clear all"
              >
                <XCircleIcon className="size-4" />
              </div>
            )}
            <CaretDownIcon className="size-4 shrink-0" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="min-w-(--radix-popover-trigger-width,260px) p-0">
        {showSearch && (
          <div className="relative p-2 pb-0">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
            <InputSuffix className="pointer-events-none end-0 mr-3 pt-2">
              <MagnifyingGlassIcon className="size-4" />
            </InputSuffix>
          </div>
        )}

        <div
          ref={listRef}
          className="thin-scrollbar pointer-events-auto max-h-72 overflow-y-auto"
          onScroll={handleScroll}
          onWheelCapture={(e) => {
            e.stopPropagation();
          }}
          style={{ scrollbarWidth: 'thin' }}
        >
          {filtered.length === 0 && !isLoading ? (
            <div className="text-muted-foreground py-6 text-center text-sm">{emptyText}</div>
          ) : (
            <ul role="listbox" aria-multiselectable className="grid gap-0.5">
              {filtered.map((opt) => {
                const checked = selectedValues.includes(opt.value);
                return (
                  <li key={opt.value} role="option" aria-selected={checked}>
                    <button
                      type="button"
                      onClick={() => toggle(opt.value)}
                      className={cn(
                        'relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none hover:bg-[#f2f5f9]',
                      )}
                    >
                      <span className="absolute right-2 flex size-3.5 items-center justify-center">
                        {checked && <CheckIcon className="text-primary size-4" />}
                      </span>
                      <span>{opt.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {isLoading && (
            <div className="text-muted-foreground py-3 text-center text-sm">Loading...</div>
          )}
        </div>

        {/* Hidden inputs for form submission when name is provided */}
        {name &&
          selectedValues.map((v) => <input key={v} type="hidden" name={`${name}[]`} value={v} />)}
      </PopoverContent>
    </Popover>
  );
}

export type { MultiSelectProps, Option };
export { MultiSelect };
