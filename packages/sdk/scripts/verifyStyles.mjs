import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import postcss from "postcss";
import ts from "typescript";

// Verifies that the built SDK stylesheet only emits Daimo-namespaced selectors
// and keyframes, then cross-checks the source tree and a hostile host Tailwind
// fixture so unprefixed classes cannot silently slip back in.
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, "..");
const require = createRequire(import.meta.url);
const selectorParserModule = loadSelectorParser();
const selectorParser = selectorParserModule.default ?? selectorParserModule;
const distStylesCssPath = path.join(packageRoot, "dist/web/styles.css");
const distThemeCssPath = path.join(packageRoot, "dist/web/theme.css");
const fixtureDir = path.join(packageRoot, "test/host-tailwind");
const sourceDir = path.join(packageRoot, "src/web");
const namespace = "daimo-";
const customNames = new Set([
  "daimo-scroll-fade",
  "daimo-scroll-end",
  "daimo-transition-qr",
  "daimo-transition-qr-icon",
  "daimo-transition-qr-spacer",
  "daimo-qr-container",
  "daimo-page-enter",
  "daimo-modal-backdrop",
  "daimo-modal-content",
]);
const simpleUtilities = new Set([
  "absolute",
  "aspect-square",
  "block",
  "fixed",
  "flex",
  "grid",
  "hidden",
  "inline-block",
  "invisible",
  "relative",
  "sticky",
  "transform",
  "truncate",
  "underline",
  "visible",
]);
const utilityStems = new Set([
  "active",
  "animate",
  "aspect",
  "bg",
  "basis",
  "block",
  "border",
  "bottom",
  "caret",
  "content",
  "cursor",
  "disabled",
  "duration",
  "ease",
  "filter",
  "flex",
  "focus",
  "font",
  "gap",
  "grid",
  "grow",
  "h",
  "hover",
  "inline",
  "inset",
  "items",
  "justify",
  "leading",
  "left",
  "m",
  "max",
  "mb",
  "min",
  "ml",
  "motion",
  "mr",
  "mt",
  "mx",
  "my",
  "no",
  "object",
  "opacity",
  "outline",
  "overflow",
  "p",
  "pb",
  "placeholder",
  "place",
  "pl",
  "pointer",
  "pr",
  "pt",
  "px",
  "py",
  "relative",
  "right",
  "ring",
  "rotate",
  "rounded",
  "scale",
  "self",
  "shadow",
  "shrink",
  "sm",
  "space",
  "tabular",
  "text",
  "top",
  "touch",
  "transition",
  "translate",
  "w",
  "whitespace",
  "z",
]);
const forbiddenSourcePatterns = [
  /(?<!daimo-)scroll-fade\b/,
  /(?<!daimo-)scroll-end\b/,
  /(?<!daimo-)transition-qr\b/,
  /(?<!daimo-)transition-qr-icon\b/,
  /(?<!daimo-)transition-qr-spacer\b/,
  /(?<!daimo-)qr-container\b/,
  /\banimate-pulse\b/,
  /(?<!daimo-)spin 400ms/,
  /@keyframes\s+(?!daimo-)[-\w]+/,
];

function loadSelectorParser() {
  try {
    return require("postcss-selector-parser");
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "MODULE_NOT_FOUND"
    ) {
      throw error;
    }
  }

  // Keep working in already-installed workspaces until the new direct
  // devDependency is picked up by the next install.
  const tailwindPackagePath = require.resolve("tailwindcss/package.json", {
    paths: [packageRoot],
  });

  return require(
    path.join(
      path.dirname(tailwindPackagePath),
      "node_modules/postcss-selector-parser",
    ),
  );
}
const forbiddenRawPatterns = [
  {
    label: "invalid prefixed input type",
    pattern: /\btype\s*=\s*["']daimo-text["']/,
  },
  {
    label: "invalid prefixed px unit",
    pattern: /style\.height\s*=\s*[`'"][^`'"]*daimo-px/,
  },
  {
    label: "invalid prefixed animation timing function",
    pattern: /\banimation:\s*[^;]*\bdaimo-ease-(?:in|out|in-out)\b/,
  },
  {
    label: "invalid prefixed transition value",
    pattern:
      /\btransition:\s*["'`][^"'`]*\bdaimo-(?:transform|ease(?:-in|-out|-in-out)?)\b/,
  },
];

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function collectClasses(css) {
  const classes = new Set();
  const root = postcss.parse(css);

  root.walkRules((rule) => {
    selectorParser((selectors) => {
      selectors.walkClasses((classNode) => {
        classes.add(classNode.value);
      });
    }).processSync(rule.selector);
  });

  return classes;
}

function collectKeyframes(css) {
  const names = new Set();
  const root = postcss.parse(css);

  root.walkAtRules("keyframes", (atRule) => {
    names.add(atRule.params.trim());
  });

  return names;
}

function getUtilityBase(token) {
  // Find the last top-level ":" (not inside brackets) to get the final segment
  let depth = 0;
  let lastSep = -1;
  for (let i = 0; i < token.length; i++) {
    const ch = token[i];
    if (ch === "[" || ch === "(") depth += 1;
    else if (ch === "]" || ch === ")") depth = Math.max(0, depth - 1);
    else if (ch === ":" && depth === 0) lastSep = i;
  }
  let base = lastSep >= 0 ? token.slice(lastSep + 1) : token;
  if (base.startsWith("!") || base.startsWith("-")) base = base.slice(1);
  if (base.startsWith("-")) base = base.slice(1);
  return base;
}

function looksLikeUtilityToken(token) {
  const base = getUtilityBase(token);
  if (!base || base.startsWith(namespace) || customNames.has(base))
    return false;
  if (base.startsWith("[")) return true;
  if (simpleUtilities.has(base)) return true;
  return utilityStems.has(base.split("-")[0]);
}

function isClassLikeName(name) {
  const lower = name.toLowerCase();
  return (
    lower.includes("class") ||
    lower.endsWith("color") ||
    lower.endsWith("size") ||
    lower === "container" ||
    lower === "icon" ||
    lower === "badge" ||
    lower === "position"
  );
}

function propertyNameText(nameNode) {
  if (ts.isIdentifier(nameNode) || ts.isStringLiteral(nameNode))
    return nameNode.text;
  return nameNode.getText();
}

function nodeHasClassContext(node) {
  let current = node.parent;
  while (current) {
    if (ts.isJsxAttribute(current) && current.name.text === "className")
      return true;
    if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) {
      return isClassLikeName(current.name.text);
    }
    if (ts.isPropertyAssignment(current)) {
      return isClassLikeName(propertyNameText(current.name));
    }
    current = current.parent;
  }
  return false;
}

function rawNodeText(sourceText, node) {
  const start = node.getStart();
  switch (node.kind) {
    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
    case ts.SyntaxKind.TemplateTail:
      return sourceText.slice(start + 1, node.end - 1);
    case ts.SyntaxKind.TemplateHead:
    case ts.SyntaxKind.TemplateMiddle:
      return sourceText.slice(start + 1, node.end - 2);
    default:
      return "";
  }
}

function validateSourceClassContexts() {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }
      if (/\.(css|ts|tsx)$/.test(entry.name)) files.push(entryPath);
    }
  };

  walk(sourceDir);

  const violations = [];
  for (const filePath of files) {
    const text = readText(filePath);

    for (const { label, pattern } of forbiddenRawPatterns) {
      if (pattern.test(text)) {
        violations.push(`${path.relative(packageRoot, filePath)}: ${label}`);
      }
    }

    if (filePath.endsWith(".css")) {
      for (const pattern of forbiddenSourcePatterns) {
        if (pattern.test(text)) {
          violations.push(
            `${path.relative(packageRoot, filePath)}: ${pattern}`,
          );
        }
      }
      continue;
    }

    const sourceFile = ts.createSourceFile(
      filePath,
      text,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    const visit = (node) => {
      const isStringLike =
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        node.kind === ts.SyntaxKind.TemplateHead ||
        node.kind === ts.SyntaxKind.TemplateMiddle ||
        node.kind === ts.SyntaxKind.TemplateTail;

      if (isStringLike && nodeHasClassContext(node)) {
        const raw = rawNodeText(text, node);
        const tokens = raw.split(/\s+/).filter(Boolean);
        for (const token of tokens) {
          if (looksLikeUtilityToken(token)) {
            violations.push(
              `${path.relative(packageRoot, filePath)}: ${token}`,
            );
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  if (violations.length > 0) {
    throw new Error(
      `found stale un-namespaced source tokens:\n${violations.join("\n")}`,
    );
  }
}

function ensureNamespaced(sdkClasses, sdkKeyframes) {
  const badClasses = [...sdkClasses].filter(
    (className) => !className.includes(namespace),
  );
  const badKeyframes = [...sdkKeyframes].filter(
    (name) => !name.startsWith(namespace),
  );

  if (badClasses.length > 0) {
    throw new Error(
      `found non-namespaced sdk classes: ${badClasses.slice(0, 10).join(", ")}`,
    );
  }
  if (badKeyframes.length > 0) {
    throw new Error(
      `found non-namespaced sdk keyframes: ${badKeyframes.slice(0, 10).join(", ")}`,
    );
  }
}

function buildHostFixtureCss() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "daimo-sdk-styles-"));
  const outputPath = path.join(tempDir, "host.css");

  execFileSync(
    "npx",
    [
      "tailwindcss",
      "-c",
      path.join(fixtureDir, "tailwind.config.cjs"),
      "-i",
      path.join(fixtureDir, "input.css"),
      "-o",
      outputPath,
      "--minify",
    ],
    { cwd: packageRoot, stdio: "pipe" },
  );

  return outputPath;
}

function ensureNoFixtureOverlap(sdkClasses, sdkKeyframes) {
  const hostCssPath = buildHostFixtureCss();
  const hostCss = readText(hostCssPath);
  const hostClasses = collectClasses(hostCss);
  const hostKeyframes = collectKeyframes(hostCss);
  const overlappingClasses = [...sdkClasses].filter((className) =>
    hostClasses.has(className),
  );
  const overlappingKeyframes = [...sdkKeyframes].filter((name) =>
    hostKeyframes.has(name),
  );

  if (overlappingClasses.length > 0) {
    throw new Error(
      `host fixture shares sdk classes: ${overlappingClasses.slice(0, 10).join(", ")}`,
    );
  }
  if (overlappingKeyframes.length > 0) {
    throw new Error(
      `host fixture shares sdk keyframes: ${overlappingKeyframes.slice(0, 10).join(", ")}`,
    );
  }
}

function validatePublicEntrypoints() {
  if (!fs.existsSync(distThemeCssPath)) {
    throw new Error(`missing stylesheet at ${distThemeCssPath}`);
  }
  if (!fs.existsSync(distStylesCssPath)) {
    throw new Error(`missing stylesheet at ${distStylesCssPath}`);
  }

  const themeCss = readText(distThemeCssPath);
  const stylesCss = readText(distStylesCssPath);
  if (themeCss !== stylesCss) {
    throw new Error("theme.css and styles.css must be identical build outputs");
  }
}

validateSourceClassContexts();
validatePublicEntrypoints();

const sdkCss = readText(distThemeCssPath);
const sdkClasses = collectClasses(sdkCss);
const sdkKeyframes = collectKeyframes(sdkCss);

ensureNamespaced(sdkClasses, sdkKeyframes);
ensureNoFixtureOverlap(sdkClasses, sdkKeyframes);

console.log(
  `verified ${sdkClasses.size} sdk classes and ${sdkKeyframes.size} keyframes`,
);
