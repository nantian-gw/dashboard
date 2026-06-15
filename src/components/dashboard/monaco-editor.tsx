"use client";

import Editor, { loader, type EditorProps } from "@monaco-editor/react";
import { MONACO_VS_PATH } from "@/lib/editor-config";

// Only configure CDN path if explicitly set (legacy support).
// When empty, @monaco-editor/react loads from local node_modules bundle.
if (MONACO_VS_PATH) {
  loader.config({
    paths: {
      vs: MONACO_VS_PATH,
    },
  });
}

export default function MonacoEditor(props: EditorProps) {
  return <Editor {...props} />;
}
