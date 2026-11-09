"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  WORKER_TICK_DISABLED_CODE,
  advanceRun,
  classifyAccess,
  controlRun,
  createRun,
  getRun,
  isStale,
  loadLastRunId,
  resetRun,
  saveLastRunId,
  operatorTick,
  type AccessIssue,
  type AdvanceUnit,
  type ApiFailure,
  type ApiResult,
  type ControlAction,
  type CreateRunBody,
  type CreateRunResponse,
  type RunDetail,
  type RunStatus,
} from "@/lib/season-sim/client-api"

export const AUTO_MAX_ITERATIONS = 40
const AUTO_GAP_MS = 750
const MAX_LOG_ENTRIES = 50

export interface ErrorLogEntry {
  id: number
  at: string
  action: string
  status: number
  code: string | null
  message: string
}

export interface LastResponse {
  action: string
  at: string
  status: number
  body: unknown
}

export interface ConsoleNotice {
  tone: "info" | "warn"
  text: string
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export function useSimConsole() {
  const [detail, setDetail] = useState<RunDetail | null>(null)
  const [lastRunId, setLastRunId] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [autoRunning, setAutoRunning] = useState(false)
  const [autoCount, setAutoCount] = useState(0)
  const [access, setAccess] = useState<AccessIssue | null>(null)
  const [notice, setNotice] = useState<ConsoleNotice | null>(null)
  const [loadError, setLoadError] = useState<ApiFailure | null>(null)
  const [createError, setCreateError] = useState<ApiFailure | null>(null)
  const [createInfo, setCreateInfo] = useState<CreateRunResponse | null>(null)
  const [lastResponse, setLastResponse] = useState<LastResponse | null>(null)
  const [errors, setErrors] = useState<ErrorLogEntry[]>([])

  const autoRef = useRef(false)
  const errorId = useRef(0)

  useEffect(() => {
    setLastRunId(loadLastRunId())
    return () => {
      autoRef.current = false
    }
  }, [])

  const track = useCallback(
    <T,>(action: string, result: ApiResult<T>, captureResponse = true) => {
      const at = new Date().toISOString()
      if (captureResponse) {
        setLastResponse({
          action,
          at,
          status: result.status,
          body: result.ok ? result.data : { error: result.error, code: result.code },
        })
      }
      if (result.ok) {
        setAccess(null)
        return
      }
      setAccess(classifyAccess(result))
      setErrors((prev) =>
        [
          {
            id: ++errorId.current,
            at,
            action,
            status: result.status,
            code: result.code,
            message: result.error,
          },
          ...prev,
        ].slice(0, MAX_LOG_ENTRIES),
      )
    },
    [],
  )

  const refresh = useCallback(
    async (runId: string) => {
      const result = await getRun(runId)
      track("GET run", result, false)
      if (result.ok) {
        setDetail(result.data)
        setLoadError(null)
      } else {
        setLoadError(result)
      }
      return result
    },
    [track],
  )

  const loadRun = useCallback(
    async (rawId: string) => {
      const runId = rawId.trim()
      if (!runId) return false
      setPending("load")
      setNotice(null)
      try {
        const result = await refresh(runId)
        if (result.ok) {
          saveLastRunId(runId)
          setLastRunId(runId)
        }
        return result.ok
      } finally {
        setPending(null)
      }
    },
    [refresh],
  )

  const create = useCallback(
    async (body: CreateRunBody) => {
      setPending("create")
      setNotice(null)
      setCreateError(null)
      try {
        const result = await createRun(body)
        track("create run", result)
        if (!result.ok) {
          setCreateError(result)
          return false
        }
        const runId = result.data.run.run_id
        setCreateInfo(result.data)
        saveLastRunId(runId)
        setLastRunId(runId)
        await refresh(runId)
        return true
      } finally {
        setPending(null)
      }
    },
    [refresh, track],
  )

  const handleCommandFailure = useCallback(
    async (runId: string, failure: ApiFailure) => {
      if (isStale(failure)) {
        setNotice({
          tone: "warn",
          text: "This practice season changed since the page loaded. It was reloaded. Review it, then try that action again.",
        })
        await refresh(runId)
      } else if (failure.code === WORKER_TICK_DISABLED_CODE) {
        setNotice({
          tone: "warn",
          text: "Simulating is turned off here. You can still review the practice season. The exact reason is in Technical details.",
        })
      } else {
        setNotice({
          tone: "warn",
          text: "That did not go through. Review the season and try again. The exact reason is in Technical details.",
        })
      }
    },
    [refresh],
  )

  const advance = useCallback(
    async (unit: AdvanceUnit, n: number) => {
      if (!detail) return
      const { progress } = detail
      setPending("advance")
      try {
        const result = await advanceRun(progress, unit, n)
        track(`advance ${unit} x${n}`, result)
        if (result.ok) {
          setNotice({
            tone: "info",
            text: "Ready to simulate. Results have not changed yet. Choose Simulate what's ready to play this part.",
          })
          await refresh(progress.run_id)
        } else {
          await handleCommandFailure(progress.run_id, result)
        }
      } finally {
        setPending(null)
      }
    },
    [detail, handleCommandFailure, refresh, track],
  )

  const control = useCallback(
    async (action: ControlAction) => {
      if (!detail) return
      const { progress } = detail
      setPending(action)
      try {
        const result = await controlRun(progress, action)
        track(action, result)
        if (result.ok) {
          let text: string
          switch (action) {
            case "pause":
              text = "Paused. Nothing else will be simulated until you continue."
              break
            case "resume":
              text = "You can continue. Prepare the next part, then simulate it. Results have not changed yet."
              break
            case "cancel":
              text = "This practice season is stopping. Simulate the prepared part once so it can finish stopping."
              break
            default: {
              const _exhaustive: never = action
              text = _exhaustive
            }
          }
          setNotice({ tone: "info", text })
          await refresh(progress.run_id)
        } else {
          await handleCommandFailure(progress.run_id, result)
        }
      } finally {
        setPending(null)
      }
    },
    [detail, handleCommandFailure, refresh, track],
  )

  const reset = useCallback(async () => {
    if (!detail) return false
    const runId = detail.progress.run_id
    setPending("reset")
    try {
      const result = await resetRun(runId)
      track("reset", result)
      if (result.ok) {
        setNotice({
          tone: "info",
          text: "Practice results were cleared. This season will replay from the same repeatable number.",
        })
        await refresh(runId)
        return true
      }
      setNotice({
        tone: "warn",
        text: "The replay did not start. Check the short season code and try again. The exact reason is in Technical details.",
      })
      return false
    } finally {
      setPending(null)
    }
  }, [detail, refresh, track])

  const tickOnce = useCallback(
    async (runId: string): Promise<{ ok: boolean; status: RunStatus | null }> => {
      const tick = await operatorTick(runId)
      track("operator tick", tick)
      if (!tick.ok) {
        await handleCommandFailure(runId, tick)
        return { ok: false, status: null }
      }
      const latest = await refresh(runId)
      return latest.ok
        ? { ok: true, status: latest.data.progress.status }
        : { ok: false, status: null }
    },
    [handleCommandFailure, refresh, track],
  )

  const runWorkerStep = useCallback(async () => {
    if (!detail) return
    setPending("tick")
    setNotice(null)
    try {
      await tickOnce(detail.progress.run_id)
    } finally {
      setPending(null)
    }
  }, [detail, tickOnce])

  const startAutoRun = useCallback(async () => {
    if (!detail || autoRef.current) return
    const runId = detail.progress.run_id
    autoRef.current = true
    setAutoRunning(true)
    setAutoCount(0)
    setNotice(null)
    try {
      for (let i = 1; i <= AUTO_MAX_ITERATIONS && autoRef.current; i++) {
        setAutoCount(i)
        const { ok, status } = await tickOnce(runId)
        if (!ok) break
        if (status !== "running" && status !== "queued") break
        await sleep(AUTO_GAP_MS)
      }
    } finally {
      autoRef.current = false
      setAutoRunning(false)
    }
  }, [detail, tickOnce])

  const stopAutoRun = useCallback(() => {
    autoRef.current = false
  }, [])

  return {
    detail,
    lastRunId,
    busy: pending !== null || autoRunning,
    pending,
    autoRunning,
    autoCount,
    access,
    notice,
    loadError,
    createError,
    createInfo,
    lastResponse,
    errors,
    clearErrors: () => setErrors([]),
    dismissNotice: () => setNotice(null),
    loadRun,
    create,
    advance,
    control,
    reset,
    runWorkerStep,
    startAutoRun,
    stopAutoRun,
  }
}
