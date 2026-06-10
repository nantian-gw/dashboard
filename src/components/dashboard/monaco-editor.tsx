"use client";

import Editor, { loader, type EditorProps } from "@monaco-editor/react";
import { MONACO_VS_PATH } from "@/lib/editor-config";

loader.config({
  paths: {
    vs: MONACO_VS_PATH,
  },
});

export default function MonacoEditor(props: EditorProps) {
  return <Editor {...props} />;
}
