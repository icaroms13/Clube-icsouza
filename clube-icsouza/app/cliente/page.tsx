import { redirect } from "next/navigation";
import { getDashboardData } from "@/app/actions/client";
import ClientDashboard from "./ClientDashboard";

export default async function ClientePage() {
  const data = await getDashboardData();
  if (!data) redirect("/");

  return <ClientDashboard initialData={data} />;
}
