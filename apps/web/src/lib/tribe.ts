import { Tribe } from "@tribecloud/sdk"

export const tribe = new Tribe({
  siteId: import.meta.env.VITE_TRIBE_SITE_ID || "",
})
