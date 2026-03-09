export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-cinema/5" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-cinema-glow)_0%,_transparent_60%)]" />
      <div className="relative z-10 w-full max-w-md px-4">{children}</div>
    </div>
  );
}
