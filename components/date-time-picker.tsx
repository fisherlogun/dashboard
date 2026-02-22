"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon, Clock } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface DateTimePickerProps {
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  minDate?: Date
}

export function DateTimePicker({
  date,
  onDateChange,
  label,
  placeholder = "Pick a date and time",
  disabled = false,
  minDate,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [hours, setHours] = React.useState(date ? String(date.getHours()).padStart(2, "0") : "12")
  const [minutes, setMinutes] = React.useState(date ? String(date.getMinutes()).padStart(2, "0") : "00")

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      onDateChange(undefined)
      return
    }
    const h = parseInt(hours, 10) || 0
    const m = parseInt(minutes, 10) || 0
    const newDate = new Date(selectedDate)
    newDate.setHours(h, m, 0, 0)
    onDateChange(newDate)
  }

  const handleTimeChange = (newHours: string, newMinutes: string) => {
    setHours(newHours)
    setMinutes(newMinutes)
    if (date) {
      const h = parseInt(newHours, 10) || 0
      const m = parseInt(newMinutes, 10) || 0
      const newDate = new Date(date)
      newDate.setHours(h, m, 0, 0)
      onDateChange(newDate)
    }
  }

  return (
    <div className="space-y-1.5">
      {label && <Label className="text-xs text-foreground">{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP 'at' HH:mm") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            disabled={minDate ? (d) => d < minDate : undefined}
          />
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-xs text-muted-foreground">Time</Label>
              <div className="flex items-center gap-1 ml-auto">
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={hours}
                  onChange={(e) => handleTimeChange(e.target.value, minutes)}
                  className="h-8 w-14 text-center font-mono text-sm"
                />
                <span className="text-muted-foreground font-bold">:</span>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={minutes}
                  onChange={(e) => handleTimeChange(hours, e.target.value)}
                  className="h-8 w-14 text-center font-mono text-sm"
                />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
