"use client"

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ChartPoint {
  month: string
  value: number
}

interface DashboardChartsProps {
  bars: ChartPoint[]
  lines: ChartPoint[]
}

/**
 * Isolé dans son propre module "use client" pour que `recharts` (lourd) soit
 * chargé via `next/dynamic({ ssr: false })` depuis le dashboard plutôt que
 * d'alourdir le First Load JS de la route avec un import statique.
 */
export default function DashboardCharts({ bars, lines }: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader className="pb-1"><CardTitle className="text-sm">Evolution des candidatures</CardTitle><p className="text-xs text-muted-foreground">Nombre de candidatures recues par mois</p></CardHeader>
        <CardContent className="pt-2"><div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={bars}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} /><Bar dataKey="value" fill="#2f7dea" radius={[2, 2, 0, 0]} /></BarChart></ResponsiveContainer></div></CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1"><CardTitle className="text-sm">Vues des offres</CardTitle><p className="text-xs text-muted-foreground">Nombre de vues de vos offres d'emploi</p></CardHeader>
        <CardContent className="pt-2"><div className="h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={lines}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} /><Line type="monotone" dataKey="value" stroke="#2f7dea" strokeWidth={2} dot={{ r: 2, fill: "#2f7dea" }} /></LineChart></ResponsiveContainer></div></CardContent>
      </Card>
    </div>
  )
}
