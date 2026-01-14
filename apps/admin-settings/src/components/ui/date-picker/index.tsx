import { format } from 'date-fns';
import { Calendar as CalendarIcon, Trash, X } from 'lucide-react';

import { Button } from '../button';
import { Calendar } from '../calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';

export function DatePicker({
  date,
  setDate,
  placeholder,
  id,
}: {
  date?: Date;
  setDate: (date?: Date) => void;
  placeholder?: string;
  id?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          data-empty={!date}
          className="data-[empty=true]:text-muted-foreground flex w-full items-center justify-start text-left font-normal"
        >
          <CalendarIcon className="h-4 w-4" />
          <span className="flex-1 truncate text-left">
            {date ? format(date, 'PPP') : <span>{placeholder}</span>}
          </span>
          {date && (
            <span
              className="ml-2 flex items-center"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDate(undefined);
              }}
              tabIndex={-1}
              role="button"
              aria-label="Clear date"
            >
              <X className="text-muted-foreground hover:text-foreground h-4 w-4" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(date: Date | undefined) => setDate(date || new Date())}
          required={false}
        />
      </PopoverContent>
    </Popover>
  );
}
