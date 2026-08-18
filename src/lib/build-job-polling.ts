export function hasRunningBuildJobs(jobs: Array<{ status: string }> | null | undefined) {
  return Boolean(jobs?.some((job) => job.status === "running"));
}
