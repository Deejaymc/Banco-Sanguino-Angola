import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const user = u.user;
      if (!user) return null;
      const [{ data: existing }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      let profile = existing;
      if (!profile) {
        // Ensure every signed-in account has a donor profile.
        const meta = user.user_metadata ?? {};
        const { data: created } = await supabase.from("profiles").insert({
          id: user.id,
          full_name: meta["full_name"] || meta["name"] || "",
          phone: meta["phone"] || null,
          blood_type: meta["blood_type"] || null,
        }).select("*").maybeSingle();
        profile = created;
      }
      const r = (roles ?? []).map((x) => x.role);
      return {
        user,
        profile,
        roles: r,
        isAdmin: r.includes("admin"),
        isHospital: r.includes("hospital"),
      };
    },
  });
}
