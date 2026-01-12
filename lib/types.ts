export interface Team {
  id: string
  name: string
  coach_name: string
  division: string
  conference: string
  wins: number
  losses: number
  differential: number
  strength_of_schedule: number
  logo_url?: string
  created_at: string
  updated_at: string
}

export interface Pokemon {
  id: string
  name: string
  type1?: string
  type2?: string
  created_at: string
}

export interface TeamRoster {
  id: string
  team_id: string
  pokemon_id: string
  draft_round: number
  draft_order: number
  draft_points: number
  created_at: string
  pokemon?: Pokemon
  team?: Team
}

export interface Match {
  id: string
  week: number
  team1_id: string
  team2_id: string
  winner_id?: string
  team1_score: number
  team2_score: number
  differential: number
  is_playoff: boolean
  playoff_round?: string
  played_at?: string
  created_at: string
  team1?: Team
  team2?: Team
  winner?: Team
}

export interface PokemonStat {
  id: string
  match_id: string
  pokemon_id: string
  team_id: string
  kills: number
  created_at: string
  pokemon?: Pokemon
  team?: Team
  match?: Match
}
