import { requireActiveUser } from "@/lib/session";
import HimiClient from "./himi-client";

export default async function HimiPage() {
  await requireActiveUser();
  return <HimiClient />;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
