import { zodResolver } from '@hookform/resolvers/zod'
import { Search } from 'lucide-react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

import { Input } from '@/components/ui/input'

const schema = z.object({
  q: z.string().max(200, 'Too long'),
})

export type DashboardSearchValues = z.infer<typeof schema>

export function DashboardSearchBar({ onSubmit }: { onSubmit: (q: string) => void }) {
  const { register, handleSubmit, reset } = useForm<DashboardSearchValues>({
    resolver: zodResolver(schema),
    defaultValues: { q: '' },
  })

  return (
    <form
      className="relative flex w-full max-w-xl flex-1 items-center gap-2"
      onSubmit={handleSubmit((values) => onSubmit(values.q))}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input className="h-10 rounded-full pl-9 shadow-sm" placeholder="Search orders, customers, or SKUs…" {...register('q')} />
      <button className="sr-only" type="submit">
        Search
      </button>
      <button
        type="button"
        className="sr-only"
        onClick={() => {
          reset({ q: '' })
          onSubmit('')
        }}
      >
        Clear
      </button>
    </form>
  )
}
