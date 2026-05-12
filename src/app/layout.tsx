import "./globals.css";
import "./fortiafx.css";
import FortiaFXShell from "@/components/FortiaFXShell";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <FortiaFXShell>{children}</FortiaFXShell>
      </body>
    </html>
  );
}