"use client"

/**
 * Unified Assistant Popup Component
 * 
 * A comprehensive ChatGPT-style floating assistant popup with:
 * - Context-aware agent selection
 * - File uploads
 * - Voice input (STT)
 * - Text-to-speech (TTS)
 * - MCP tool integration toggle
 * - Model selection
 * - Agent mode toggle
 */

import { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { useIsMobile } from "@/hooks/use-mobile"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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
  Upload,
  X,
  Minimize2,
  Maximize2,
  Settings,
  Sparkles,
  Zap,
  ZapOff,
  FileText,
  Image as ImageIcon,
} from "lucide-react"
import { BaseChatInterface } from "./base-chat-interface"
import { detectAssistantContext, type AgentType, getQuickActionsForAgent } from "@/lib/ai/assistant-context"
import { PokeMnkyAssistant } from "@/components/ui/poke-mnky-avatar"
import { cn } from "@/lib/utils"
import { AI_MODELS } from "@/lib/openai-client"

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
}

export function UnifiedAssistantPopup({
  open,
  onOpenChange,
  context = {},
}: UnifiedAssistantPopupProps) {
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const [isMinimized, setIsMinimized] = useState(false)
  const [mcpEnabled, setMcpEnabled] = useState(true)
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>("gpt-5.2")
  const [isRecording, setIsRecording] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null)
  
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  // Detect context from current route
  const detectedContext = detectAssistantContext(pathname, context)
  const currentAgent = selectedAgent || detectedContext.agentType
  const agentContext = selectedAgent 
    ? detectAssistantContext(`/${selectedAgent}`, context)
    : detectedContext

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang = "en-US"
      }
      synthRef.current = window.speechSynthesis
    }
  }, [])

  // Handle voice recording
  const handleStartRecording = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition not supported in this browser")
      return
    }

    setIsRecording(true)
    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      // Send transcript as message (would need to integrate with chat)
      console.log("Voice input:", transcript)
      setIsRecording(false)
    }
    recognitionRef.current.onerror = () => {
      setIsRecording(false)
    }
    recognitionRef.current.start()
  }

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsRecording(false)
    }
  }

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setUploadedFiles((prev) => [...prev, ...files])
  }

  // Handle TTS for assistant messages
  const handleTTS = (text: string) => {
    if (!synthRef.current || !ttsEnabled) return
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0
    synthRef.current.speak(utterance)
  }

  // Get available models based on MCP toggle
  const availableModels = mcpEnabled
    ? [
        { value: "gpt-5.2", label: "GPT-5.2 (Strategy)" },
        { value: "gpt-4.1", label: "GPT-4.1 (Grounded)" },
        { value: "gpt-5-mini", label: "GPT-5 Mini (Fast)" },
      ]
    : [
        { value: "gpt-5.2", label: "GPT-5.2" },
        { value: "gpt-4.1", label: "GPT-4.1" },
        { value: "gpt-5-mini", label: "GPT-5 Mini" },
      ]

  const quickActions = getQuickActionsForAgent(currentAgent)

  const popupContent = (
    <div className="flex flex-col h-full">
      {/* Header - Only show in desktop Dialog */}
      {!isMobile && (
        <div className="border-b pb-3 px-6 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PokeMnkyAssistant size={32} />
              <div>
                <h2 className="text-lg font-semibold">
                  {agentContext.title}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {agentContext.description}
                </p>
              </div>
            </div>
          <div className="flex items-center gap-2">
            {/* Minimize button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(!isMinimized)}
              className={cn(
                "h-10 w-10 min-h-[44px] min-w-[44px]",
                "touch-manipulation active:scale-95"
              )}
              aria-label={isMinimized ? "Expand assistant" : "Minimize assistant"}
            >
              {isMinimized ? (
                <Maximize2 className="h-4 w-4" />
              ) : (
                <Minimize2 className="h-4 w-4" />
              )}
            </Button>
            {/* Settings popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className={cn(
                  "w-[calc(100vw-2rem)] max-w-80",
                  // Mobile optimization
                  "max-h-[calc(100vh-8rem)] overflow-y-auto",
                  // Safe area handling
                  "pb-safe"
                )} 
                align="end"
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Agent Type</Label>
                    <Select
                      value={currentAgent}
                      onValueChange={(value) => setSelectedAgent(value as AgentType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General Assistant</SelectItem>
                        <SelectItem value="draft">Draft Assistant</SelectItem>
                        <SelectItem value="battle-strategy">Battle Strategy</SelectItem>
                        <SelectItem value="free-agency">Free Agency</SelectItem>
                        <SelectItem value="pokedex">Pokédex</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Model</Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="mcp-toggle" className="text-sm font-medium">
                        MCP Tools
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Enable tool calling
                      </p>
                    </div>
                    <Switch
                      id="mcp-toggle"
                      checked={mcpEnabled}
                      onCheckedChange={setMcpEnabled}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="tts-toggle" className="text-sm font-medium">
                        Text-to-Speech
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Read responses aloud
                      </p>
                    </div>
                    <Switch
                      id="tts-toggle"
                      checked={ttsEnabled}
                      onCheckedChange={setTtsEnabled}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        {/* Status badges */}
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="text-xs">
            {currentAgent === "general" ? "General" : currentAgent.replace("-", " ")}
          </Badge>
          {mcpEnabled && (
            <Badge variant="outline" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              MCP Enabled
            </Badge>
          )}
          {uploadedFiles.length > 0 && (
            <Badge variant="outline" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              {uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        </div>
      )}

      {/* Chat Interface */}
      {!isMinimized && (
        <div className="flex-1 overflow-hidden">
          <BaseChatInterface
            apiEndpoint={agentContext.apiEndpoint}
            title=""
            description=""
            characterPalette={agentContext.characterPalette}
            showCharacter={false}
            body={{
              ...agentContext.context,
              model: selectedModel,
              mcpEnabled,
              files: uploadedFiles.map((f) => ({
                name: f.name,
                type: f.type,
                size: f.size,
              })),
            }}
            emptyStateTitle={`Welcome to ${agentContext.title}`}
            emptyStateDescription={agentContext.description}
            className="h-full"
            quickActions={quickActions.map((action) => ({
              label: action.label,
              prompt: action.prompt,
            }))}
            onSendMessageReady={setSendMessageFn}
          />
        </div>
      )}

      {/* Input Area with Controls */}
      {!isMinimized && (
        <div className="border-t p-3 space-y-2">
          {/* File uploads display */}
          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {uploadedFiles.map((file, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {file.type.startsWith("image/") ? (
                    <ImageIcon className="h-3 w-3 mr-1" />
                  ) : (
                    <FileText className="h-3 w-3 mr-1" />
                  )}
                  {file.name}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 -mr-1"
                    onClick={() =>
                      setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
                    }
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
          {/* Control buttons */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              multiple
              onChange={handleFileUpload}
              accept="image/*,application/pdf,.txt,.doc,.docx"
            />
            <label htmlFor="file-upload" className="touch-manipulation">
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "h-10 w-10 min-h-[44px] min-w-[44px]",
                  "touch-manipulation active:scale-95"
                )}
                aria-label="Upload file"
              >
                <Upload className="h-5 w-5" />
              </Button>
            </label>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10 min-h-[44px] min-w-[44px]",
                "touch-manipulation active:scale-95",
                isRecording && "text-destructive"
              )}
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              aria-label={isRecording ? "Stop recording" : "Start voice input"}
            >
              {isRecording ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10 min-h-[44px] min-w-[44px]",
                "touch-manipulation active:scale-95",
                ttsEnabled && "text-primary"
              )}
              onClick={() => setTtsEnabled(!ttsEnabled)}
              aria-label={ttsEnabled ? "Disable text-to-speech" : "Enable text-to-speech"}
            >
              {ttsEnabled ? (
                <Volume2 className="h-5 w-5" />
              ) : (
                <VolumeX className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="bottom" 
          className={cn(
            "h-[calc(100vh-env(safe-area-inset-bottom))] max-h-[90vh] p-0 flex flex-col",
            // PWA safe area handling
            "pb-[max(0px,env(safe-area-inset-bottom))]",
            // Better mobile experience
            "touch-pan-y overscroll-contain"
          )}
        >
          <SheetHeader className="border-b pb-3 px-4 pt-safe">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PokeMnkyAssistant size={32} />
                <div>
                  <SheetTitle className="text-lg font-semibold">
                    {agentContext.title}
                  </SheetTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {agentContext.description}
                  </p>
                </div>
              </div>
            </div>
            {/* Status badges */}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {currentAgent === "general" ? "General" : currentAgent.replace("-", " ")}
              </Badge>
              {mcpEnabled && (
                <Badge variant="outline" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  MCP Enabled
                </Badge>
              )}
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
        className={cn(
          "max-w-4xl h-[85vh] p-0 flex flex-col",
          // Desktop optimization
          "max-h-[calc(100vh-4rem)]",
          // PWA safe area
          "pb-safe"
        )}
      >
        {popupContent}
      </DialogContent>
    </Dialog>
  )
}

// Extend Window interface for Speech Recognition
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}
