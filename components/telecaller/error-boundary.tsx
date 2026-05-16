"use client"

import { Component, type ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
  children: ReactNode
  // Optional reset key — when this value changes, the boundary clears its
  // error. Useful for resetting on navigation: pass `activeView`.
  resetKey?: unknown
}

interface State {
  error: Error | null
}

// Class-based because React still requires class components for error
// boundaries (getDerivedStateFromError / componentDidCatch). Functional
// equivalents don't exist as of React 19.
export class ViewErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidUpdate(prevProps: Props) {
    // Reset on resetKey change so navigating away from a broken view recovers.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string | null }) {
    // Send to your error tracker here (Sentry, Datadog, etc.).
    // For now, keep visibility in the console during dev.
    if (process.env.NODE_ENV !== "production") {
      console.error("[ViewErrorBoundary]", error, errorInfo)
    }
  }

  render() {
    if (this.state.error) {
      return (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/15">
              <AlertTriangle className="size-6 text-destructive" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Something went wrong loading this view
              </p>
              <p className="text-xs text-muted-foreground">
                {this.state.error.message || "An unexpected error occurred"}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => this.setState({ error: null })}
            >
              <RefreshCw className="size-3.5" />
              Try again
            </Button>
          </CardContent>
        </Card>
      )
    }
    return this.props.children
  }
}
