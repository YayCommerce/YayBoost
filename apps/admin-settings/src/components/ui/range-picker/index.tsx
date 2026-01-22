import * as React from 'react';
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { type DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
export function RangePicker({
  date,
  setDate,
  className,
}: {
  date?: DateRange;
  setDate: (date?: DateRange) => void;
  className?: string;
}) {
  return (
    <Popover>
        <PopoverTrigger asChild>
            <Button
            variant="outline"
            id="date-picker-range"
            className={cn("justify-start px-2.5 font-normal", className)}
            >
            <CalendarIcon />
            {date?.from ? (
                date.to ? (
                <>
                    {format(date.from, "LLL dd, y")} -{" "}
                    {format(date.to, "LLL dd, y")}
                </>
                ) : (
                format(date.from, "LLL dd, y")
                )
            ) : (
                <span>Pick a date</span>
            )}
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
            <Calendar
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
            />
        </PopoverContent>
    </Popover>
  )
}
