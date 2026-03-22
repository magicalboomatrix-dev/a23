
import Footer from "./components/Footer";
import AuthGate from "./components/AuthGate";
import { AuthProvider } from "./lib/AuthContext";
import "./globals.css";

export const metadata = {
  title: "A23Satta",
  description: "A23 Satta user application",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "A23Satta",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#111111',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen justify-center bg-[#eef1f5] text-[#171717] antialiased" suppressHydrationWarning>
        <AuthProvider>
          <div className="relative flex  w-full max-w-[430px] flex-col overflow-x-hidden bg-white ">
            <AuthGate>
              {children}
              <Footer />
            </AuthGate>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
