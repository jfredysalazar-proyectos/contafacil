import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, User, Lock, Building2, Mail, Phone, Upload, X } from "lucide-react";

export default function Profile() {
  const { data: profile, isLoading } = trpc.profile.getProfile.useQuery();
  const utils = trpc.useUtils();

  // Estado para formulario de perfil
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [nit, setNit] = useState("");
  const [address, setAddress] = useState("");
  const [salesPrefix, setSalesPrefix] = useState("VTA-");
  const [salesNextNumber, setSalesNextNumber] = useState(1);
  const [quotationsPrefix, setQuotationsPrefix] = useState("COT-");
  const [quotationsNextNumber, setQuotationsNextNumber] = useState(1);

  // Estado para cambio de contraseña
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Estado para logo
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Cargar datos del perfil cuando estén disponibles
  useState(() => {
    if (profile) {
      setName(profile.name || "");
      setPhone(profile.phone || "");
      setBusinessName(profile.businessName || "");
      setNit(profile.nit || "");
      setAddress(profile.address || "");
      setSalesPrefix(profile.salesPrefix || "VTA-");
      setSalesNextNumber(profile.salesNextNumber || 1);
      setQuotationsPrefix(profile.quotationsPrefix || "COT-");
      setQuotationsNextNumber(profile.quotationsNextNumber || 1);
    }
  });

  const updateProfileMutation = trpc.profile.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil actualizado exitosamente");
      utils.profile.getProfile.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar perfil");
    },
  });

  const changePasswordMutation = trpc.profile.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Contraseña cambiada exitosamente");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al cambiar contraseña");
    },
  });

  const uploadLogoMutation = trpc.profile.uploadLogo.useMutation({
    onSuccess: (data) => {
      toast.success("Logo subido exitosamente");
      utils.profile.getProfile.invalidate();
      setLogoPreview(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al subir logo");
    },
  });

  const deleteLogoMutation = trpc.profile.deleteLogo.useMutation({
    onSuccess: () => {
      toast.success("Logo eliminado exitosamente");
      utils.profile.getProfile.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al eliminar logo");
    },
  });

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      name,
      phone,
      businessName,
      nit,
      address,
      salesPrefix,
      salesNextNumber,
      quotationsPrefix,
      quotationsNextNumber,
    });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast.error("Solo se permiten archivos PNG, JPG, JPEG o SVG");
      return;
    }

    // Validar tamaño (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("El logo no puede superar los 2MB");
      return;
    }

    // Leer archivo y convertir a base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setLogoPreview(base64);
      
      // Subir inmediatamente
      uploadLogoMutation.mutate({
        base64Image: base64,
        mimeType: file.type as any,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteLogo = () => {
    if (confirm("¿Estás seguro de que deseas eliminar el logo?")) {
      deleteLogoMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mi Perfil</h1>
        <p className="text-muted-foreground mt-2">
          Administra tu información personal y preferencias
        </p>
      </div>

      {/* Logo del Negocio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Logo del Negocio
          </CardTitle>
          <CardDescription>
            Sube el logo de tu negocio (PNG, JPG, SVG - Máx. 2MB)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Vista previa del logo */}
            <div className="flex items-center justify-center">
              {profile?.logoUrl || logoPreview ? (
                <div className="relative">
                  <img
                    src={logoPreview || profile?.logoUrl || ""}
                    alt="Logo del negocio"
                    className="h-32 w-32 object-contain rounded-lg border-2 border-border"
                  />
                  {profile?.logoUrl && !uploadLogoMutation.isPending && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={handleDeleteLogo}
                      disabled={deleteLogoMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="h-32 w-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Botón de carga */}
            <div>
              <Input
                id="logo-upload"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                onChange={handleLogoChange}
                className="hidden"
                disabled={uploadLogoMutation.isPending}
              />
              <Label htmlFor="logo-upload">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={uploadLogoMutation.isPending}
                  onClick={() => document.getElementById("logo-upload")?.click()}
                >
                  {uploadLogoMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {profile?.logoUrl ? "Cambiar logo" : "Subir logo"}
                    </>
                  )}
                </Button>
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Información Personal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información Personal
            </CardTitle>
            <CardDescription>
              Actualiza tu información de perfil
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profile?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  El email no puede ser modificado
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={updateProfileMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Teléfono
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Número de teléfono"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={updateProfileMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessName" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Nombre del negocio
                </Label>
                <Input
                  id="businessName"
                  type="text"
                  placeholder="Nombre de tu negocio"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  disabled={updateProfileMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nit">
                  Cédula o NIT
                </Label>
                <Input
                  id="nit"
                  type="text"
                  placeholder="Número de identificación"
                  value={nit}
                  onChange={(e) => setNit(e.target.value)}
                  disabled={updateProfileMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">
                  Dirección
                </Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="Dirección del negocio"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={updateProfileMutation.isPending}
                />
              </div>

              <Separator />

              <Button
                type="submit"
                className="w-full"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar cambios"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Cambiar Contraseña */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Cambiar Contraseña
            </CardTitle>
            <CardDescription>
              Actualiza tu contraseña de acceso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Contraseña actual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  disabled={changePasswordMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva contraseña</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={changePasswordMutation.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo 6 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={changePasswordMutation.isPending}
                />
              </div>

              <Separator />

              <Button
                type="submit"
                className="w-full"
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cambiando...
                  </>
                ) : (
                  "Cambiar contraseña"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Configuración de Numeración de Documentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Configuración de Numeración
          </CardTitle>
          <CardDescription>
            Personaliza los prefijos y numeración de tus facturas y cotizaciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {/* Configuración de Facturas/Ventas */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-3">Facturas / Ventas</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="salesPrefix">Prefijo de Factura</Label>
                    <Input
                      id="salesPrefix"
                      type="text"
                      placeholder="VTA-"
                      value={salesPrefix}
                      onChange={(e) => setSalesPrefix(e.target.value)}
                      maxLength={10}
                      disabled={updateProfileMutation.isPending}
                    />
                    <p className="text-xs text-muted-foreground">
                      Ejemplo: VTA-0001, FACT-0001, INV-0001
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salesNextNumber">Próximo Número</Label>
                    <Input
                      id="salesNextNumber"
                      type="number"
                      min="1"
                      value={salesNextNumber}
                      onChange={(e) => setSalesNextNumber(parseInt(e.target.value) || 1)}
                      disabled={updateProfileMutation.isPending}
                    />
                    <p className="text-xs text-muted-foreground">
                      Próxima factura: {salesPrefix}{String(salesNextNumber).padStart(4, '0')}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Configuración de Cotizaciones */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Cotizaciones</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="quotationsPrefix">Prefijo de Cotización</Label>
                    <Input
                      id="quotationsPrefix"
                      type="text"
                      placeholder="COT-"
                      value={quotationsPrefix}
                      onChange={(e) => setQuotationsPrefix(e.target.value)}
                      maxLength={10}
                      disabled={updateProfileMutation.isPending}
                    />
                    <p className="text-xs text-muted-foreground">
                      Ejemplo: COT-0001, QUOT-0001, PRE-0001
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quotationsNextNumber">Próximo Número</Label>
                    <Input
                      id="quotationsNextNumber"
                      type="number"
                      min="1"
                      value={quotationsNextNumber}
                      onChange={(e) => setQuotationsNextNumber(parseInt(e.target.value) || 1)}
                      disabled={updateProfileMutation.isPending}
                    />
                    <p className="text-xs text-muted-foreground">
                      Próxima cotización: {quotationsPrefix}{String(quotationsNextNumber).padStart(4, '0')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <Button
              type="submit"
              className="w-full"
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar configuración"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Información de la cuenta */}
      <Card>
        <CardHeader>
          <CardTitle>Información de la Cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Fecha de registro
              </p>
              <p className="text-sm">
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString("es-CO", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                ID de usuario
              </p>
              <p className="text-sm font-mono">{profile?.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
