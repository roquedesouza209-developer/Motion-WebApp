import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { updateDb } from "@/lib/server/database";
import type { RouteContext } from "@/lib/server/route-context";
import { formatPostAge } from "@/lib/server/format";

type UpdatePayload = {
  status?: "open" | "resolved";
};

function ensureCreator(user: Awaited<ReturnType<typeof getAuthUser>>) {
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.accountType !== "creator") {
    return NextResponse.json(
      { error: "Support inbox is only available for creator accounts." },
      { status: 403 },
    );
  }

  return null;
}

export async function PATCH(
  request: Request,
  context: RouteContext<{ requestId: string }>,
) {
  const user = await getAuthUser(request);
  const denied = ensureCreator(user);

  if (denied) {
    return denied;
  }

  let payload: UpdatePayload;

  try {
    payload = (await request.json()) as UpdatePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (payload.status !== "open" && payload.status !== "resolved") {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const { requestId } = await context.params;

  const result = await updateDb((db) => {
    const usersById = new Map(db.users.map((candidate) => [candidate.id, candidate]));
    const supportRequest = db.supportRequests.find((candidate) => candidate.id === requestId);

    if (!supportRequest) {
      return null;
    }

    supportRequest.status = payload.status!;

    const requester =
      supportRequest.userId != null
        ? usersById.get(supportRequest.userId) ?? null
        : null;

    return {
      id: supportRequest.id,
      email: supportRequest.email,
      message: supportRequest.message,
      status: supportRequest.status,
      createdAt: supportRequest.createdAt,
      timeAgo: formatPostAge(supportRequest.createdAt),
      requester: requester
        ? {
            id: requester.id,
            name: requester.name,
            handle: requester.handle,
            accountType: requester.accountType,
            avatarGradient: requester.avatarGradient,
            avatarUrl: requester.avatarUrl,
          }
        : null,
    };
  });

  if (!result) {
    return NextResponse.json({ error: "Support request not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, supportRequest: result });
}

export async function DELETE(
  request: Request,
  context: RouteContext<{ requestId: string }>,
) {
  const user = await getAuthUser(request);
  const denied = ensureCreator(user);

  if (denied) {
    return denied;
  }

  const { requestId } = await context.params;

  const removed = await updateDb((db) => {
    const index = db.supportRequests.findIndex((candidate) => candidate.id === requestId);

    if (index < 0) {
      return false;
    }

    db.supportRequests.splice(index, 1);
    return true;
  });

  if (!removed) {
    return NextResponse.json({ error: "Support request not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
