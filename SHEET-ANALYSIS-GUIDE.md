# Google Sheets Comprehensive Analysis Guide

## Overview

This guide explains how to use the comprehensive Google Sheets analysis system to understand your spreadsheet structure and configure parsing for different sheet types.

## Quick Start

### 1. Run Comprehensive Analysis

Use the analysis endpoint to get a complete breakdown of your spreadsheet:

\`\`\`typescript
// POST /api/admin/google-sheets/analyze
const response = await fetch('/api/admin/google-sheets/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    spreadsheet_id: 'YOUR_SPREADSHEET_ID'
  })
})

const result = await response.json()
\`\`\`

### 2. Review Analysis Results

The response includes:

\`\`\`json
{
  "success": true,
  "spreadsheet_title": "Your Spreadsheet Name",
  "spreadsheet_id": "...",
  "total_sheets": 5,
  "analysis": [
    {
      "sheet_name": "Standings",
      "sheet_index": 0,
      "row_count": 25,
      "column_count": 10,
      "headers": ["Team Name", "Coach", "Wins", "Losses", ...],
      "has_headers": true,
      "structure": {
        "type": "standings",
        "complexity": "structured",
        "patterns": ["fully_populated"],
        "data_types": {
          "Team Name": ["string"],
          "Wins": ["number"],
          ...
        }
      },
      "data_samples": [
        {
          "row_number": 2,
          "cells": [
            { "column": "A", "header": "Team Name", "value": "South Bend Snowflakes", "type": "string" },
            ...
          ],
          "non_empty_count": 8
        },
        ...
      ],
      "parsing_suggestions": {
        "parser_type": "teams",
        "use_ai": false,
        "table_mapping": "teams",
        "column_mapping": {
          "Team Name": "name",
          "Coach": "coach_name",
          "Wins": "wins",
          ...
        },
        "special_handling": []
      }
    },
    ...
  ],
  "summary": {
    "total_sheets": 5,
    "sheet_types": {
      "standings": 1,
      "draft": 1,
      "matches": 1,
      "master_data": 1,
      "team_page": 1
    },
    "parsing_strategies": {
      "teams": 1,
      "draft": 1,
      "matches": 1,
      "master_data": 1,
      "team_page": 1
    },
    "complexity_distribution": {
      "structured": 3,
      "complex": 1,
      "variable": 1
    },
    "ai_required_count": 2,
    "no_headers_count": 1
  }
}
\`\`\`

## Understanding Sheet Types

### Standings Sheets
- **Detected by**: Sheet name contains "standings", "ranking", "leaderboard"
- **Structure**: Usually has headers, structured rows
- **Parser**: `TeamsParser`
- **AI Usage**: Only if headers are invalid or missing

### Draft Sheets
- **Detected by**: Sheet name contains "draft", "roster", "picks"
- **Structure**: Structured data with rounds, picks, teams
- **Parser**: `DraftParser`
- **AI Usage**: Usually not needed (structured data)

### Match Sheets
- **Detected by**: Sheet name contains "match", "battle", "week"
- **Structure**: Match results, scores, teams
- **Parser**: `MatchesParser`
- **AI Usage**: If format is unstructured

### Master Data Sheets
- **Detected by**: Sheet name contains "master", "data", "reference"
- **Structure**: Complex, may contain multiple tables
- **Parser**: `MasterDataParser`
- **AI Usage**: Usually required (complex structures)

### Team Pages
- **Detected by**: Sheet name contains "team" or team-specific data
- **Structure**: Variable, team-specific formats
- **Parser**: `TeamPageParser`
- **AI Usage**: Usually required (variable structures)

## Parsing Configuration

### Automatic Configuration

The analysis automatically suggests:
- **Parser type** based on sheet name and structure
- **Column mapping** based on header patterns
- **AI usage** based on complexity
- **Special handling** flags based on patterns

### Manual Configuration

You can override suggestions in the admin panel:

1. **Select Parser Type**
   - Choose from: teams, draft, matches, master_data, team_page, generic

2. **Map Columns**
   - Map sheet columns to database fields
   - Use suggested mappings or customize

3. **Enable AI Parsing**
   - Toggle AI parsing on/off
   - AI is recommended for unstructured data

4. **Set Special Handling**
   - `no_headers`: Sheet has no header row
   - `single_column`: Data in single column
   - `multi_table_extraction`: Extract multiple tables
   - `extract_team_name_from_sheet`: Extract from sheet name

## Example: Complete Workflow

### Step 1: Analyze Spreadsheet

\`\`\`bash
curl -X POST http://localhost:3000/api/admin/google-sheets/analyze \
  -H "Content-Type: application/json" \
  -d '{"spreadsheet_id": "1wwH5XUHxQnivm90wGtNLQI_g7P3nPi5ZRcbZ3JU3-YQ"}'
\`\`\`

### Step 2: Review Analysis

Check the `summary` section for:
- Total sheets found
- Sheet type distribution
- Parsing strategies needed
- AI requirements

### Step 3: Configure Each Sheet

For each sheet in `analysis`:
1. Review `parsing_suggestions`
2. Verify `column_mapping` is correct
3. Adjust `use_ai` if needed
4. Add `special_handling` flags if needed

### Step 4: Save Configuration

Save the parsing configuration in the admin panel:
- Each sheet gets its own configuration
- Configurations are stored in `sheet_mappings` table
- Can be enabled/disabled individually

### Step 5: Sync Data

Run sync to extract data using configured parsers:
- Each sheet uses its configured parser
- AI parsing is used when configured
- Results are logged for verification

## Common Patterns

### Pattern 1: Standings with Invalid Headers

**Problem**: Sheet has "Week 14" as header instead of column names

**Solution**:
\`\`\`json
{
  "parser_type": "teams",
  "use_ai": true,
  "special_handling": ["no_headers"]
}
\`\`\`

### Pattern 2: Master Data Sheet

**Problem**: Sheet contains multiple data types (teams, matches, rosters)

**Solution**:
\`\`\`json
{
  "parser_type": "master_data",
  "use_ai": true,
  "special_handling": ["multi_table_extraction"]
}
\`\`\`

### Pattern 3: Team-Specific Sheets

**Problem**: Each team has its own sheet with different structure

**Solution**:
\`\`\`json
{
  "parser_type": "team_page",
  "use_ai": true,
  "special_handling": ["extract_team_name_from_sheet"]
}
\`\`\`

## Troubleshooting

### Issue: Analysis Returns Empty Results

**Check**:
- Spreadsheet ID is correct
- Service account has access to spreadsheet
- Spreadsheet is shared with service account email

### Issue: Wrong Parser Type Detected

**Solution**:
- Manually override parser type in configuration
- Check sheet name and headers match expected patterns

### Issue: Column Mapping Incorrect

**Solution**:
- Review `data_samples` in analysis
- Manually map columns in admin panel
- Use AI parsing if structure is too variable

### Issue: AI Parsing Fails

**Check**:
- OpenAI API key is configured
- Sheet has enough data (AI needs at least 5 rows)
- Data is not completely empty

## Best Practices

1. **Run Analysis First**: Always analyze before configuring
2. **Review Suggestions**: Check suggested configurations carefully
3. **Test with Sample Data**: Verify parsing with small datasets first
4. **Use AI When Needed**: Enable AI for unstructured or complex data
5. **Monitor Logs**: Check sync logs for errors and warnings
6. **Iterate**: Adjust configurations based on results

## Next Steps

1. **Run Analysis**: Analyze your spreadsheet to understand structure
2. **Review Results**: Check suggested configurations
3. **Configure Parsers**: Set up parsing for each sheet type
4. **Test Sync**: Run sync and verify data extraction
5. **Refine**: Adjust configurations based on results

## API Reference

### POST `/api/admin/google-sheets/analyze`

**Request**:
\`\`\`json
{
  "spreadsheet_id": "string"
}
\`\`\`

**Response**:
\`\`\`json
{
  "success": true,
  "spreadsheet_title": "string",
  "spreadsheet_id": "string",
  "total_sheets": number,
  "analysis": [...],
  "summary": {...}
}
\`\`\`

## Support

For issues or questions:
1. Check analysis results for clues
2. Review parser logs for errors
3. Verify spreadsheet structure matches expectations
4. Consult `COMPREHENSIVE-SHEET-PARSING-SYSTEM.md` for details
