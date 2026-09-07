import { getAdminSession } from "@/lib/session";
import { getAdminData } from "@/app/actions/admin";
import AdminLogin from "./AdminLogin";
import AdminPanel from "./AdminPanel";

export default async function AdminPage() {
  const isAdmin = await getAdminSession();
  if (!isAdmin) return <AdminLogin />;

  const data = await getAdminData();
  return <AdminPanel initialData={data} />;
}
