import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const response: {
      submissions: any[];
      stats: {
        total24h: number;
        total7d: number;
        byType: Record<string, number>;
      };
    } = {
      submissions: [],
      stats: {
        total24h: 0,
        total7d: 0,
        byType: {},
      },
    };

    const { data: submissions, error } = await supabase
      .from('ghl_submissions')
      .select('*')
      .order('submitted_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json(response); // Return empty on error
    }

    if (!submissions || submissions.length === 0) {
      return NextResponse.json(response); // No submissions yet
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    response.stats.total24h = submissions.filter(
      s => new Date(s.submitted_at) > oneDayAgo
    ).length;

    response.stats.total7d = submissions.filter(
      s => new Date(s.submitted_at) > sevenDaysAgo
    ).length;

    response.stats.byType = submissions.reduce((acc: Record<string, number>, s: any) => {
      const type = s.form_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    response.submissions = submissions.map((s: any) => ({
      id: s.id,
      formName: s.form_name,
      formType: s.form_type,
      submittedAt: s.submitted_at,
      name: s.name,
      email: s.email,
      synced: s.synced_to_notion,
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to fetch form activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch form activity" },
      { status: 500 }
    );
  }
}
