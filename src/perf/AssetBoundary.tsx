import { Component, type ReactNode } from "react";

// One asset, one boundary. A bad GLB or a bake that throws drops that
// object. It does not unmount the rest of the scene.
export class AssetBoundary extends Component<{ children: ReactNode; label?: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) {
    console.error("[asset]", this.props.label ?? "object", error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
