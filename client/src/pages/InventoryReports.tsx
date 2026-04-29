import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Loader2, FileSpreadsheet, TrendingUp, TrendingDown, BarChart3,
  DollarSign, ShoppingCart, RefreshCw, CalendarDays, X, ArrowLeft,
  AlertTriangle, Package,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, startOfDay, endOfDay } from "date-fns";

const DATE_SHORTCUTS = [
  { label: "Este mes", getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: "Último mes", getValue: () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return { from: startOfMonth(d), to: endOfMonth(d) }; } },
  { label: "Últimos 90 días", getValue: () => ({ from: startOfDay(subDays(new Date(), 90)), to: endOfDay(new Date()) }) },
  { label: "Este año", getValue: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
];

function classificationColor(cls: string) {
  if (cls === "Alta rotación") return "bg-green-100 text-green-800 border-green-300";
  if (cls === "Rotación media") return "bg-blue-100 text-blue-800 border-blue-300";
  if (cls === "Baja rotación") return "bg-amber-100 text-amber-800 border-amber-300";
  return "bg-gray-100 text-gray-600 border-gray-300";
}

export default function InventoryReports() {
  const { loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState<"rotation" | "cogs">("rotation");
  const [dateFrom, setDateFrom] = useState<string>(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState<string>(() => format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [activeShortcut, setActiveShortcut] = useState<string>("Este mes");
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) setLocation("/login");
  }, [loading, isAuthenticated, setLocation]);

  const queryDates = useMemo(() => {
    const params: { startDate?: Date; endDate?: Date } = {};
    if (dateFrom) {
      const [y, m, d] = dateFrom.split("-").map(Number);
      params.startDate = startOfDay(new Date(y, m - 1, d));
    }
    if (dateTo) {
      const [y, m, d] = dateTo.split("-").map(Number);
      params.endDate = endOfDay(new Date(y, m - 1, d));
    }
    return params;
  }, [dateFrom, dateTo]);

  const { data: rotationData, isLoading: isLoadingRotation } = trpc.inventory.rotationReport.useQuery(queryDates);
  const { data: cogsData, isLoading: isLoadingCOGS } = trpc.inventory.cogsReport.useQuery(queryDates);

  const applyShortcut = (shortcut: typeof DATE_SHORTCUTS[0]) => {
    const { from, to } = shortcut.getValue();
    setDateFrom(format(from, "yyyy-MM-dd"));
    setDateTo(format(to, "yyyy-MM-dd"));
    setActiveShortcut(shortcut.label);
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setActiveShortcut("");
  };

  const handleDownloadRotation = async () => {
    setIsDownloading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("startDate", dateFrom);
      if (dateTo) params.set("endDate", dateTo);
      const response = await fetch(`/api/inventory/rotation/excel?${params}`, { credentials: "include" });
      if (!response.ok) throw new Error("Error al generar el reporte");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ContaFacil_Rotacion_${new Date().toISOString().split("T")[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Reporte de rotación descargado");
    } catch {
      toast.error("Error al descargar el reporte");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadCOGS = async () => {
    setIsDownloading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("startDate", dateFrom);
      if (dateTo) params.set("endDate", dateTo);
      const response = await fetch(`/api/reports/cogs/excel?${params}`, { credentials: "include" });
      if (!response.ok) throw new Error("Error al generar el reporte");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ContaFacil_COGS_${new Date().toISOString().split("T")[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Reporte COGS descargado");
    } catch {
      toast.error("Error al descargar el reporte");
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const rotation = rotationData as any;
  const cogs = cogsData as any;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/inventory")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver al Inventario
            </Button>
          </div>
          <h1 className="text-3xl font-bold">Informes de Inventario</h1>
          <p className="text-gray-500 mt-1">Rotación de productos · Costo de ventas (COGS) · Utilidad bruta</p>
        </div>
        <Button
          onClick={activeTab === "rotation" ? handleDownloadRotation : handleDownloadCOGS}
          disabled={isDownloading}
          variant="outline"
          className="border-green-600 text-green-700 hover:bg-green-50"
        >
          {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
          Exportar Excel
        </Button>
      </div>

      {/* Filtro de fechas */}
      <Card className="shadow-sm border-blue-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-blue-600" />
            Período del informe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {DATE_SHORTCUTS.map((s) => (
              <Button
                key={s.label}
                variant={activeShortcut === s.label ? "default" : "outline"}
                size="sm"
                onClick={() => applyShortcut(s)}
              >
                {s.label}
              </Button>
            ))}
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-500 hover:text-red-600">
                <X className="h-4 w-4 mr-1" /> Limpiar
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label htmlFor="dateFrom" className="text-sm text-gray-600">Desde</Label>
              <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setActiveShortcut(""); }} className="w-44" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dateTo" className="text-sm text-gray-600">Hasta</Label>
              <Input id="dateTo" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setActiveShortcut(""); }} className="w-44" />
            </div>
            {dateFrom && dateTo && (
              <p className="text-sm text-blue-600 font-medium pb-1">
                {format(new Date(dateFrom), "dd/MM/yyyy")} — {format(new Date(dateTo), "dd/MM/yyyy")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "rotation" ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          onClick={() => setActiveTab("rotation")}
        >
          <BarChart3 className="h-4 w-4 inline mr-1.5" />
          Rotación de Inventario
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "cogs" ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          onClick={() => setActiveTab("cogs")}
        >
          <DollarSign className="h-4 w-4 inline mr-1.5" />
          COGS / Utilidad Bruta
        </button>
      </div>

      {/* ── TAB: ROTACIÓN ── */}
      {activeTab === "rotation" && (
        <>
          {isLoadingRotation ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : !rotation ? null : (
            <>
              {/* KPIs de rotación */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Alta rotación</p>
                    <p className="text-3xl font-bold text-green-800">{rotation.products?.filter((p: any) => p.classification === "Alta rotación").length ?? 0}</p>
                    <p className="text-xs text-green-600 mt-1">productos</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Rotación media</p>
                    <p className="text-3xl font-bold text-blue-800">{rotation.products?.filter((p: any) => p.classification === "Rotación media").length ?? 0}</p>
                    <p className="text-xs text-blue-600 mt-1">productos</p>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Baja rotación</p>
                    <p className="text-3xl font-bold text-amber-800">{rotation.products?.filter((p: any) => p.classification === "Baja rotación").length ?? 0}</p>
                    <p className="text-xs text-amber-600 mt-1">productos</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-50 border-gray-200">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Sin movimiento</p>
                    <p className="text-3xl font-bold text-gray-700">{rotation.products?.filter((p: any) => p.classification === "Sin movimiento").length ?? 0}</p>
                    <p className="text-xs text-gray-500 mt-1">productos</p>
                  </CardContent>
                </Card>
              </div>

              {/* Tabla de rotación */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5" />
                    Rotación por Producto
                  </CardTitle>
                  <CardDescription>
                    {rotation.products?.length ?? 0} productos físicos · Período de {rotation.periodDays ?? 0} días
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-right">Stock Actual</TableHead>
                          <TableHead className="text-right">Uds. Vendidas</TableHead>
                          <TableHead className="text-right">Ingresos</TableHead>
                          <TableHead className="text-right">COGS</TableHead>
                          <TableHead className="text-right">Utilidad Bruta</TableHead>
                          <TableHead className="text-right">Margen %</TableHead>
                          <TableHead className="text-right">Índice Rot.</TableHead>
                          <TableHead className="text-right">Días Inv.</TableHead>
                          <TableHead>Clasificación</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(rotation.products as any[])?.map((p: any) => (
                          <TableRow key={p.productId}>
                            <TableCell className="font-medium">
                              <div>
                                {p.productName}
                                {p.sku && <p className="text-xs text-muted-foreground">{p.sku}</p>}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{p.currentStock}</TableCell>
                            <TableCell className="text-right font-medium">{p.totalSold}</TableCell>
                            <TableCell className="text-right">${Math.round(p.totalRevenue).toLocaleString("es-CO")}</TableCell>
                            <TableCell className="text-right text-amber-700">${Math.round(p.totalCOGS).toLocaleString("es-CO")}</TableCell>
                            <TableCell className={`text-right font-medium ${p.grossProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
                              ${Math.round(p.grossProfit).toLocaleString("es-CO")}
                            </TableCell>
                            <TableCell className="text-right">
                              {p.totalRevenue > 0 ? `${Math.round(p.grossMarginPct * 10) / 10}%` : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {p.rotationRate > 0 ? Math.round(p.rotationRate * 100) / 100 : "0"}
                            </TableCell>
                            <TableCell className="text-right">
                              {p.daysOfInventory ? Math.round(p.daysOfInventory) : (p.totalSold === 0 ? "∞" : "-")}
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-xs border ${classificationColor(p.classification)}`} variant="outline">
                                {p.classification}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Productos sin movimiento */}
              {rotation.products?.some((p: any) => p.classification === "Sin movimiento") && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                      <AlertTriangle className="h-4 w-4" />
                      Inventario sin movimiento
                    </CardTitle>
                    <CardDescription className="text-amber-700">
                      Estos productos no tuvieron ventas en el período. Considera liquidarlos o reubicarlos.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {rotation.products
                        ?.filter((p: any) => p.classification === "Sin movimiento")
                        .map((p: any) => (
                          <div key={p.productId} className="flex items-center gap-2 bg-white border border-amber-200 rounded-lg px-3 py-2">
                            <Package className="h-4 w-4 text-amber-600" />
                            <div>
                              <p className="text-sm font-medium">{p.productName}</p>
                              <p className="text-xs text-amber-700">Stock: {p.currentStock} · Valor: ${Math.round(p.inventoryValue).toLocaleString("es-CO")}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {/* ── TAB: COGS ── */}
      {activeTab === "cogs" && (
        <>
          {isLoadingCOGS ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : !cogs ? null : (
            <>
              {/* KPIs de COGS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4 pb-4 flex items-center gap-3">
                    <ShoppingCart className="h-8 w-8 text-blue-500 shrink-0" />
                    <div>
                      <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Ingresos por ventas</p>
                      <p className="text-xl font-bold text-blue-800">${Math.round(cogs.totals?.totalRevenue ?? 0).toLocaleString("es-CO")}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="pt-4 pb-4 flex items-center gap-3">
                    <DollarSign className="h-8 w-8 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Costo de ventas (COGS)</p>
                      <p className="text-xl font-bold text-amber-800">${Math.round(cogs.totals?.totalCOGS ?? 0).toLocaleString("es-CO")}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className={`border-2 ${(cogs.totals?.totalGrossProfit ?? 0) >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                  <CardContent className="pt-4 pb-4 flex items-center gap-3">
                    {(cogs.totals?.totalGrossProfit ?? 0) >= 0
                      ? <TrendingUp className="h-8 w-8 text-green-500 shrink-0" />
                      : <TrendingDown className="h-8 w-8 text-red-500 shrink-0" />}
                    <div>
                      <p className={`text-xs font-medium uppercase tracking-wide ${(cogs.totals?.totalGrossProfit ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>Utilidad bruta</p>
                      <p className={`text-xl font-bold ${(cogs.totals?.totalGrossProfit ?? 0) >= 0 ? "text-green-800" : "text-red-800"}`}>
                        ${Math.round(cogs.totals?.totalGrossProfit ?? 0).toLocaleString("es-CO")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="pt-4 pb-4 flex items-center gap-3">
                    <BarChart3 className="h-8 w-8 text-purple-500 shrink-0" />
                    <div>
                      <p className="text-xs text-purple-600 font-medium uppercase tracking-wide">Margen bruto</p>
                      <p className="text-xl font-bold text-purple-800">
                        {Math.round((cogs.totals?.grossMarginPct ?? 0) * 10) / 10}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabla de COGS por línea de venta */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Detalle COGS por Línea de Venta
                  </CardTitle>
                  <CardDescription>
                    {cogs.rows?.length ?? 0} líneas de venta en el período
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>N° Venta</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-right">Cant.</TableHead>
                          <TableHead className="text-right">Precio Unit.</TableHead>
                          <TableHead className="text-right">Costo Unit. (CPP)</TableHead>
                          <TableHead className="text-right">Ingresos</TableHead>
                          <TableHead className="text-right">COGS</TableHead>
                          <TableHead className="text-right">Utilidad Bruta</TableHead>
                          <TableHead className="text-right">Margen %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(cogs.rows as any[])?.map((row: any, idx: number) => {
                          const gp = parseFloat(row.grossProfit) || 0;
                          return (
                            <TableRow key={idx}>
                              <TableCell className="text-sm font-medium">{row.saleNumber}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">
                                {new Date(row.saleDate).toLocaleDateString("es-CO")}
                              </TableCell>
                              <TableCell className="text-sm">{row.customerName || "Consumidor Final"}</TableCell>
                              <TableCell className="text-sm">
                                <div>
                                  {row.productName}
                                  {row.isService && <Badge variant="outline" className="ml-1 text-xs">Servicio</Badge>}
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-sm">{row.quantity}</TableCell>
                              <TableCell className="text-right text-sm">${(parseFloat(row.unitPrice) || 0).toLocaleString("es-CO")}</TableCell>
                              <TableCell className="text-right text-sm text-amber-700">
                                {parseFloat(row.unitCost) > 0 ? `$${(parseFloat(row.unitCost)).toLocaleString("es-CO")}` : row.isService ? "Servicio" : "-"}
                              </TableCell>
                              <TableCell className="text-right text-sm">${(parseFloat(row.revenue) || 0).toLocaleString("es-CO")}</TableCell>
                              <TableCell className="text-right text-sm text-amber-700">${(parseFloat(row.cogs) || 0).toLocaleString("es-CO")}</TableCell>
                              <TableCell className={`text-right text-sm font-medium ${gp >= 0 ? "text-green-700" : "text-red-600"}`}>
                                ${Math.round(gp).toLocaleString("es-CO")}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {parseFloat(row.grossMarginPct) !== 0 ? `${Math.round(parseFloat(row.grossMarginPct) * 10) / 10}%` : "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
