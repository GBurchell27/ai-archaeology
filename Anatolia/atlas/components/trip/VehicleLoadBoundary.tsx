"use client";

import { Component, type ReactNode } from "react";

/** Shows `fallback` instead of a vehicle model that failed to load. */
export class VehicleLoadBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    console.warn("Trip vehicle model not loaded, using the simple model instead.", error);
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
