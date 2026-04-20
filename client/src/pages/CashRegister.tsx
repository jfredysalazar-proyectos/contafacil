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
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, DollarSign, Lock, Unlock, Clock, CreditCard, Banknote, ArrowLeftRight, Receipt } from "lucide-react";

const formatCOP = (value: string | number | null | undefined) => {
  const num = parseFloat(String(value || "0"));
  return `$${num.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const formatDate = (date: string | Date | null | undefined) => {
  if (!date) return "-";
  return new Date(date).toLocaleString("es-CO", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

export default function CashRegister() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [loading, isAuthenticated, setLocation]);

  const utils = trpc.useUtils();
  const { data: currentRegister, isLoading: loadingCurrent } = trpc.cashRegister.getCurrent.useQuery();
  const { data: history, isLoading: loadingHistory } = trpc.cashRegister.list.useQuery();
  const { data: summary, isLoading: loadingSummary } = trpc.cashRegister.getSummary.useQuery(
    { cashRegisterId: currentRegister?.id || 0 },
    { enabled: !!currentRegister?.id, refetchInterval: 30000 }
  );

  // Estado para abrir caja
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState("0");
  const [openNotes, setOpenNotes] = useState("");

  // Estado para cerrar caja
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [closingBalance, setClosingBalance] = useState("");
  const [closeNotes, setCloseNotes] = useState("");

  const openMutation = trpc.cashRegister.open.useMutation({
    onSuccess: () => {
      toast.success("Caja abierta exitosamente");
      utils.cashRegister.getCurrent.invalidate();
      utils.cashRegister.list.invalidate();
      setIsOpenDialogOpen(false);
      setOpeningBalance("0");
      setOpenNotes("");
    },
    onError: (error) => {
      toast.error(error.message || "Error al abrir la caja");
    },
  });

  const closeMutation = trpc.cashRegister.close.useMutation({
    onSuccess: (data) => {
      toast.success(`Caja cerrada. Total ventas: ${formatCOP(data.totalSales)}`);
      utils.cashRegister.getCurrent.invalidate();
      utils.cashRegister.list.invalidate();
      utils.cashRegister.getSummary.invalidate();
      setIsCloseDialogOpen(false);
      setClosingBalance("");
      setCloseNotes("");
    },
    onError: (error) => {
      toast.error(error.message || "Error al cerrar la caja");
    },
  });

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isOpen = !!currentRegister;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <div className="container py-8 space-y-6">
        {/* Encabezado */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Caja Diaria</h1>
            <p className="text-muted-foreground mt-2">
              Control de apertura y cierre de caja
            </p>
          </div>
          <div>
            {!isOpen ? (
              <Button onClick={() => setIsOpenDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
                <Unlock className="mr-2 h-4 w-4" />
                Abrir Caja
              </Button>
            ) : (
              <Button onClick={() => setIsCloseDialogOpen(true)} variant="destructive">
                <Lock className="mr-2 h-4 w-4" />
                Cerrar Caja
              </Button>
            )}
          </div>
        </div>

        {/* Estado actual de la caja */}
        {isOpen && summary ? (
          <div className="space-y-4">
            {/* Banner de caja abierta */}
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                  <div>
                    <p className="font-semibold text-green-800">Caja Abierta</p>
                    <p className="text-sm text-green-700">
                      Desde: {formatDate(currentRegister.openedAt)} &nbsp;|&nbsp;
                      Saldo inicial: {formatCOP(currentRegister.openingBalance)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resumen en tiempo real */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Banknote className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Efectivo</p>
                      <p className="text-xl font-bold">{formatCOP(summary.totalCash)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tarjeta</p>
                      <p className="text-xl font-bold">{formatCOP(summary.totalCard)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <ArrowLeftRight className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Transferencia</p>
                      <p className="text-xl font-bold">{formatCOP(summary.totalTransfer)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Receipt className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Crédito</p>
                      <p className="text-xl font-bold">{formatCOP(summary.totalCredit)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Total del día */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <DollarSign className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Ventas del Día</p>
                      <p className="text-3xl font-bold text-primary">{formatCOP(summary.totalSales)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Número de ventas</p>
                    <p className="text-2xl font-bold">{summary.salesCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : !isOpen ? (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6 pb-6 text-center">
              <Lock className="mx-auto h-12 w-12 text-orange-400 mb-3" />
              <h3 className="text-lg font-semibold text-orange-800">Caja Cerrada</h3>
              <p className="text-sm text-orange-700 mt-1">
                Abre la caja para comenzar a registrar ventas del día
              </p>
              <Button onClick={() => setIsOpenDialogOpen(true)} className="mt-4 bg-green-600 hover:bg-green-700">
                <Unlock className="mr-2 h-4 w-4" />
                Abrir Caja Ahora
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {/* Historial de cierres */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Historial de Cierres
            </CardTitle>
            <CardDescription>Últimos 30 cierres de caja</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : history && history.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Apertura</TableHead>
                      <TableHead>Cierre</TableHead>
                      <TableHead>Saldo Inicial</TableHead>
                      <TableHead>Efectivo</TableHead>
                      <TableHead>Tarjeta</TableHead>
                      <TableHead>Transferencia</TableHead>
                      <TableHead>Crédito</TableHead>
                      <TableHead>Total Ventas</TableHead>
                      <TableHead># Ventas</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((reg: any) => (
                      <TableRow key={reg.id}>
                        <TableCell className="text-sm">{formatDate(reg.openedAt)}</TableCell>
                        <TableCell className="text-sm">{reg.closedAt ? formatDate(reg.closedAt) : "-"}</TableCell>
                        <TableCell>{formatCOP(reg.openingBalance)}</TableCell>
                        <TableCell>{formatCOP(reg.totalCash)}</TableCell>
                        <TableCell>{formatCOP(reg.totalCard)}</TableCell>
                        <TableCell>{formatCOP(reg.totalTransfer)}</TableCell>
                        <TableCell>{formatCOP(reg.totalCredit)}</TableCell>
                        <TableCell className="font-semibold">{formatCOP(reg.totalSales)}</TableCell>
                        <TableCell>{reg.salesCount || 0}</TableCell>
                        <TableCell>
                          {reg.status === "open" ? (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
                              Abierta
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium">
                              Cerrada
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Sin historial de caja</h3>
                <p className="mt-2 text-sm text-gray-500">Abre tu primera caja para comenzar</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diálogo: Abrir Caja */}
      <Dialog open={isOpenDialogOpen} onOpenChange={setIsOpenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir Caja</DialogTitle>
            <DialogDescription>
              Ingresa el saldo inicial en efectivo con el que comienzas el día
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="openingBalance">Saldo Inicial en Efectivo (COP)</Label>
              <Input
                id="openingBalance"
                type="number"
                min="0"
                step="1000"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Dinero en efectivo con el que inicias la caja (billetes y monedas)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="openNotes">Notas (Opcional)</Label>
              <Textarea
                id="openNotes"
                value={openNotes}
                onChange={(e) => setOpenNotes(e.target.value)}
                placeholder="Observaciones de apertura..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpenDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => openMutation.mutate({ openingBalance, notes: openNotes })}
              disabled={openMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {openMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Abriendo...</>
              ) : (
                <><Unlock className="mr-2 h-4 w-4" />Abrir Caja</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo: Cerrar Caja */}
      <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cerrar Caja</DialogTitle>
            <DialogDescription>
              Revisa el resumen del día y registra el saldo final en efectivo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {summary && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Saldo inicial:</span>
                  <span className="font-medium">{formatCOP(currentRegister?.openingBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ventas en efectivo:</span>
                  <span className="font-medium text-green-600">{formatCOP(summary.totalCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ventas con tarjeta:</span>
                  <span className="font-medium">{formatCOP(summary.totalCard)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transferencias:</span>
                  <span className="font-medium">{formatCOP(summary.totalTransfer)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Créditos:</span>
                  <span className="font-medium">{formatCOP(summary.totalCredit)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Total ventas del día:</span>
                  <span className="text-primary">{formatCOP(summary.totalSales)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Número de ventas:</span>
                  <span>{summary.salesCount}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold text-green-700">
                  <span>Efectivo esperado en caja:</span>
                  <span>{formatCOP(parseFloat(String(currentRegister?.openingBalance || 0)) + summary.totalCash)}</span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="closingBalance">Efectivo Real en Caja (Arqueo)</Label>
              <Input
                id="closingBalance"
                type="number"
                min="0"
                step="1000"
                value={closingBalance}
                onChange={(e) => setClosingBalance(e.target.value)}
                placeholder="Ingresa el efectivo contado"
              />
              <p className="text-xs text-muted-foreground">
                Cuenta el efectivo físico en la caja y regístralo aquí
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="closeNotes">Notas (Opcional)</Label>
              <Textarea
                id="closeNotes"
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="Observaciones de cierre..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloseDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!closingBalance) {
                  toast.error("Ingresa el saldo de cierre");
                  return;
                }
                closeMutation.mutate({
                  cashRegisterId: currentRegister!.id,
                  closingBalance,
                  notes: closeNotes,
                });
              }}
              disabled={closeMutation.isPending}
              variant="destructive"
            >
              {closeMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cerrando...</>
              ) : (
                <><Lock className="mr-2 h-4 w-4" />Cerrar Caja</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
