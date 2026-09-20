import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in · ClientForge" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  const sp = await searchParams;

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="logo">ClientForge</div>
        <h1>Sign in</h1>
        <p className="sub">Outreach CRM for UK · US · UAE client acquisition.</p>
        <LoginForm next={sp?.next} initialError={sp?.error} />
      </div>
    </div>
  );
}
