/// <reference types="vite/client" />

declare interface Window {
  MonacoEnvironment: import('monaco-editor').Environment | undefined;
}