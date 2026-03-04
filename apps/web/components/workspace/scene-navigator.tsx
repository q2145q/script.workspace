"use client";

import { type Editor, useEditorState } from "@script/editor";

interface Scene {
  pos: number;
  text: string;
  index: number;
}

interface SceneNavigatorProps {
  editor: Editor | null;
}

export function SceneNavigator({ editor }: SceneNavigatorProps) {
  const scenes = useEditorState({
    editor: editor!,
    selector: (ctx): Scene[] => {
      if (!ctx.editor) return [];
      const result: Scene[] = [];
      let index = 0;
      ctx.editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "sceneHeading") {
          index++;
          result.push({
            pos,
            text: node.textContent || `Scene ${index}`,
            index,
          });
        }
      });
      return result;
    },
  });

  if (!editor) {
    return null;
  }

  const handleScrollToScene = (pos: number) => {
    editor.chain().focus().setTextSelection(pos + 1).scrollIntoView().run();
  };

  return (
    <div className="flex flex-col">
      <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Scenes
      </div>
      {scenes.length === 0 ? (
        <div className="px-3 py-2 text-xs text-muted-foreground">
          No scenes yet. Type INT. or EXT. to create one.
        </div>
      ) : (
        <div className="space-y-0.5">
          {scenes.map((scene) => (
            <button
              key={`${scene.pos}-${scene.index}`}
              onClick={() => handleScrollToScene(scene.pos)}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent rounded-sm truncate"
            >
              <span className="text-muted-foreground mr-1">
                {scene.index}.
              </span>
              {scene.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
