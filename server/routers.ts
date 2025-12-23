import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { shoppingRouter } from "./routers/shopping";
import { tasksRouter } from "./routers/tasks";
import { uploadRouter } from "./routers/upload";
import { projectsRouter } from "./routers/projects";
import { z } from "zod";
import { deleteHousehold } from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Feature routers
  household: authRouter,
  shopping: shoppingRouter,
  tasks: tasksRouter,
  upload: uploadRouter,
  projects: projectsRouter,

  // Admin router
  admin: router({
    deleteHousehold: protectedProcedure
      .input(z.object({ householdId: z.number() }))
      .mutation(async ({ input }) => {
        const success = await deleteHousehold(input.householdId);
        if (!success) {
          throw new Error("Failed to delete household");
        }
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
