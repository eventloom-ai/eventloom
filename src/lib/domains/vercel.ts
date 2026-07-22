import { env } from "@/lib/env";

function credentials() {
  const token = env.vercelApiToken();
  const projectId = env.vercelProjectId();
  if (!token || !projectId) return null;
  return { token, projectId, teamId: env.vercelTeamId() };
}

function projectUrl(path: string, input: NonNullable<ReturnType<typeof credentials>>) {
  const url = new URL(`https://api.vercel.com${path}`);
  if (input.teamId) url.searchParams.set("teamId", input.teamId);
  return url;
}

async function isAlreadyAttached(domain: string, input: NonNullable<ReturnType<typeof credentials>>) {
  const url = projectUrl(`/v9/projects/${input.projectId}/domains/${encodeURIComponent(domain)}`, input);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${input.token}` } });
  return response.ok;
}

async function preferredIpv4(domain: string, input: NonNullable<ReturnType<typeof credentials>>) {
  const url = projectUrl(`/v6/domains/${encodeURIComponent(domain)}/config`, input);
  url.searchParams.set("projectIdOrName", input.projectId);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${input.token}` } });
  if (!response.ok) return null;

  const config = (await response.json().catch(() => null)) as {
    recommendedIPv4?: Array<{ rank?: number; value?: string[] }>;
  } | null;
  return config?.recommendedIPv4
    ?.slice()
    .sort((left, right) => (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER))[0]
    ?.value?.[0] ?? null;
}

export async function addDomainToVercelProject(domain: string) {
  const input = credentials();
  if (!input) {
    return { ok: false as const, error: "vercel_not_configured" };
  }

  const url = projectUrl(`/v10/projects/${input.projectId}/domains`, input);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: domain }),
  });

  if (!response.ok && !(await isAlreadyAttached(domain, input))) {
    const body = (await response.json().catch(() => null)) as { error?: { code?: string } } | null;
    return { ok: false as const, error: body?.error?.code ? `vercel_domain_${body.error.code}` : `vercel_domain_failed_${response.status}` };
  }

  const ipv4 = await preferredIpv4(domain, input);
  if (!ipv4) return { ok: false as const, error: "vercel_domain_config_missing" };
  return { ok: true as const, ipv4 };
}
