import { lazy, Suspense, type ComponentType } from "react";
// Preview-only stand-in for next/dynamic (client-side lazy load).
export default function dynamic<P extends object>(loader: () => Promise<{ default: ComponentType<P> }>) {
  const L = lazy(loader);
  return function Dynamic(props: P) {
    return (
      <Suspense fallback={null}>
        <L {...props} />
      </Suspense>
    );
  };
}
