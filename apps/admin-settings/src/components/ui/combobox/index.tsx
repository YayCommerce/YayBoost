import { useState } from 'react';
import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface ComboboxProps {
  values: {
    label: string;
    value: string;
  }[];
  selectedValues: { label: string; value: string }[];
  onChange: (values: { label: string; value: string }, checked: boolean) => void;
}

function Combobox({ values, selectedValues, onChange }: ComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-fit min-w-[280px] justify-between"
        >
          {selectedValues.length > 0
            ? selectedValues.length === values.length
              ? 'All Attributes'
              : selectedValues.map((value) => value.label).join(', ')
            : 'Select values ...'}
          <CaretDownIcon className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search value..." />
          <CommandList>
            <CommandEmpty>No value found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                key="select-all"
                value="All Attributes"
                onSelect={() => {
                  onChange(
                    { label: 'All Attributes', value: 'all' },
                    selectedValues.length === values.length ? false : true,
                  );
                }}
              >
                <div
                  className="border-input data-[selected=true]:border-primary data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground pointer-events-none size-4 shrink-0 rounded-[4px] border transition-all select-none *:[svg]:opacity-0 data-[selected=true]:*:[svg]:opacity-100"
                  data-selected={selectedValues.length === values.length}
                >
                  <CheckIcon className="size-3.5 text-current" />
                </div>
                All Attributes
              </CommandItem>
              {values.map((value) => (
                <CommandItem
                  key={value.value}
                  value={`${value.value}-${value.label}`}
                  onSelect={() => {
                    onChange(
                      value,
                      selectedValues.some((f) => f.value === value.value),
                    );
                  }}
                >
                  <div
                    className="border-input data-[selected=true]:border-primary data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground pointer-events-none size-4 shrink-0 rounded-[4px] border transition-all select-none *:[svg]:opacity-0 data-[selected=true]:*:[svg]:opacity-100"
                    data-selected={selectedValues.some((f) => f.value === value.value)}
                  >
                    <CheckIcon className="size-3.5 text-current" />
                  </div>
                  {value.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default Combobox;
