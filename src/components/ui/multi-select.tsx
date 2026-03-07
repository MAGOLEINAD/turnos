'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils/cn'

export interface MultiSelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (nextValue: string[]) => void
  placeholder?: string
  searchable?: boolean
  compactSummary?: boolean
  showBadges?: boolean
  searchPlaceholder?: string
  emptyText?: string
  maxSelections?: number
  disabled?: boolean
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  searchable = true,
  compactSummary = false,
  showBadges = true,
  searchPlaceholder = 'Buscar...',
  emptyText = 'Sin resultados',
  maxSelections,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)

  const selectedOptions = useMemo(
    () => options.filter((option) => value.includes(option.value)),
    [options, value]
  )

  const handleToggle = (optionValue: string) => {
    const alreadySelected = value.includes(optionValue)
    if (alreadySelected) {
      onChange(value.filter((v) => v !== optionValue))
      return
    }

    if (maxSelections && value.length >= maxSelections) {
      return
    }

    onChange([...value, optionValue])
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className={cn('truncate', value.length === 0 && 'text-muted-foreground')}>
              {value.length > 0
                ? compactSummary
                  ? `${selectedOptions.length} ${selectedOptions.length === 1 ? 'seleccionada' : 'seleccionadas'}`
                  : selectedOptions.map((option) => option.label).join(', ')
                : placeholder}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            {searchable ? <CommandInput placeholder={searchPlaceholder} /> : null}
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const checked = value.includes(option.value)
                  const atLimit = !!maxSelections && value.length >= maxSelections && !checked
                  const isDisabled = !!option.disabled || atLimit

                  return (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      onSelect={() => {
                        if (isDisabled) return
                        handleToggle(option.value)
                      }}
                      className={cn(isDisabled && 'opacity-50')}
                    >
                      <span>{option.label}</span>
                      {checked && <Check className="ml-auto h-4 w-4 text-primary" />}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {showBadges && selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map((option) => (
            <Badge key={option.value} variant="secondary">
              {option.label}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
