import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Users,
  Building2,
  ShoppingCart,
  Receipt,
  Warehouse,
  DollarSign,
  LogOut,
  Menu,
  X,
  UserCircle,
  FileText,
  UserCog,
  Shield,
  QrCode,
  ChevronDown,
  ChevronRight,
  Settings,
} from "lucide-react";
import { useState } from "react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const { data: profile } = trpc.profile.getProfile.useQuery();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [productosSubmenuOpen, setProductosSubmenuOpen] = useState(false);
  
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.href = "/login";
    },
  });

  // Agregar Administración de Membresías solo para el admin
  const isAdmin = user?.email === "admin@contafacil.com";
  
  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Ventas", href: "/sales", icon: ShoppingCart },
    { 
      name: "Productos", 
      href: "/products", 
      icon: Package,
      submenu: [
        { name: "Números de Serie", href: "/serial-numbers", icon: Package },
        { name: "Códigos QR", href: "/product-qr-codes", icon: QrCode },
      ]
    },
    { name: "Inventario", href: "/inventory", icon: Warehouse },
    { name: "Clientes", href: "/customers", icon: Users },
    { name: "Proveedores", href: "/suppliers", icon: Building2 },
    { name: "Cotizaciones", href: "/quotations", icon: FileText },
    { name: "Gastos y Compras", href: "/expenses", icon: Receipt },
    { name: "Deudas", href: "/debts", icon: DollarSign },
    { name: "Empleados", href: "/employees", icon: UserCog },
    { name: "Roles", href: "/roles", icon: Shield },
    ...(isAdmin ? [{ name: "Administración de Membresías", href: "/membership-admin", icon: Settings }] : []),
    { name: "Mi Perfil", href: "/profile", icon: UserCircle },
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-background"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-border">
            {profile?.logoUrl ? (
              <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-primary/20 flex items-center justify-center bg-background">
                <img
                  src={profile.logoUrl}
                  alt="Logo del negocio"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-foreground">CF</span>
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {profile?.businessName || "ContaFácil"}
              </h1>
              <p className="text-xs text-muted-foreground">Gestión empresarial</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location === item.href;
              const hasSubmenu = item.submenu && item.submenu.length > 0;
              const isSubmenuActive = hasSubmenu && item.submenu.some(sub => location === sub.href);
              
              return (
                <div key={item.name}>
                  {/* Item principal */}
                  {hasSubmenu ? (
                    <button
                      className={cn(
                        "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors",
                        isActive || isSubmenuActive
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                      onClick={() => setProductosSubmenuOpen(!productosSubmenuOpen)}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </div>
                      {productosSubmenuOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  ) : (
                    <Link href={item.href}>
                      <a
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </a>
                    </Link>
                  )}
                  
                  {/* Submenú */}
                  {hasSubmenu && productosSubmenuOpen && (
                    <div className="ml-4 mt-1 space-y-1">
                      {/* Link a Productos principal */}
                      <Link href={item.href}>
                        <a
                          className={cn(
                            "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm",
                            isActive
                              ? "bg-primary/10 text-primary font-semibold"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <Package className="h-4 w-4" />
                          <span>Ver Productos</span>
                        </a>
                      </Link>
                      
                      {/* Items del submenú */}
                      {item.submenu.map((subItem) => {
                        const isSubActive = location === subItem.href;
                        return (
                          <Link key={subItem.name} href={subItem.href}>
                            <a
                              className={cn(
                                "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm",
                                isSubActive
                                  ? "bg-primary/10 text-primary font-semibold"
                                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                              )}
                              onClick={() => setSidebarOpen(false)}
                            >
                              <subItem.icon className="h-4 w-4" />
                              <span>{subItem.name}</span>
                            </a>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* User info and logout */}
          <div className="px-4 py-4 border-t border-border">
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {user?.name?.charAt(0) || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.name || "Usuario"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email || ""}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        <main className="min-h-screen">
          {children}
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
