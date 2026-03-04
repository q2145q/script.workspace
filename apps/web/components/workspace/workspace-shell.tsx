"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/workspace/resizable";
import { WorkspaceSidebar } from "./workspace-sidebar";
import { RightPanel } from "./right-panel";
import { EditorArea } from "./editor-area";

interface WorkspaceShellProps {
  project: {
    id: string;
    title: string;
    documents: Array<{ id: string; title: string }>;
  };
  document: {
    id: string;
    title: string;
    content: unknown;
  };
}

export function WorkspaceShell({ project, document }: WorkspaceShellProps) {
  return (
    <div className="h-screen overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel
          defaultSize={15}
          minSize={10}
          maxSize={25}
          className="bg-sidebar"
        >
          <WorkspaceSidebar project={project} activeDocumentId={document.id} />
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={60} minSize={40}>
          <EditorArea document={document} />
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel
          defaultSize={25}
          minSize={15}
          maxSize={35}
          className="bg-sidebar"
        >
          <RightPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
