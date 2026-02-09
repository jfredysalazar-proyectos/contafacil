import { ReactNode } from "react";

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper component que hace las tablas scrolleables horizontalmente en móvil
 * mientras mantiene el comportamiento normal en desktop
 */
export function ResponsiveTable({ children, className = "" }: ResponsiveTableProps) {
  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <div className="min-w-full inline-block align-middle">
        {children}
      </div>
    </div>
  );
}
