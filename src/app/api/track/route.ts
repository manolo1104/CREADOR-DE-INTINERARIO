import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const ICONS: Record<string, string> = {
  TOUR_PAGE_VIEW:          "🌐",
  TOURS_LIST_VIEW:         "🛍️",
  GALLERY_OPENED:          "🖼️",
  REVIEWS_SCROLLED:        "⭐",
  STICKY_SIDEBAR_SHOWN:    "📌",
  DATE_SELECTED:           "📅",
  PARTICIPANTS_CHANGED:    "👥",
  PROMO_APPLIED:           "🎟️",
  PROMO_FAILED:            "❌",
  CHECKOUT_STARTED:        "🛒",
  PAYMENT_INITIATED:       "💳",
  BOOKING_CONFIRMED:       "✅",
  INVENTORY_BADGE_SHOWN:   "⚠️",
  TOAST_SHOWN:             "🔔",
  TOAST_DISMISSED:         "✕",
  WHATSAPP_CLICK:          "📱",
  RECOMMENDER_STARTED:     "🎯",
  RECOMMENDER_COMPLETED:   "🏆",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, data, path, sid } = body as {
      event: string;
      data?: Record<string, unknown>;
      path?: string;
      sid?: string;
    };

    if (!event) return NextResponse.json({ ok: false }, { status: 400 });

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const icon = ICONS[event] ?? "📊";

    logger.info(`${icon} ${event}`, {
      data: data ?? {},
      path: path ?? "/",
      ip,
      sid: sid ?? "anonymous",
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
