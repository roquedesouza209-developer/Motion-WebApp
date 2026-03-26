import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { createId } from "@/lib/server/crypto";
import { updateDb } from "@/lib/server/database";
import type { SupportRequestRecord } from "@/lib/server/types";

type SupportPayload = {
  email?: string;
  message?: string;
};

function isValidEmail(email: string): boolean {
  return /^\S+@\S+\.\S+$/.test(email);
}

export async function POST(request: Request) {
  const authUser = await getAuthUser(request);
  let payload: SupportPayload;

  try {
    payload = (await request.json()) as SupportPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const email = payload.email?.trim() || authUser?.email || "";
  const message = payload.message?.trim() ?? "";

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (message.length < 5) {
    return NextResponse.json(
      { error: "Message must be at least 5 characters." },
      { status: 400 },
    );
  }

  if (message.length > 2000) {
    return NextResponse.json(
      { error: "Message must be at most 2000 characters." },
      { status: 400 },
    );
  }

  const record: SupportRequestRecord = {
    id: createId("sup"),
    email,
    message,
    userId: authUser?.id ?? null,
    status: "open",
    createdAt: new Date().toISOString(),
  };

  await updateDb((db) => {
    db.supportRequests.push(record);
  });

  return NextResponse.json({ ok: true, id: record.id });
}
