import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

type StatusAlertVariant = 'info' | 'success' | 'warning' | 'error'

interface StatusAlertProps {
  title?: string
  description: string
  variant?: StatusAlertVariant
  className?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

const variantConfig: Record<
  StatusAlertVariant,
  {
    icon: typeof Info
    className: string
    iconClassName: string
    borderColor: string
    iconBgColor: string
  }
> = {
  info: {
    icon: Info,
    className: 'border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-blue-100/40 text-blue-900 dark:border-blue-800/50 dark:bg-gradient-to-br dark:from-blue-950/30 dark:to-blue-900/10 dark:text-blue-100',
    iconClassName: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-l-blue-500 dark:border-l-blue-400',
    iconBgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  success: {
    icon: CheckCircle2,
    className: 'border-green-200/60 bg-gradient-to-br from-green-50/80 to-green-100/40 text-green-900 dark:border-green-800/50 dark:bg-gradient-to-br dark:from-green-950/30 dark:to-green-900/10 dark:text-green-100',
    iconClassName: 'text-green-600 dark:text-green-400',
    borderColor: 'border-l-green-500 dark:border-l-green-400',
    iconBgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-amber-100/40 text-amber-900 dark:border-amber-800/50 dark:bg-gradient-to-br dark:from-amber-950/30 dark:to-amber-900/10 dark:text-amber-100',
    iconClassName: 'text-amber-600 dark:text-amber-500',
    borderColor: 'border-l-amber-500 dark:border-l-amber-400',
    iconBgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  error: {
    icon: AlertCircle,
    className: 'border-red-200/60 bg-gradient-to-br from-red-50/80 to-red-100/40 text-red-900 dark:border-red-800/50 dark:bg-gradient-to-br dark:from-red-950/30 dark:to-red-900/10 dark:text-red-100',
    iconClassName: 'text-red-600 dark:text-red-400',
    borderColor: 'border-l-red-500 dark:border-l-red-400',
    iconBgColor: 'bg-red-100 dark:bg-red-900/30',
  },
}

export function StatusAlert({
  title,
  description,
  variant = 'info',
  className,
  action,
}: StatusAlertProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <Alert className={cn(
      config.className,
      config.borderColor,
      'border-l-4 shadow-sm',
      className
    )}>
      <div className="flex gap-3">
        {/* Icon Container */}
        <div className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          config.iconBgColor
        )}>
          <Icon className={cn('h-4 w-4', config.iconClassName)} />
        </div>

        {/* Content */}
        <div className="flex-1 space-y-1 pt-0.5">
          {title && (
            <AlertTitle className="mb-1 text-sm font-semibold leading-none tracking-tight">
              {title}
            </AlertTitle>
          )}
          <AlertDescription className="text-sm leading-relaxed opacity-90">
            {description}
          </AlertDescription>

          {/* Action Button */}
          {action && (
            <div className="pt-3">
              {action.href ? (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-8 gap-1.5 border-current/20 bg-white/50 text-xs font-medium hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10',
                    variant === 'info' && 'hover:border-blue-400 hover:text-blue-700 dark:hover:text-blue-300',
                    variant === 'success' && 'hover:border-green-400 hover:text-green-700 dark:hover:text-green-300',
                    variant === 'warning' && 'hover:border-amber-400 hover:text-amber-700 dark:hover:text-amber-300',
                    variant === 'error' && 'hover:border-red-400 hover:text-red-700 dark:hover:text-red-300'
                  )}
                >
                  <Link href={action.href}>
                    {action.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              ) : (
                <Button
                  onClick={action.onClick}
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-8 gap-1.5 border-current/20 bg-white/50 text-xs font-medium hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10',
                    variant === 'info' && 'hover:border-blue-400 hover:text-blue-700 dark:hover:text-blue-300',
                    variant === 'success' && 'hover:border-green-400 hover:text-green-700 dark:hover:text-green-300',
                    variant === 'warning' && 'hover:border-amber-400 hover:text-amber-700 dark:hover:text-amber-300',
                    variant === 'error' && 'hover:border-red-400 hover:text-red-700 dark:hover:text-red-300'
                  )}
                >
                  {action.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Alert>
  )
}

