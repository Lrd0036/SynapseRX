import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TechnicianDashboard } from "@/components/TechnicianDashboard";
import { ManagerDashboard } from "@/components/ManagerDashboard";

const Dashboard = () => {
  const [userRole, setUserRole] = useState<"technician" | "manager" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      setUserRole(roleData?.role || "technician");
      setLoading(false);
    };

    fetchUserRole();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {userRole === "manager" ? <ManagerDashboard /> : <TechnicianDashboard />}
    </div>
  );
};

export default Dashboard;
