import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/rbac";

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Authentication required" },
        { status: 401 }
      );
    }

    const userIsAdmin = await isAdmin(supabase, user.id);
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // User is admin - proceed with sprite worker
    const serviceSupabase = createServiceRoleClient();
    const body = await request.json().catch(() => ({}));
    
    // Invoke edge function
    const { data, error } = await serviceSupabase.functions.invoke("pokepedia-sprite-worker", {
      body,
    });
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
