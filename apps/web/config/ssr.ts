export const SSR_ROUTES: string[] = []

export const isSSREnableForPage = (page: string) =>
  SSR_ROUTES.some((prefix) => page.startsWith(prefix))
