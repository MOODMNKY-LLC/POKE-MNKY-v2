/**
 * Generic Parser
 * Fallback parser for unknown or generic sheet types
 */

import { BaseParser, ParserConfig, ParserResult } from "./base-parser"

export class GenericParser extends BaseParser {
  async parse(): Promise<ParserResult> {
    this.log(`Parsing generic data from sheet "${this.sheet.title}"`)
    
    // Generic parser attempts to extract data using column mapping
    // Falls back to AI if no mapping is available
    
    // TODO: Implement generic parsing logic
    this.warn("Generic parser not yet implemented")
    
    return {
      success: false,
      recordsProcessed: 0,
      errors: ["Generic parser not yet implemented"],
      warnings: this.warnings,
    }
  }
}
