// src/ui/organisms/SlotBoundary.tsx
// Per-slot React error boundary: a registered component that throws while rendering
// is replaced by its slot's fallback; the rest of the screen keeps working.
import React from 'react';

interface Props { slot: string; fallback: React.ReactNode; children: React.ReactNode }
interface State { failed: boolean }

export class SlotBoundary extends React.Component<Props, State> {
  state: State = { failed: false };
  static getDerivedStateFromError(): State { return { failed: true }; }
  componentDidCatch(error: Error) {
    if (__DEV__) console.warn(`[SlotBoundary] ${this.props.slot} render failed: ${error.message}`);
  }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
