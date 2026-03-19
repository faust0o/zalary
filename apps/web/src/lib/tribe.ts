import { Tribe } from "@tribecloud/sdk"

export const tribe = new Tribe({
  siteId: import.meta.env.VITE_TRIBE_SITE_ID || "",
  baseUrl:
    import.meta.env.VITE_TRIBE_BASE_URL || "https://api.tribe.utopian.build",
})
