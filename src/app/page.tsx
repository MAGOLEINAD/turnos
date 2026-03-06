export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between text-center">
        <h1 className="text-4xl font-bold mb-4">
          Plataforma de Gestión de Turnos
        </h1>
        <p className="text-xl text-muted-foreground">
          Sistema multi-organización para clubes y escuelas
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <a
            href="/login"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Iniciar Sesión
          </a>
          <a
            href="/calendario-publico"
            className="px-6 py-3 border border-border rounded-lg hover:bg-accent transition-colors"
          >
            Ver Calendario Público
          </a>
        </div>
      </div>
    </main>
  )
}
