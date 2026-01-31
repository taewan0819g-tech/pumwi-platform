import { cn } from '@/lib/utils'

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-gray-200 shadow-sm',
        className
      )}
      {...props}
    />
  )
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  action?: React.ReactNode
}

export function CardHeader({
  className,
  children,
  action,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={cn('flex items-center justify-between p-4 border-b border-gray-100', className)}
      {...props}
    >
      <div>{children}</div>
      {action != null && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...props} />
}
