"use client";

import { ClipboardIcon, CheckIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

interface CodeSnippetProps {
  codeSnippet: string;
}

export default function CodeSnippet({ codeSnippet }: CodeSnippetProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = codeSnippet.split("\n");
  const lineCount = lines.length;
  // Calculate width needed for line numbers (minimum 2 characters)
  const lineNumberWidth = Math.max(2, String(lineCount).length);

  return (
    <div className="relative group">
      <div className="bg-[#1e1e1e] rounded-lg py-4 text-white overflow-hidden mt-4 w-full border border-primary-medium">
        <pre
          className="font-mono text-sm md:text-base overflow-x-auto px-3"
          style={{ maxWidth: "100%" }}
        >
          <code>
            {lines.map((line, index) => (
              <div
                key={index}
                className="flex group items-start whitespace-pre"
              >
                <div
                  className="font-mono text-gray-500 select-none group-hover:text-gray-400 shrink-0 tabular-nums"
                  style={{
                    width: `${lineNumberWidth + 1}ch`,
                    textAlign: "right",
                    paddingRight: "1ch",
                  }}
                >
                  {index + 1}
                </div>
                <div className="flex-shrink-0 pl-3 pr-6">
                  {highlightCode(line)}
                </div>
              </div>
            ))}
          </code>
        </pre>
      </div>

      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded-md 
                 bg-gray-100 hover:bg-gray-200 transition-colors
                 text-gray-500 hover:text-gray-700"
        title="Copy code"
      >
        {copied ? (
          <CheckIcon className="h-4 w-4 text-primary-600" />
        ) : (
          <ClipboardIcon className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

// Helper function to highlight code syntax
function highlightCode(line: string) {
  if (line.trim().startsWith("import")) {
    const importMatch = line.match(/\{\s*([^}]+)\s*\}/);
    const pathMatch = line.match(/"([^"]+)"/);
    return (
      <span>
        <span className="text-purple-400">import</span>
        <span className="text-white"> {"{" + " "}</span>
        <span className="text-yellow-300">
          {importMatch ? importMatch[1] : ""}
        </span>
        <span className="text-white">{" " + "}"} </span>
        <span className="text-purple-400">from</span>
        <span className="text-primary-400">
          {" "}
          &quot;{pathMatch ? pathMatch[1] : ""}&quot;
        </span>
        <span className="text-white">;</span>
      </span>
    );
  }
  if (line.includes("<RozoPayButton")) {
    return <span className="text-purple-400">{line}</span>;
  }
  if (line.includes("appId=")) {
    const valueMatch = line.match(/=([^,]+)/);
    return (
      <span>
        <span className="text-cyan-300">appId</span>
        <span className="text-white">=</span>
        <span className="text-primary-400">
          {valueMatch ? valueMatch[1] : ""}
        </span>
      </span>
    );
  }
  if (line.includes("toChain=")) {
    const valueMatch = line.match(/=([^,]+)/);
    return (
      <span>
        <span className="text-cyan-300">toChain</span>
        <span className="text-white">=</span>
        <span className="text-orange-400">
          {valueMatch ? valueMatch[1] : ""}
        </span>
      </span>
    );
  }
  if (line.includes("toAddress=")) {
    const valueMatch = line.match(/=([^,]+)/);
    return (
      <span>
        <span className="text-cyan-300">toAddress</span>
        <span className="text-white">=</span>
        <span className="text-orange-400">
          {valueMatch ? valueMatch[1] : ""}
        </span>
      </span>
    );
  }
  if (line.includes("toUnits=")) {
    const valueMatch = line.match(/=([^,]+)/);
    return (
      <span>
        <span className="text-cyan-300">toUnits</span>
        <span className="text-white">=</span>
        <span className="text-primary-400">
          {valueMatch ? valueMatch[1] : ""}
        </span>
      </span>
    );
  }
  if (line.includes("toToken=")) {
    const valueMatch = line.match(/=([^,]+)/);
    return (
      <span>
        <span className="text-cyan-300">toToken</span>
        <span className="text-white">=</span>
        <span className="text-orange-400">
          {valueMatch ? valueMatch[1] : ""}
        </span>
      </span>
    );
  }
  if (line.includes("intent=")) {
    const valueMatch = line.match(/=([^,]+)/);
    return (
      <span>
        <span className="text-cyan-300">intent</span>
        <span className="text-white">=</span>
        <span className="text-primary-400">
          {valueMatch ? valueMatch[1] : ""}
        </span>
      </span>
    );
  }
  if (line.includes("getAddress")) {
    return (
      <span>
        <span className="text-yellow-300">getAddress</span>
        <span className="text-white">{line.replace("getAddress", "")}</span>
      </span>
    );
  }
  return <span className="text-white">{line}</span>;
}
