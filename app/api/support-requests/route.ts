import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { readDb } from "@/lib/server/database";
import { formatPostAge } from "@/lib/server/format";

export async function GET(request: Request) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.accountType !== "creator") {
    return NextResponse.json(
      { error: "Support inbox is only available for creator accounts." },
      { status: 403 },
    );
  }

  const db = await readDb();
  const usersById = new Map(db.users.map((candidate) => [candidate.id, candidate]));
  const supportRequests = [...db.supportRequests]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .map((record) => {
      const requester =
        record.userId != null ? usersById.get(record.userId) ?? null : null;

      return {
        id: record.id,
        email: record.email,
        message: record.message,
        status: record.status,
        createdAt: record.createdAt,
        timeAgo: formatPostAge(record.createdAt),
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

  return NextResponse.json({
    supportRequests,
    summary: {
      total: supportRequests.length,
      open: supportRequests.filter((record) => record.status === "open").length,
      resolved: supportRequests.filter((record) => record.status === "resolved").length,
      fromSignedInUsers: supportRequests.filter((record) => record.requester != null).length,
      external: supportRequests.filter((record) => record.requester == null).length,
    },
  });
}
