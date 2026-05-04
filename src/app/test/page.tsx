"use client";

import { useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase";

export default function TestPage() {
  useEffect(() => {
    async function test() {
      const supabase = getSupabaseClient();

      if (!supabase) {
        console.log("Supabase not configured");
        return;
      }

      const { data, error } = await supabase.from("teams").select("*");

      console.log("DATA:", data);
      console.log("ERROR:", error);
    }

    test();
  }, []);

  return <div>Supabase test page (check console)</div>;
}