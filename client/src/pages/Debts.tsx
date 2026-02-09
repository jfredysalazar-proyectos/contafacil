import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, DollarSign, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Debts() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [loading, isAuthenticated, setLocation]);

  const utils = trpc.useUtils();
  const { data: receivables, isLoading: loadingReceivables } = trpc.debts.receivables.useQuery();
  const { data: payables, isLoading: loadingPayables } = trpc.debts.payables.useQuery();

  const recordPaymentMutation = trpc.debts.addPayment.useMutation({
    onSuccess: () => {
      toast.success("Pago registrado exitosamente");
      utils.debts.receivables.invalidate();
      utils.debts.payables.invalidate();
      setIsPaymentDialogOpen(false);
      setSelectedDebt(null);
      setPaymentAmount("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al registrar pago");
    },
  });

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;

    recordPaymentMutation.mutate({
      receivableId: selectedDebt.type === "receivable" ? selectedDebt.id : undefined,
      payableId: selectedDebt.type === "payable" ? selectedDebt.id : undefined,
      amount: paymentAmount,
      paymentDate: new Date(),
      paymentMethod: "cash",
    });
  };

  const openPaymentDialog = (debt: any) => {
    setSelectedDebt(debt);
    setPaymentAmount(debt.remainingAmount);
    setIsPaymentDialogOpen(true);
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalReceivables = receivables?.reduce((sum, debt) => sum + Number(debt.remainingAmount), 0) || 0;
  const totalPayables = payables?.reduce((sum, debt) => sum + Number(debt.remainingAmount), 0) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <div className="container py-8 space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Control de Deudas</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona cuentas por cobrar y por pagar
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-lg border-green-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <DollarSign className="h-5 w-5" />
                Cuentas por Cobrar
              </CardTitle>
              <CardDescription>
                Total pendiente de recibir
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                ${totalReceivables.toLocaleString("es-CO")}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {receivables?.length || 0} deudas activas
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-red-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Cuentas por Pagar
              </CardTitle>
              <CardDescription>
                Total pendiente de pagar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">
                ${totalPayables.toLocaleString("es-CO")}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {payables?.length || 0} deudas activas
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="receivables" className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="receivables">Por Cobrar</TabsTrigger>
            <TabsTrigger value="payables">Por Pagar</TabsTrigger>
          </TabsList>

          <TabsContent value="receivables">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Cuentas por Cobrar</CardTitle>
                <CardDescription>
                  Dinero que tus clientes te deben
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingReceivables ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : receivables && receivables.length > 0 ? (
                  <ResponsiveTable>
                <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Número de Factura</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Pagado</TableHead>
                        <TableHead>Pendiente</TableHead>
                        <TableHead>Vencimiento</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receivables.map((debt) => {
                        const isOverdue = debt.dueDate && new Date(debt.dueDate) < new Date() && debt.status === "pending";
                        return (
                          <TableRow key={debt.id} className={isOverdue ? "bg-red-50" : ""}>
                            <TableCell className="font-medium">{debt.customerName || "Sin cliente"}</TableCell>
                            <TableCell>{debt.saleNumber || "-"}</TableCell>
                            <TableCell>${Number(debt.amount).toLocaleString("es-CO")}</TableCell>
                            <TableCell>${Number(debt.paidAmount).toLocaleString("es-CO")}</TableCell>
                            <TableCell className="font-semibold text-green-600">
                              ${Number(debt.remainingAmount).toLocaleString("es-CO")}
                            </TableCell>
                            <TableCell>
                              {debt.dueDate ? new Date(debt.dueDate).toLocaleDateString("es-CO") : "-"}
                              {isOverdue && <Badge variant="destructive" className="ml-2">Vencida</Badge>}
                            </TableCell>
                            <TableCell>
                              <Badge variant={debt.status === "paid" ? "default" : "secondary"}>
                                {debt.status === "paid" ? "Pagada" : debt.status === "partial" ? "Parcial" : "Pendiente"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {debt.status !== "paid" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openPaymentDialog({ ...debt, type: "receivable" })}
                                >
                                  Registrar Pago
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                              </ResponsiveTable>
            ) : (
                  <div className="text-center py-12">
                    <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No hay cuentas por cobrar</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payables">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Cuentas por Pagar</CardTitle>
                <CardDescription>
                  Dinero que debes a proveedores
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPayables ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : payables && payables.length > 0 ? (
                  <ResponsiveTable>
                <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>Monto Original</TableHead>
                        <TableHead>Pagado</TableHead>
                        <TableHead>Pendiente</TableHead>
                        <TableHead>Vencimiento</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payables.map((debt) => {
                        const isOverdue = debt.dueDate && new Date(debt.dueDate) < new Date() && debt.status === "pending";
                        return (
                          <TableRow key={debt.id} className={isOverdue ? "bg-red-50" : ""}>
                            <TableCell className="font-medium">{debt.supplierName || "Sin proveedor"}</TableCell>
                            <TableCell>${Number(debt.amount).toLocaleString("es-CO")}</TableCell>
                            <TableCell>${Number(debt.paidAmount).toLocaleString("es-CO")}</TableCell>
                            <TableCell className="font-semibold text-red-600">
                              ${Number(debt.remainingAmount).toLocaleString("es-CO")}
                            </TableCell>
                            <TableCell>
                              {debt.dueDate ? new Date(debt.dueDate).toLocaleDateString("es-CO") : "-"}
                              {isOverdue && <Badge variant="destructive" className="ml-2">Vencida</Badge>}
                            </TableCell>
                            <TableCell>
                              <Badge variant={debt.status === "paid" ? "default" : "secondary"}>
                                {debt.status === "paid" ? "Pagada" : debt.status === "partial" ? "Parcial" : "Pendiente"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {debt.status !== "paid" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openPaymentDialog({ ...debt, type: "payable" })}
                                >
                                  Registrar Pago
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                              </ResponsiveTable>
            ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No hay cuentas por pagar</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent>
            <form onSubmit={handleRecordPayment}>
              <DialogHeader>
                <DialogTitle>Registrar Pago</DialogTitle>
                <DialogDescription>
                  {selectedDebt?.type === "receivable" ? "Pago recibido de cliente" : "Pago realizado a proveedor"}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label>Monto pendiente</Label>
                  <p className="text-2xl font-bold">
                    ${Number(selectedDebt?.remainingAmount || 0).toLocaleString("es-CO")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentAmount">Monto del pago (COP) *</Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                    max={selectedDebt?.remainingAmount}
                  />
                  <p className="text-sm text-muted-foreground">
                    Puedes registrar pagos parciales
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPaymentDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={recordPaymentMutation.isPending}>
                  {recordPaymentMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    "Registrar Pago"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
