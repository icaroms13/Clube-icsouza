import { createClient } from "@supabase/supabase-js";

// Este cliente usa a SERVICE ROLE KEY e só pode ser importado em código que
// roda no servidor (Server Actions, Route Handlers). Nunca importe este
// arquivo em um componente marcado com "use client".
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Faltam variáveis de ambiente do Supabase. Confira NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
