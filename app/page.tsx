import { redirect } from "next/navigation";
import { supabaseUser } from "@/lib/supabase-server";
import { SplineLanding } from "@/components/background/SplineLanding";

// Landing gate: logged-in ("existing") users skip the intro and go straight to
// the dashboard. Only visitors without a session see the Spline welcome, which
// leads into sign-up.
export default async function Home() {
  const { user } = await supabaseUser();
  if (user) redirect("/dashboard");
  return <SplineLanding />;
}
