import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/rbac";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("[Pokepedia Worker] Auth error:", authError);
      return NextResponse.json(
        { error: "Unauthorized - Authentication required" },
        { status: 401 }
      );
    }

    // Check admin status with better error handling
    // Try with regular client first, fallback to service role if RLS blocks
    let userIsAdmin = false;
    try {
      userIsAdmin = await isAdmin(supabase, user.id);
      
      // If isAdmin returns false, try with service role client (bypasses RLS)
      if (!userIsAdmin) {
        const serviceSupabase = createServiceRoleClient();
        const { data: profile, error: profileError } = await serviceSupabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        
        if (profileError) {
          console.error("[Pokepedia Worker] Profile lookup error:", profileError);
        } else {
          userIsAdmin = profile?.role === "admin";
          console.log("[Pokepedia Worker] Admin check (service role):", {
            userId: user.id,
            profileRole: profile?.role,
            isAdmin: userIsAdmin,
          });
        }
      }
    } catch (adminCheckError) {
      console.error("[Pokepedia Worker] Error checking admin status:", adminCheckError);
      // Try with service role as fallback
      try {
        const serviceSupabase = createServiceRoleClient();
        const { data: profile } = await serviceSupabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        userIsAdmin = profile?.role === "admin";
      } catch (fallbackError) {
        console.error("[Pokepedia Worker] Fallback admin check failed:", fallbackError);
        return NextResponse.json(
          { error: "Error verifying admin status" },
          { status: 500 }
        );
      }
    }

    if (!userIsAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // User is admin - proceed with worker
    const serviceSupabase = createServiceRoleClient();
    const body = await request.json().catch(() => ({}));
    
    // Invoke edge function
    const { data, error } = await serviceSupabase.functions.invoke("pokepedia-worker", {
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
