/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHAREPOINT_URI: string;
  readonly VITE_CLIENT_ID: string;
  readonly VITE_AUTHORITY: string;
  readonly VITE_REDIRECT_URI: string;
  readonly VITE_ENVIRONMENT: 'dev' | 'production';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

