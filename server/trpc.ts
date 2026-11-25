import { initTRPC, TRPCError } from "@trpc/server";
import type { Request, Response } from "express";
import { isAdmin } from "./auth";

export async function createContext({ req, res }: { req: Request; res: Response }) {
  return { req, res, admin: await isAdmin(req) };
}
type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();
export const router = t.router;
export const publicProcedure = t.procedure;
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.admin) throw new TRPCError({ code: "UNAUTHORIZED", message: "Inicia sesión en el panel" });
  return next();
});
