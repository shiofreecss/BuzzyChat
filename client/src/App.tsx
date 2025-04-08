import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import { ErrorBoundary } from "react-error-boundary";
import { WebSocketProvider } from "@/contexts/WebSocketContext";

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="p-6 max-w-sm mx-auto bg-card rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-card-foreground mb-4">Something went wrong</h2>
        <p className="text-destructive mb-4">{error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-primary text-primary-foreground px-4 py-2 rounded hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/chat" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider>
          <Router />
          <Toaster />
        </WebSocketProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;