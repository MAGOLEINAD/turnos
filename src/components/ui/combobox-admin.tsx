'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Search, User } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface Admin {
  id: string
  nombre: string
  apellido: string
  email: string
}

interface ComboboxAdminProps {
  admins: Admin[]
  value?: string
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ComboboxAdmin({
  admins,
  value,
  onValueChange,
  disabled,
  placeholder = 'Buscar admin...',
}: ComboboxAdminProps) {
  const [open, setOpen] = React.useState(false)
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const [buttonWidth, setButtonWidth] = React.useState<number | undefined>(undefined)

  React.useEffect(() => {
    if (buttonRef.current) {
      setButtonWidth(buttonRef.current.offsetWidth)
    }
  }, [])

  const selectedAdmin = admins.find((admin) => admin.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={buttonRef}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between text-left font-normal',
            !value && 'text-muted-foreground'
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedAdmin ? (
              <>
                <User className="h-4 w-4 shrink-0 opacity-50" />
                <span className="truncate">
                  {selectedAdmin.nombre} {selectedAdmin.apellido}
                </span>
                <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                  · {selectedAdmin.email}
                </span>
              </>
            ) : (
              <span className="truncate">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        align="start"
        style={{ width: buttonWidth }}
      >
        <Command>
          <CommandInput
            placeholder="Buscar por nombre o email..."
          />
          <CommandList>
            <CommandEmpty>
              <div className="py-6 text-center text-sm">
                <User className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No se encontraron admins</p>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {admins.map((admin) => (
                <CommandItem
                  key={admin.id}
                  value={`${admin.nombre} ${admin.apellido} ${admin.email}`}
                  onSelect={() => {
                    onValueChange(admin.id === value ? '' : admin.id)
                    setOpen(false)
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === admin.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="font-medium truncate">
                      {admin.nombre} {admin.apellido}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {admin.email}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
