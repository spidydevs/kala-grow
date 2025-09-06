import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { DateRange } from '@/hooks/useProductivityAnalytics';

interface DateRangePickerProps {
  dateRange: DateRange;
  onChange: (dateRange: DateRange) => void;
  disabled?: boolean;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  dateRange,
  onChange,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const formatDateRange = () => {
    if (dateRange.startDate && dateRange.endDate) {
      return `${format(dateRange.startDate, 'MMM dd, yyyy')} - ${format(dateRange.endDate, 'MMM dd, yyyy')}`;
    }
    return 'Select date range';
  };

  const handleSelect = (range: any) => {
    if (range?.from && range?.to) {
      onChange({
        startDate: range.from,
        endDate: range.to
      });
      setIsOpen(false);
    } else if (range?.from) {
      onChange({
        startDate: range.from,
        endDate: range.from
      });
    }
  };

  const getPresetRanges = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const lastMonth = new Date(today);
    lastMonth.setDate(lastMonth.getDate() - 30);
    
    const lastQuarter = new Date(today);
    lastQuarter.setDate(lastQuarter.getDate() - 90);

    return [
      {
        label: 'Today',
        range: { startDate: today, endDate: today }
      },
      {
        label: 'Yesterday',
        range: { startDate: yesterday, endDate: yesterday }
      },
      {
        label: 'Last 7 days',
        range: { startDate: lastWeek, endDate: today }
      },
      {
        label: 'Last 30 days',
        range: { startDate: lastMonth, endDate: today }
      },
      {
        label: 'Last 90 days',
        range: { startDate: lastQuarter, endDate: today }
      }
    ];
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal',
              !dateRange.startDate && 'text-muted-foreground'
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={dateRange.startDate}
            selected={{
              from: dateRange.startDate,
              to: dateRange.endDate
            }}
            onSelect={handleSelect}
            numberOfMonths={2}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Preset Range Buttons */}
      <div className="flex flex-wrap gap-2">
        {getPresetRanges().map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            onClick={() => onChange(preset.range)}
            disabled={disabled}
            className="text-xs"
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
};