/**
 * Flexible Google Sheets Parsing System
 * 
 * This module provides a factory pattern for parsing different types of sheets
 * with different configurations based on sheet structure and type.
 */

import { GoogleSpreadsheetWorksheet } from "google-spreadsheet"
import { SupabaseClient } from "@supabase/supabase-js"
import { BaseParser, ParserConfig, ParserResult } from "./base-parser"
import { TeamsParser } from "./teams-parser"
import { DraftParser } from "./draft-parser"
import { DraftPoolParser } from "./draft-pool-parser"
import { MatchesParser } from "./matches-parser"
import { MasterDataParser } from "./master-data-parser"
import { TeamPageParser } from "./team-page-parser"
import { RulesParser } from "./rules-parser"
import { GenericParser } from "./generic-parser"

export interface SheetParsingConfig {
  parser_type: "teams" | "draft" | "draft_pool" | "matches" | "master_data" | "team_page" | "rules" | "generic"
  table_name: string
  use_ai: boolean
  column_mapping?: Record<string, string>
  special_handling?: string[]
  has_headers?: boolean
  range?: string
}

/**
 * Parser Factory - Creates appropriate parser based on configuration
 */
export class ParserFactory {
  static createParser(
    config: SheetParsingConfig,
    sheet: GoogleSpreadsheetWorksheet,
    supabase: SupabaseClient
  ): BaseParser {
    switch (config.parser_type) {
      case "teams":
        return new TeamsParser(sheet, supabase, config)
      
      case "draft":
        return new DraftParser(sheet, supabase, config)
      
      case "draft_pool":
        return new DraftPoolParser(sheet, supabase, config)
      
      case "matches":
        return new MatchesParser(sheet, supabase, config)
      
      case "master_data":
        return new MasterDataParser(sheet, supabase, config)
      
      case "team_page":
        return new TeamPageParser(sheet, supabase, config)
      
      case "rules":
        return new RulesParser(sheet, supabase, config)
      
      case "generic":
      default:
        return new GenericParser(sheet, supabase, config)
    }
  }
}

/**
 * Helper function to create a parser (convenience wrapper)
 */
export function createParser(
  parserType: SheetParsingConfig["parser_type"],
  sheet: GoogleSpreadsheetWorksheet,
  supabase: SupabaseClient,
  config: Partial<SheetParsingConfig> = {}
): BaseParser {
  const fullConfig: SheetParsingConfig = {
    parser_type: parserType,
    table_name: config.table_name || "unknown",
    use_ai: config.use_ai || false,
    column_mapping: config.column_mapping || {},
    special_handling: config.special_handling || [],
    has_headers: config.has_headers !== false,
    range: config.range,
    ...config,
  }

  return ParserFactory.createParser(fullConfig, sheet, supabase)
}

export { BaseParser, ParserConfig, ParserResult }
export { TeamsParser, DraftParser, DraftPoolParser, MatchesParser, MasterDataParser, TeamPageParser, RulesParser, GenericParser }
