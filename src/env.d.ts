/// <reference types="vite/client" />

declare const __GIT_COMMIT__: string
declare const __GIT_BRANCH__: string
declare const __GIT_DATE__: string
declare const __BUILD_TIME__: string

declare module '*.md?raw' {
  const content: string
  export default content
}
