"use client";

import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

export function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof PanelGroup>) {
  return <PanelGroup className={className} {...props} />;
}

export function ResizablePanel({
  className,
  ...props
}: React.ComponentProps<typeof Panel>) {
  return <Panel className={className} {...props} />;
}

export function ResizableHandle({ className }: { className?: string }) {
  return (
    <PanelResizeHandle className={className ?? "relative w-px bg-border transition-colors hover:bg-foreground/20 data-[resize-handle-active]:bg-foreground/30"} />
  );
}
