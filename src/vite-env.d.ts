/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_MODE?: 'demo' | 'cloud';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
