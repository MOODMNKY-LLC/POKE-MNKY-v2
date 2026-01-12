// This file will work when deployed to Vercel with proper environment variables

/*
import { google } from "googleapis"

export async function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  })

  const sheets = google.sheets({ version: "v4", auth })
  return sheets
}

export async function fetchSheetData(range: string) {
  const sheets = await getGoogleSheetsClient()
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range,
  })

  return response.data.values || []
}
*/

// Mock implementation for v0 preview
export async function getGoogleSheetsClient() {
  throw new Error("Google Sheets API not available in v0 preview. Deploy to Vercel to use.")
}

export async function fetchSheetData(range: string) {
  throw new Error("Google Sheets API not available in v0 preview. Deploy to Vercel to use.")
}

// Parse CSV-like data from Google Sheets
export function parseTeamData(rows: string[][]) {
  // Skip header rows and parse team data
  const teams = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row[0] || row[0].trim() === "") continue // Skip empty rows

    teams.push({
      name: row[0]?.trim() || "",
      coach_name: row[1]?.trim() || "",
      division: row[2]?.trim() || "",
      conference: row[3]?.trim() || "",
      wins: Number.parseInt(row[4]) || 0,
      losses: Number.parseInt(row[5]) || 0,
      differential: Number.parseInt(row[6]) || 0,
      strength_of_schedule: Number.parseFloat(row[7]) || 0,
    })
  }

  return teams
}

export function parsePokemonData(rows: string[][]) {
  const pokemon = []
  const teamRosters = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row[0] || row[0].trim() === "") continue

    const pokemonName = row[0]?.trim()
    const teamName = row[1]?.trim()
    const draftRound = Number.parseInt(row[2]) || 0
    const draftOrder = Number.parseInt(row[3]) || 0

    if (pokemonName) {
      pokemon.push({
        name: pokemonName,
        type1: row[4]?.trim() || null,
        type2: row[5]?.trim() || null,
      })

      if (teamName) {
        teamRosters.push({
          pokemon_name: pokemonName,
          team_name: teamName,
          draft_round: draftRound,
          draft_order: draftOrder,
        })
      }
    }
  }

  return { pokemon, teamRosters }
}
