import { redirect } from "next/navigation";
import { loginDemo } from "@/app/actions/auth";

// Acesso oculto: quem souber a URL /demo entra direto como cliente de teste
// (CPF 00000000000), sem afetar dados reais de clientes.
export default async function DemoPage() {
  await loginDemo();
  redirect("/cliente");
}
