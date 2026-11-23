"use client";

import { Component, type ReactNode } from "react";
import { sceneFailureKind, sceneFailureText } from "@/lib/scene/sceneFailure";
import { SceneFailureNotice, type SceneFailureAction } from "./SceneFailureNotice";

type SceneErrorBoundaryProps = {
  children: ReactNode;
  /** Omitted when `onCaught` is set: the parent draws the notice, and this boundary only unmounts the scene. */
  actions?: readonly SceneFailureAction[];
  /**
   * When set, the parent draws the notice (so the walk can keep its header) and this boundary draws nothing.
   * The canvas is unmounted either way.
   */
  onCaught?: (error: unknown) => void;
};

type SceneErrorBoundaryState = {
  error: unknown;
};

/** Catches a render error in a 3D view so it cannot replace the whole page. */
export class SceneErrorBoundary extends Component<SceneErrorBoundaryProps, SceneErrorBoundaryState> {
  state: SceneErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): SceneErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: unknown): void {
    console.warn("A view stopped.", error);
    this.props.onCaught?.(error);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.onCaught) return null;
    return (
      <SceneFailureNotice
        placement="screen"
        kind={sceneFailureKind(error)}
        reported={sceneFailureText(error)}
        actions={this.props.actions ?? []}
      />
    );
  }
}
