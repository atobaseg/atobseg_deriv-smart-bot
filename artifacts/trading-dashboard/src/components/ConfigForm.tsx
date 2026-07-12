import * as React from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { EngineConfig, EngineStatusState } from "@workspace/api-client-react"
import { useUpdateEngineConfig, useListMarkets } from "@workspace/api-client-react"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

const configSchema = z.object({
  market: z.string().min(1, "Market is required"),
  accountType: z.enum(["demo", "real"]),
  baseStake: z.coerce.number().min(0.35, "Minimum stake is 0.35"),
  martingaleEnabled: z.boolean(),
  martingaleMultiplier: z.coerce.number().min(1, "Minimum multiplier is 1"),
  stopLoss: z.coerce.number().min(0, "Must be >= 0"),
  takeProfit: z.coerce.number().min(0, "Must be >= 0"),
  maxSuccessiveLosses: z.coerce.number().int().min(1, "Must be >= 1"),
  maxSuccessiveWins: z.coerce.number().int().min(1, "Must be >= 1"),
})

type ConfigFormValues = z.infer<typeof configSchema>

export function ConfigForm({ config, state }: { config: EngineConfig, state: EngineStatusState }) {
  const { toast } = useToast()
  const { data: markets = [], isLoading: loadingMarkets } = useListMarkets()
  
  const updateConfig = useUpdateEngineConfig()
  
  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      ...config,
    },
  })

  // Update form if external config completely changes (e.g. initial load)
  React.useEffect(() => {
    form.reset(config)
  }, [config, form])

  const isRunning = state === 'running'
  const isMartingaleEnabled = form.watch("martingaleEnabled")

  const onSubmit = (data: ConfigFormValues) => {
    updateConfig.mutate({ data }, {
      onSuccess: () => {
        toast({
          title: "Configuration Saved",
          description: "Engine configuration has been successfully updated.",
        })
      },
      onError: (err: any) => {
        toast({
          title: "Failed to save configuration",
          description: err?.error || "Unknown error occurred",
          variant: "destructive"
        })
      }
    })
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Configuration</CardTitle>
        {isRunning && (
          <CardDescription className="text-amber-600 dark:text-amber-500 font-medium">
            Pause or stop to change market or account type.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="market"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Market</FormLabel>
                    <Select 
                      disabled={isRunning || loadingMarkets} 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a market" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {markets.map((m) => (
                          <SelectItem key={m.symbol} value={m.symbol}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <Select 
                      disabled={isRunning} 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="demo">Demo Account</SelectItem>
                        <SelectItem value="real">Real Account</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <FormField
                control={form.control}
                name="baseStake"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Stake ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="martingaleEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-2">
                      <div className="space-y-0.5">
                        <FormLabel>Martingale</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {isMartingaleEnabled && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <FormField
                  control={form.control}
                  name="martingaleMultiplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Multiplier</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <FormField
                control={form.control}
                name="stopLoss"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stop Loss ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="takeProfit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Take Profit ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxSuccessiveLosses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Successive Losses</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxSuccessiveWins"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Successive Wins</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={updateConfig.isPending || !form.formState.isDirty}>
              {updateConfig.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Configuration
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
