import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import Sales from "./pages/Sales";
import SalesPOS from "./pages/SalesPOS";
import SalesHistory from "./pages/SalesHistory";
import Expenses from "./pages/Expenses";
import Debts from "./pages/Debts";
import Profile from "./pages/Profile";
import Quotations from "./pages/Quotations";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      
      {/* Protected routes with layout */}
      <Route path="/dashboard">
        <AppLayout><Dashboard /></AppLayout>
      </Route>
      <Route path="/products">
        <AppLayout><Products /></AppLayout>
      </Route>
      <Route path="/inventory">
        <AppLayout><Inventory /></AppLayout>
      </Route>
      <Route path="/customers">
        <AppLayout><Customers /></AppLayout>
      </Route>
      <Route path="/suppliers">
        <AppLayout><Suppliers /></AppLayout>
      </Route>
      <Route path="/sales">
        <SalesPOS />
      </Route>
      <Route path="/sales-history">
        <AppLayout><SalesHistory /></AppLayout>
      </Route>
      <Route path="/sales-old">
        <AppLayout><Sales /></AppLayout>
      </Route>
      <Route path="/quotations">
        <AppLayout><Quotations /></AppLayout>
      </Route>
      <Route path="/expenses">
        <AppLayout><Expenses /></AppLayout>
      </Route>
      <Route path="/debts">
        <AppLayout><Debts /></AppLayout>
      </Route>
      <Route path="/profile">
        <AppLayout><Profile /></AppLayout>
      </Route>
      
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
