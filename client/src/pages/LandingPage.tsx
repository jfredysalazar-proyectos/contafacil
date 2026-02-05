import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  BarChart3,
  ShoppingCart,
  Users,
  FileText,
  Package,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";

export default function LandingPage() {
  const features = [
    {
      icon: ShoppingCart,
      title: "Gestión de Ventas",
      description: "Registra y controla todas tus ventas de forma rápida y eficiente.",
    },
    {
      icon: Package,
      title: "Inventario Inteligente",
      description: "Control total de productos con alertas de stock y variantes.",
    },
    {
      icon: Users,
      title: "Clientes y Proveedores",
      description: "Administra tu cartera de clientes y proveedores en un solo lugar.",
    },
    {
      icon: FileText,
      title: "Facturación Electrónica",
      description: "Genera facturas profesionales y cumple con las normativas.",
    },
    {
      icon: BarChart3,
      title: "Reportes y Análisis",
      description: "Visualiza el rendimiento de tu negocio con reportes detallados.",
    },
    {
      icon: TrendingUp,
      title: "Dashboard en Tiempo Real",
      description: "Monitorea tus métricas clave desde un panel intuitivo.",
    },
  ];

  const benefits = [
    "Fácil de usar, sin curva de aprendizaje",
    "Acceso desde cualquier dispositivo",
    "Datos seguros y respaldados",
    "Soporte técnico incluido",
    "Actualizaciones automáticas",
    "Sin costos ocultos",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">ContaFacil</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#features" className="text-gray-600 hover:text-blue-600 transition">
              Características
            </a>
            <a href="#benefits" className="text-gray-600 hover:text-blue-600 transition">
              Beneficios
            </a>
            <Link href="/login">
              <Button variant="default">Iniciar Sesión</Button>
            </Link>
          </nav>
          <Link href="/login" className="md:hidden">
            <Button size="sm">Ingresar</Button>
          </Link>
        </div>
      </header>

      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Gestiona tu negocio de forma{" "}
          <span className="text-blue-600">simple y eficiente</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          ContaFacil es la solución completa para administrar ventas, inventario, clientes y
          finanzas de tu negocio en un solo lugar.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/login">
            <Button size="lg" className="text-lg px-8">
              Comenzar Ahora
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="text-lg px-8">
            Ver Demo
          </Button>
        </div>
      </section>

      <section id="features" className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Todo lo que necesitas para tu negocio
          </h2>
          <p className="text-xl text-gray-600">
            Herramientas poderosas diseñadas para facilitar tu trabajo diario
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition">
              <feature.icon className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="benefits" className="bg-blue-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              ¿Por qué elegir ContaFacil?
            </h2>
            <p className="text-xl text-gray-600">
              Diseñado pensando en la simplicidad y eficiencia
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center space-x-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                <span className="text-lg text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-12 text-white">
          <h2 className="text-4xl font-bold mb-4">
            Comienza a optimizar tu negocio hoy
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Únete a cientos de negocios que ya confían en ContaFacil
          </p>
          <Link href="/login">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Empezar Gratis
            </Button>
          </Link>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <BarChart3 className="h-6 w-6" />
                <span className="text-xl font-bold">ContaFacil</span>
              </div>
              <p className="text-gray-400">
                La solución completa para la gestión de tu negocio.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Enlaces</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#features" className="hover:text-white transition">
                    Características
                  </a>
                </li>
                <li>
                  <a href="#benefits" className="hover:text-white transition">
                    Beneficios
                  </a>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white transition">
                    Iniciar Sesión
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contacto</h3>
              <p className="text-gray-400">
                ¿Tienes preguntas? Estamos aquí para ayudarte.
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2026 ContaFacil. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
