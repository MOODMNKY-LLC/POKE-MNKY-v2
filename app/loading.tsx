/**
 * Root Loading Component
 * 
 * Shows a branded splash screen while the root page is loading.
 * This prevents screen jumps and provides a smooth loading experience.
 * 
 * Uses Next.js App Router's loading.tsx convention - automatically
 * shown while the page.tsx is loading server-side data.
 * 
 * Note: Uses regular img tags instead of next/image to avoid AbortError
 * issues during navigation with Turbopack.
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {/* Background Image Layer (matches layout.tsx) */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/league-bg-light.png')] dark:bg-[url('/league-bg-dark.png')] bg-cover bg-center bg-no-repeat opacity-10 dark:opacity-15" />
        <div className="absolute inset-0 bg-background/75 dark:bg-background/85" />
      </div>

      {/* Splash Screen Content */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-8 px-4">
        {/* League Logo */}
        <div className="relative h-24 w-24 sm:h-32 sm:w-32 md:h-40 md:w-40 animate-fade-in">
          <img
            src="/league-logo.png"
            alt="Average at Best Battle League"
            className="h-full w-full object-contain drop-shadow-lg"
            loading="eager"
            decoding="async"
          />
        </div>

        {/* App Name */}
        <div className="text-center space-y-2 animate-slide-up">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            <span className="block">Average at Best</span>
            <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Battle League
            </span>
          </h1>
        </div>

        {/* Loading Indicator */}
        <div className="flex flex-col items-center space-y-4 animate-fade-in-delay">
          {/* Animated Pokeball - using SVG directly to avoid component issues */}
          <div className="relative h-12 w-12 sm:h-16 sm:w-16">
            <img
              src="/pokeball-normal.svg"
              alt="Loading"
              className="h-full w-full text-primary animate-spin-slow"
              loading="eager"
              decoding="async"
            />
            {/* Pulsing ring effect */}
            <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
          </div>

          {/* Loading dots */}
          <div className="flex justify-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
          </div>
        </div>
      </div>
    </div>
  )
}
