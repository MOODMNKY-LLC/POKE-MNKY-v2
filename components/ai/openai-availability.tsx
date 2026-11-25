"use client"

import { createContext, useContext, type ReactNode } from "react"

const OpenAIConfiguredContext = createContext(true)
const LeagueChatAvailableContext = createContext(true)

export function AiAvailabilityProvider({
  openaiConfigured,
  leagueChatAvailable,
  children,
}: {
  openaiConfigured: boolean
  leagueChatAvailable: boolean
  children: ReactNode
}) {
  return (
    <OpenAIConfiguredContext.Provider value={openaiConfigured}>
      <LeagueChatAvailableContext.Provider value={leagueChatAvailable}>
        {children}
      </LeagueChatAvailableContext.Provider>
    </OpenAIConfiguredContext.Provider>
  )
}

export function useOpenAIConfigured(): boolean {
  return useContext(OpenAIConfiguredContext)
}

export function useLeagueChatAvailable(): boolean {
  return useContext(LeagueChatAvailableContext)
}
