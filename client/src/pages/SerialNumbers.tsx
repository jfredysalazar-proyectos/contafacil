import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Search, Package, Calendar, User, FileText } from "lucide-react";

export default function SerialNumbers() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: allSerials, isLoading } = trpc.serialNumbers.list.useQuery();
  
  // Filtrar seriales por búsqueda
  const filteredSerials = allSerials?.filter((serial: any) =>
    serial.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    serial.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    serial.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Calcular días desde la venta
  const getDaysSinceSale = (saleDate: Date) => {
    const today = new Date();
    const sale = new Date(saleDate);
    const diffTime = Math.abs(today.getTime() - sale.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Números de Serie</h1>
        <p className="text-gray-600 mt-1">
          Rastrea y gestiona los números de serie de productos vendidos
        </p>
      </div>
      
      {/* Buscador */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por serial, producto o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Seriales</p>
              <p className="text-2xl font-bold text-gray-900">{allSerials?.length || 0}</p>
            </div>
            <Package className="w-10 h-10 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Últimos 30 días</p>
              <p className="text-2xl font-bold text-gray-900">
                {allSerials?.filter((s: any) => getDaysSinceSale(s.saleDate) <= 30).length || 0}
              </p>
            </div>
            <Calendar className="w-10 h-10 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En garantía</p>
              <p className="text-2xl font-bold text-gray-900">
                {allSerials?.filter((s: any) => {
                  const daysSinceSale = getDaysSinceSale(s.saleDate);
                  const warrantyDays = s.warrantyDays || 90;
                  return daysSinceSale <= warrantyDays;
                }).length || 0}
              </p>
            </div>
            <FileText className="w-10 h-10 text-purple-500" />
          </div>
        </div>
      </div>
      
      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Número de Serie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Factura
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Venta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Días Garantía
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Cargando...
                  </td>
                </tr>
              ) : filteredSerials && filteredSerials.length > 0 ? (
                filteredSerials.map((serial: any) => {
                  const daysSinceSale = getDaysSinceSale(serial.saleDate);
                  const warrantyDays = serial.warrantyDays || 90; // Usar warrantyDays de la BD
                  const daysRemaining = warrantyDays - daysSinceSale;
                  const isInWarranty = daysRemaining > 0;
                  
                  return (
                    <tr key={serial.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Package className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {serial.serialNumber}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{serial.productName}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-blue-600">{serial.saleNumber}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {serial.customerName || "Sin cliente"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">
                          {new Date(serial.saleDate).toLocaleDateString("es-CO")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isInWarranty ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {daysRemaining} días restantes
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Vencida
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    {searchTerm ? "No se encontraron seriales" : "No hay números de serie registrados"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
