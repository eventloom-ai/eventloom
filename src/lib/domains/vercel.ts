import { env } from "@/lib/env";

export async function addDomainToVercelProject(domain: string) {
  const token = env.vercelApiToken();
  const projectId = env.vercelProjectId();
  if (!token || !projectId) {
    return { ok: false as const, error: "vercel_not_configured" };
  }

  const teamId = env.vercelTeamId();
  const url = new URL(`https://api.vercel.com/v10/projects/${projectId}/domains`);
  if (teamId) {
    url.searchParams.set("teamId", teamId);
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: domain }),
  });

  if (!res.ok) {
    return { ok: false as const, error: `vercel_domain_failed_${res.status}` };
  }

  return { ok: true as const };
}
