"use client";

import { captureError } from "@/lib/errorTracking";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    captureError(error, { errorType: "react_render" });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-background flex h-dvh w-full items-center justify-center p-6 text-center">
          <p className="text-muted-foreground">
            Une erreur est survenue. Rechargez la page pour continuer.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
