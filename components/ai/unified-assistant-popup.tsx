"use client"

/**
 * Ask POKE MNKY chat.
 * Desktop opens a dialog. Phones open a sheet. The live path is OpenClaw,
 * so model menus, tool toggles, and file upload are not shown.
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { usePathname } from "next/navigation"
import { useIsMobile } from "@/hooks/use-mobile"
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Minimize2,
  Maximize2,
  Settings,
  XIcon,
} from "lucide-react"
import { BaseChatInterface } from "./base-chat-interface"
import { AabKnowledgePanel } from "./aab-knowledge-panel"
import { useLeagueChatAvailable } from "./openai-availability"
import { AI_CHAT_UNAVAILABLE_MESSAGE, leagueChatDockMode } from "@/lib/ai/league-chat-dock"
import { detectAssistantContext, type AgentType, getQuickActionsForAgent } from "@/lib/ai/assistant-context"
import { PokeMnkyPremium } from "@/components/ui/poke-mnky-avatar"
import { cn } from "@/lib/utils"

interface UnifiedAssistantPopupProps {
  /** Whether popup is open */
  open: boolean
  /** Callback when popup closes */
  onOpenChange: (open: boolean) => void
  /** Additional context data */
  context?: {
    teamId?: string | null
    seasonId?: string | null
    selectedPokemon?: string | null
    team1Id?: string | null
    team2Id?: string | null
    matchId?: string | null
  }
  /** Whether user is authenticated */
  isAuthenticated?: boolean
  knowledgeEnabled?: boolean
}

const touchTarget = "h-11 w-11 min-h-11 min-w-11 touch-manipulation active:scale-95"

export function UnifiedAssistantPopup({
  open,
  onOpenChange,
  context = {},
  isAuthenticated = false,
  knowledgeEnabled = false,
}: UnifiedAssistantPopupProps) {
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const leagueChatAvailable = useLeagueChatAvailable()
  const dockMode = leagueChatDockMode({ leagueChatAvailable, knowledgeEnabled })
  const [isMinimized, setIsMinimized] = useState(false)
  const [readAloud, setReadAloud] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null)
  const sendMessageFnRef = useRef<((message: { text: string }) => void) | null>(null)
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  const detectedContext = detectAssistantContext(pathname, context)
  const currentAgent = selectedAgent || detectedContext.agentType
  const agentContext = selectedAgent
    ? detectAssistantContext(`/${selectedAgent}`, context)
    : detectedContext

  useEffect(() => {
    if (typeof window === "undefined") return
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognitionCtor) {
      recognitionRef.current = new SpeechRecognitionCtor()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = "en-US"
    }
    synthRef.current = window.speechSynthesis
  }, [])

  const handleStartRecording = () => {
    if (!recognitionRef.current) {
      window.alert("Voice input is not available in this browser.")
      return
    }

    setIsRecording(true)
    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      if (sendMessageFnRef.current && transcript.trim()) {
        sendMessageFnRef.current({ text: transcript })
      }
      setIsRecording(false)
    }
    recognitionRef.current.onerror = () => {
      setIsRecording(false)
    }
    recognitionRef.current.start()
  }

  const handleStopRecording = () => {
    recognitionRef.current?.stop()
    setIsRecording(false)
  }

  const speakReply = useCallback((text: string) => {
    if (!synthRef.current || !readAloud || !text.trim()) return
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1
    utterance.pitch = 1
    utterance.volume = 1
    synthRef.current.cancel()
    synthRef.current.speak(utterance)
  }, [readAloud])

  const quickActions = getQuickActionsForAgent(currentAgent)

  const popupContent = (
    <div className="flex flex-col h-full">
      {!isMobile && (
        <div className="border-b pb-3 px-6 pt-6 pe-16 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PokeMnkyPremium size={48} />
              <div>
                <h2 className="text-lg font-semibold">POKE MNKY</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {agentContext.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(!isMinimized)}
                className={touchTarget}
                aria-label={!isMinimized ? "Expand to fullscreen" : "Minimize to normal size"}
              >
                {!isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              {isAuthenticated && (
                <AssistantSettings
                  currentAgent={currentAgent}
                  onAgentChange={setSelectedAgent}
                />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs bg-background text-foreground border-border">
              Assistant
            </Badge>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
        <AabKnowledgePanel enabled={knowledgeEnabled} />
        {dockMode === "unavailable" ? (
          <p role="status" className="px-4 py-6 text-sm text-muted-foreground">
            {AI_CHAT_UNAVAILABLE_MESSAGE}
          </p>
        ) : null}
        {dockMode === "chat" ? (
          <BaseChatInterface
            key={agentContext.apiEndpoint || "/api/ai/assistant"}
            apiEndpoint={agentContext.apiEndpoint || "/api/ai/assistant"}
            title=""
            description=""
            characterPalette={agentContext.characterPalette}
            showCharacter={false}
            body={agentContext.context}
            emptyStateTitle="Welcome to POKE MNKY"
            emptyStateDescription={
              isAuthenticated
                ? agentContext.description
                : `${agentContext.description} Sign in for draft help and team tools.`
            }
            className="h-full"
            quickActions={quickActions.map((action) => ({
              label: action.label,
              prompt: action.prompt,
            }))}
            onSendMessageReady={(fn) => {
              sendMessageFnRef.current = fn
            }}
            onAssistantText={speakReply}
            footerActions={
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  className={cn(touchTarget, isRecording && "text-destructive")}
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  aria-label={isRecording ? "Stop speaking" : "Speak your question"}
                >
                  {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  className={cn(touchTarget, readAloud && "text-primary")}
                  onClick={() => {
                    if (readAloud) synthRef.current?.cancel()
                    setReadAloud((current) => !current)
                  }}
                  aria-pressed={readAloud}
                  aria-label={readAloud ? "Stop reading replies aloud" : "Read replies aloud"}
                >
                  {readAloud ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </Button>
              </>
            }
          />
        ) : null}
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className={cn(
            "h-[calc(100vh-env(safe-area-inset-bottom))] max-h-[90vh] p-0 flex flex-col",
            "pb-[max(0px,env(safe-area-inset-bottom))]",
            "touch-pan-y overscroll-contain"
          )}
        >
          <SheetHeader className="border-b pb-3 px-4 pt-safe pe-16">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PokeMnkyPremium size={48} />
                <div>
                  <SheetTitle className="text-lg font-semibold">POKE MNKY</SheetTitle>
                  <SheetDescription className="sr-only">
                    {agentContext.description || "Help from POKE MNKY"}
                  </SheetDescription>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {agentContext.description}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs bg-background text-foreground border-border">
                Assistant
              </Badge>
            </div>
          </SheetHeader>
          {popupContent}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "p-0 flex flex-col",
          !isMinimized
            ? "max-w-4xl h-[85vh] max-h-[calc(100vh-4rem)]"
            : "!w-[calc(100vw-1.5rem)] !h-[calc(100vh-1.5rem)] !max-w-[calc(100vw-1.5rem)] !max-h-[calc(100vh-1.5rem)] sm:!max-w-[calc(100vw-1.5rem)] md:!max-w-[calc(100vw-1.5rem)] lg:!max-w-[calc(100vw-1.5rem)]",
          "pb-safe"
        )}
      >
        <DialogTitle className="sr-only">POKE MNKY</DialogTitle>
        <DialogDescription className="sr-only">
          {agentContext.description || "Help from POKE MNKY"}
        </DialogDescription>
        <DialogClose
          className="absolute top-3 right-3 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-md text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
        {popupContent}
      </DialogContent>
    </Dialog>
  )
}

function AssistantSettings({
  currentAgent,
  onAgentChange,
}: {
  currentAgent: AgentType
  onAgentChange: (agent: AgentType) => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={touchTarget} aria-label="Assistant settings">
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] max-w-80" align="end">
        <div className="space-y-2">
          <Label className="text-sm font-medium" htmlFor="assistant-kind">
            What kind of help
          </Label>
          <Select value={currentAgent} onValueChange={(value) => onAgentChange(value as AgentType)}>
            <SelectTrigger id="assistant-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General help</SelectItem>
              <SelectItem value="draft">Draft help</SelectItem>
              <SelectItem value="battle-strategy">Battle strategy</SelectItem>
              <SelectItem value="free-agency">Free agency</SelectItem>
              <SelectItem value="pokedex">Pokédex</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  )
}

type BrowserSpeechRecognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionCtor
    webkitSpeechRecognition?: BrowserSpeechRecognitionCtor
  }
}
