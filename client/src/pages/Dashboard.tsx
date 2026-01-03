import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingUp, TrendingDown, Package, Users, DollarSign, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export default function Dashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [loading, isAuthenticated, setLocation]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const { data: salesStats, isLoading: loadingSales } = trpc.stats.sales.useQuery({
    startDate: startOfMonth,
    endDate: endOfMonth,
  });

  const { data: topProducts, isLoading: loadingProducts } = trpc.stats.topProducts.useQuery({
    limit: 5,
  });

  const { data: expensesByCategory, isLoading: loadingExpenses } = trpc.stats.expensesByCategory.useQuery({
    startDate: startOfMonth,
    endDate: endOfMonth,
  });

  const { data: lowStockItems, isLoading: loadingInventory } = trpc.inventory.lowStock.useQuery();
  const { data: receivables } = trpc.debts.receivables.useQuery();
  const { data: payables } = trpc.debts.payables.useQuery();

  const pendingReceivables = useMemo(() => {
    if (!receivables) return 0;
    return receivables
      .filter(r => r.status !== "paid")
      .reduce((sum, r) => sum + Number(r.remainingAmount), 0);
  }, [receivables]);

  const pendingPayables = useMemo(() => {
    if (!payables) return 0;
    return payables
      .filter(p => p.status !== "paid")
      .reduce((sum, p) => sum + Number(p.remainingAmount), 0);
  }, [payables]);

  const COLORS = ["#1e3a8a", "#3b82f6", "#60a5fa", "#93c5fd", "#dbeafe"];

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Bienvenido de vuelta, {user?.name}
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ventas del mes
              </CardTitle>
              <DollarSign className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              {loadingSales ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <div className="text-3xl font-bold text-foreground">
                    ${salesStats?.totalSales.toLocaleString("es-CO") || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {salesStats?.salesCount || 0} ventas realizadas
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Por cobrar
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                ${pendingReceivables.toLocaleString("es-CO")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Deudas pendientes de clientes
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Por pagar
              </CardTitle>
              <TrendingDown className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                ${pendingPayables.toLocaleString("es-CO")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Deudas pendientes a proveedores
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Alertas de inventario
              </CardTitle>
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent>
              {loadingInventory ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <div className="text-3xl font-bold text-foreground">
                    {lowStockItems?.length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Productos con stock bajo
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Productos más vendidos</CardTitle>
              <CardDescription>Top 5 productos del período</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingProducts ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : topProducts && topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topProducts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="productName" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="totalQuantity" fill="#1e3a8a" name="Cantidad vendida" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-64 text-muted-foreground">
                  No hay datos disponibles
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expenses by Category */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Gastos por categoría</CardTitle>
              <CardDescription>Distribución de gastos del mes</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingExpenses ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : expensesByCategory && expensesByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.categoryName || "Sin categoría"}: $${Number(entry.totalAmount).toLocaleString("es-CO")}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalAmount"
                    >
                      {expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-64 text-muted-foreground">
                  No hay datos disponibles
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems && lowStockItems.length > 0 && (
          <Card className="shadow-lg border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Alertas de inventario bajo
              </CardTitle>
              <CardDescription>
                Los siguientes productos necesitan reabastecimiento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Stock actual: {item.stock} | Alerta: {item.stockAlert}
                      </p>
                    </div>
                    <Package className="h-5 w-5 text-destructive" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
