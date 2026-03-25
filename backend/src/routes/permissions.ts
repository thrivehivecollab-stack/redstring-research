import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { HonoVariables } from "../types";

const permissionsRouter = new Hono<{ Variables: HonoVariables }>();

function unauthorized(c: any) {
  return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
}
function forbidden(c: any) {
  return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
}
function notFound(c: any) {
  return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
}

const permissionsSchema = z.object({
  investigationId: z.string().min(1),
  collabCanDownloadPdf: z.boolean().optional(),
  collabCanSaveNodes: z.boolean().optional(),
  collabCanShareExternally: z.boolean().optional(),
  collabCanScreenshot: z.boolean().optional(),
  collabCanExportPresentation: z.boolean().optional(),
  collabCanExportTimeline: z.boolean().optional(),
  collabCanViewChainOfCustody: z.boolean().optional(),
  viewerCanDownloadPdf: z.boolean().optional(),
  viewerCanSaveNodes: z.boolean().optional(),
  viewerCanShareExternally: z.boolean().optional(),
  viewerCanScreenshot: z.boolean().optional(),
  viewerCanExportPresentation: z.boolean().optional(),
  viewerCanExportTimeline: z.boolean().optional(),
  viewerCanViewChainOfCustody: z.boolean().optional(),
  guestCanDownloadPdf: z.boolean().optional(),
  guestCanSaveNodes: z.boolean().optional(),
  guestCanShareExternally: z.boolean().optional(),
  guestCanScreenshot: z.boolean().optional(),
  guestCanExportPresentation: z.boolean().optional(),
  guestCanExportTimeline: z.boolean().optional(),
  guestCanViewChainOfCustody: z.boolean().optional(),
});

// POST /api/permissions - create or upsert permissions for an investigation
permissionsRouter.post(
  "/",
  zValidator("json", permissionsSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) return unauthorized(c);

    const { investigationId, ...rest } = c.req.valid("json");

    const permissions = await prisma.investigationPermissions.upsert({
      where: { investigationId },
      update: { ...rest },
      create: { investigationId, ownerId: user.id, ...rest },
    });

    return c.json({ data: permissions }, 201);
  }
);

// GET /api/permissions/:investigationId - get permissions for an investigation
permissionsRouter.get("/:investigationId", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const permissions = await prisma.investigationPermissions.findUnique({
    where: { investigationId: c.req.param("investigationId") },
    include: { userOverrides: true },
  });

  if (!permissions) return notFound(c);

  return c.json({ data: permissions });
});

// POST /api/permissions/:investigationId/user-override - override permissions for a specific user
permissionsRouter.post(
  "/:investigationId/user-override",
  zValidator(
    "json",
    z.object({
      targetUserId: z.string().min(1),
      canDownloadPdf: z.boolean().optional(),
      canSaveNodes: z.boolean().optional(),
      canShareExternally: z.boolean().optional(),
      canScreenshot: z.boolean().optional(),
      canExportPresentation: z.boolean().optional(),
      canExportTimeline: z.boolean().optional(),
      canViewChainOfCustody: z.boolean().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) return unauthorized(c);

    const permissions = await prisma.investigationPermissions.findUnique({
      where: { investigationId: c.req.param("investigationId") },
    });

    if (!permissions) return notFound(c);
    if (permissions.ownerId !== user.id) return forbidden(c);

    const { targetUserId, ...overrideFields } = c.req.valid("json");

    const override = await prisma.userPermissionOverride.upsert({
      where: {
        permissionsId_targetUserId: {
          permissionsId: permissions.id,
          targetUserId,
        },
      },
      update: { ...overrideFields },
      create: {
        permissionsId: permissions.id,
        targetUserId,
        ...overrideFields,
      },
    });

    return c.json({ data: override }, 201);
  }
);

// GET /api/permissions/:investigationId/user-override/:userId - get override for specific user
permissionsRouter.get("/:investigationId/user-override/:userId", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const permissions = await prisma.investigationPermissions.findUnique({
    where: { investigationId: c.req.param("investigationId") },
  });

  if (!permissions) return notFound(c);
  if (permissions.ownerId !== user.id) return forbidden(c);

  const override = await prisma.userPermissionOverride.findUnique({
    where: {
      permissionsId_targetUserId: {
        permissionsId: permissions.id,
        targetUserId: c.req.param("userId"),
      },
    },
  });

  return c.json({ data: override ?? null });
});

// DELETE /api/permissions/:investigationId/user-override/:userId - remove override
permissionsRouter.delete("/:investigationId/user-override/:userId", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const permissions = await prisma.investigationPermissions.findUnique({
    where: { investigationId: c.req.param("investigationId") },
  });

  if (!permissions) return notFound(c);
  if (permissions.ownerId !== user.id) return forbidden(c);

  await prisma.userPermissionOverride.deleteMany({
    where: {
      permissionsId: permissions.id,
      targetUserId: c.req.param("userId"),
    },
  });

  return c.body(null, 204);
});

export { permissionsRouter };
