"use client";

import { useState, useCallback, useMemo } from "react";
import Editor, { loader } from "@monaco-editor/react";
import { Check, Copy, ZoomIn, ZoomOut, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { MONACO_VS_PATH } from "@/lib/editor-config";

interface CodeBlockProps {
  code: string;
  language?: string;
  readOnly?: boolean;
}

loader.config({
  paths: {
    vs: MONACO_VS_PATH,
  },
});

export function CodeBlock({ code, language = "yaml", readOnly = true }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState(13);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { theme } = useTheme();

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const editorOptions = useMemo(
    () => ({
      readOnly,
      minimap: { enabled: false },
      lineNumbers: "on" as const,
      scrollBeyondLastLine: false,
      fontSize,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      wordWrap: "on" as const,
      automaticLayout: true,
      folding: true,
      renderLineHighlight: "line" as const,
      scrollbar: {
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8,
      },
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      overviewRulerBorder: false,
      contextmenu: true,
      quickSuggestions: false,
      suggestOnTriggerCharacters: false,
    }),
    [readOnly, fontSize]
  );

  const containerClass = isFullscreen 
    ? "fixed inset-0 z-50 bg-background/95 p-4" 
    : "relative rounded-md overflow-hidden";

  return (
    <div className={containerClass}>
      <div className="flex items-center gap-2 mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-1 text-green-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </>
          )}
        </Button>
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setFontSize(Math.max(10, fontSize - 1))}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-8 text-center">{fontSize}px</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setFontSize(Math.min(20, fontSize + 1))}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 ml-2"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <div className={isFullscreen ? "h-[calc(100%-60px)]" : "h-[400px]"}>
        <Editor
          height="100%"
          language={language}
          value={code}
          theme={theme === "dark" ? "vs-dark" : "light"}
          options={editorOptions}
        />
      </div>
    </div>
  );
}