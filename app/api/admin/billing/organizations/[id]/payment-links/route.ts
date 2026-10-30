import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformAdminRole } from "@/lib/auth/admin-guard";
import { adminCreatePaymentLink, adminListPaymentLinks } from "@/lib/supabase/repositories/admin";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const role = await getPlatformAdminRole();
  if (!role) return NextResponse.json({ success: false, error: "Accès refusé." }, { status: 404 });

  const { id } = await params;
  const admin = createAdminClient();
  const links = await adminListPaymentLinks(admin, id);
  return NextResponse.json({ success: true, links });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const role = await getPlatformAdminRole();
  if (!role) return NextResponse.json({ success: false, error: "Accès refusé." }, { status: 404 });

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    amount?: string;
    currency?: string;
    description?: string;
    extendsDays?: number;
  };

  if (!body.name || !body.amount || !body.currency || !body.extendsDays) {
    return NextResponse.json({ success: false, error: "Champs manquants." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: "Non authentifié." }, { status: 401 });

  try {
    const admin = createAdminClient();
    const link = await adminCreatePaymentLink(
      admin,
      id,
      {
        name: body.name,
        amount: body.amount,
        currency: body.currency,
        description: body.description,
        extendsDays: body.extendsDays,
      },
      user.id,
    );
    return NextResponse.json({ success: true, link });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." },
      { status: 500 },
    );
  }
}
