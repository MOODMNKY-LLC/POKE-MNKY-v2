"use client"

import useSWR from "swr"

const STATUS_URL = "/api/sync/notion/status?limit=1"

/** Fail closed: any error or non-true value means the pull controls stay hidden. */
async function fetchPullSyncEnabled(url: string): Promise<boolean> {
  try {
    const res = await fetch(url)
    if (!res.ok) return false
    const data = await res.json()
    return data?.pull_sync_enabled === true
  } catch {
    return false
  }
}

/** Returns true only once the server has confirmed Notion -> app pull sync is enabled. */
export function usePullSyncEnabled(): boolean {
  const { data } = useSWR<boolean>(STATUS_URL, fetchPullSyncEnabled, {
    revalidateOnFocus: false,
  })
  return data === true
}
