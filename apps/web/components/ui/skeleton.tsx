function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-shimmer rounded-md bg-muted ${className || ''}`}
      {...props}
    />
  )
}

export { Skeleton }
