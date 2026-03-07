'use client'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { CLIENT_ICON_OPTIONS, normalizeClientIcon } from '@/lib/utils/clientes'

interface ClientIconPickerProps {
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function ClientIconPicker({ value, onChange, disabled = false }: ClientIconPickerProps) {
  const currentIcon = normalizeClientIcon(value)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2"
          disabled={disabled}
        >
          <span className="text-lg leading-none">{currentIcon}</span>
          <span>Elegir icono</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px]">
        <div className="grid grid-cols-6 gap-2">
          {CLIENT_ICON_OPTIONS.map((icon) => (
            <Button
              key={icon}
              type="button"
              variant={currentIcon === icon ? 'default' : 'outline'}
              className="h-10 w-10 p-0 text-lg"
              onClick={() => onChange(icon)}
            >
              {icon}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
