import * as React from "react"
import { TradeRecord } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney } from "@/lib/utils"
import { format } from "date-fns"

export function TradeHistory({ trades }: { trades: TradeRecord[] }) {
  if (!trades || trades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Trades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg bg-muted/10">
            No trades in this session yet.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-lg">Recent Trades</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                <th className="font-medium p-3">Time</th>
                <th className="font-medium p-3">Contract</th>
                <th className="font-medium p-3 text-right">Stake</th>
                <th className="font-medium p-3 text-right">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {trades.map((trade) => (
                <tr key={trade.id} className="hover:bg-muted/10 transition-colors">
                  <td className="p-3 text-muted-foreground font-mono text-xs">
                    {format(new Date(trade.timestamp), "HH:mm:ss")}
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{trade.contractType}</div>
                    <div className="text-xs text-muted-foreground font-mono">{trade.market}</div>
                  </td>
                  <td className="p-3 text-right font-mono">
                    {formatMoney(trade.stake)}
                  </td>
                  <td className={`p-3 text-right font-mono font-medium ${trade.result === 'win' ? 'text-green-600' : 'text-red-600'}`}>
                    {trade.result === 'win' ? '+' : ''}{formatMoney(trade.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
