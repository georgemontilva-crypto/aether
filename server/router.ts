import { router } from "./trpc";
import { shopRouter } from "./routers/shop";
import { adminRouter } from "./routers/admin";

export const appRouter = router({ shop: shopRouter, admin: adminRouter });
export type AppRouter = typeof appRouter;
