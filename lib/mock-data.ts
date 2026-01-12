// Mock data for v0 preview - mirrors the structure from the Google Sheets CSV
// This allows the app to work in preview mode before deploying with real Google Sheets API

export const mockTeams = [
  {
    id: 1,
    name: "South Bend Snowflakes",
    coach: "Pup",
    division: "Hoenn",
    conference: "Leon",
    wins: 10,
    losses: 1,
    differential: 5,
  },
  {
    id: 2,
    name: "Kalamazoo Kangaskhans",
    coach: "Andy W",
    division: "Sinnoh",
    conference: "Leon",
    wins: 9,
    losses: 2,
    differential: 7,
  },
  {
    id: 3,
    name: "Krazy Kecleons",
    coach: "Bfarias",
    division: "Johto",
    conference: "Lance",
    wins: 8,
    losses: 3,
    differential: 11,
  },
  {
    id: 4,
    name: "Montana Meganiums",
    coach: "Krampe",
    division: "Johto",
    conference: "Lance",
    wins: 8,
    losses: 3,
    differential: 5,
  },
  {
    id: 5,
    name: "Grand Rapids Garchomp",
    coach: "Matt",
    division: "Kanto",
    conference: "Lance",
    wins: 7,
    losses: 4,
    differential: -1,
  },
  {
    id: 6,
    name: "Daycare Dittos",
    coach: "PokeGoat",
    division: "Sinnoh",
    conference: "Leon",
    wins: 7,
    losses: 4,
    differential: 1,
  },
  {
    id: 7,
    name: "Boise State Mudsdales",
    coach: "Fouster",
    division: "Johto",
    conference: "Lance",
    wins: 7,
    losses: 4,
    differential: 0,
  },
  {
    id: 8,
    name: "Manchester Milcerys",
    coach: "ShameWall",
    division: "Sinnoh",
    conference: "Leon",
    wins: 7,
    losses: 4,
    differential: 7,
  },
  {
    id: 9,
    name: "Leicester Lycanrocs",
    coach: "Bok Choy",
    division: "Johto",
    conference: "Lance",
    wins: 6,
    losses: 5,
    differential: -6,
  },
  {
    id: 10,
    name: "Detroit Drakes",
    coach: "Zach",
    division: "Kanto",
    conference: "Lance",
    wins: 6,
    losses: 5,
    differential: 2,
  },
  {
    id: 11,
    name: "Tegucigalpa Dragonites",
    coach: "Gabe",
    division: "Sinnoh",
    conference: "Leon",
    wins: 6,
    losses: 5,
    differential: 5,
  },
  {
    id: 12,
    name: "Miami Blazins",
    coach: "Ary",
    division: "Hoenn",
    conference: "Leon",
    wins: 5,
    losses: 6,
    differential: -11,
  },
  {
    id: 13,
    name: "Garden City Grimmsnarl",
    coach: "Bryce",
    division: "Kanto",
    conference: "Lance",
    wins: 5,
    losses: 6,
    differential: -7,
  },
  {
    id: 14,
    name: "Rockslide Rebels",
    coach: "DevXP",
    division: "Hoenn",
    conference: "Leon",
    wins: 4,
    losses: 7,
    differential: 1,
  },
  {
    id: 15,
    name: "ToneBone Troublemakers",
    coach: "Tony",
    division: "Hoenn",
    conference: "Leon",
    wins: 4,
    losses: 7,
    differential: 1,
  },
  {
    id: 16,
    name: "Jackson Jigglies",
    coach: "Mark",
    division: "Sinnoh",
    conference: "Leon",
    wins: 4,
    losses: 6,
    differential: -3,
  },
  {
    id: 17,
    name: "Arkansas Fighting Hogs",
    coach: "Jordan",
    division: "Kanto",
    conference: "Lance",
    wins: 3,
    losses: 8,
    differential: -7,
  },
  {
    id: 18,
    name: "Team 9",
    coach: "Dandelion",
    division: "Kanto",
    conference: "Lance",
    wins: 3,
    losses: 7,
    differential: -4,
  },
  {
    id: 19,
    name: "Liverpool Lunalas",
    coach: "Harry",
    division: "Hoenn",
    conference: "Leon",
    wins: 0,
    losses: 10,
    differential: -3,
  },
  {
    id: 20,
    name: "Team 14",
    coach: "Simeon (Mod)",
    division: "Kanto",
    conference: "Lance",
    wins: 0,
    losses: 10,
    differential: -3,
  },
]

export const mockPokemon = [
  // Grand Rapids Garchomp roster
  { id: 1, name: "Great Tusk", team_id: 5, draft_round: 1, draft_order: 5 },
  { id: 2, name: "Ogerpon Hearthflame", team_id: 5, draft_round: 2, draft_order: 5 },
  { id: 3, name: "Latios", team_id: 5, draft_round: 3, draft_order: 5 },
  { id: 4, name: "Cresselia", team_id: 5, draft_round: 4, draft_order: 5 },
  { id: 5, name: "Entei", team_id: 5, draft_round: 5, draft_order: 5 },
  { id: 6, name: "Clodsire", team_id: 5, draft_round: 6, draft_order: 5 },
  { id: 7, name: "Clefable", team_id: 5, draft_round: 7, draft_order: 5 },
  { id: 8, name: "Vaporeon", team_id: 5, draft_round: 8, draft_order: 5 },
  { id: 9, name: "Thwackey", team_id: 5, draft_round: 9, draft_order: 5 },

  // South Bend Snowflakes roster
  { id: 10, name: "Deoxys", team_id: 1, draft_round: 1, draft_order: 15 },
  { id: 11, name: "Alomomola", team_id: 1, draft_round: 2, draft_order: 15 },
  { id: 12, name: "Darkrai", team_id: 1, draft_round: 3, draft_order: 15 },
  { id: 13, name: "Salamence", team_id: 1, draft_round: 4, draft_order: 15 },
  { id: 14, name: "Terapagos", team_id: 1, draft_round: 5, draft_order: 15 },
  { id: 15, name: "Fezandipiti", team_id: 1, draft_round: 6, draft_order: 15 },
  { id: 16, name: "Ceruledge", team_id: 1, draft_round: 7, draft_order: 15 },
  { id: 17, name: "Araquanid", team_id: 1, draft_round: 8, draft_order: 15 },
  { id: 18, name: "Tentacruel", team_id: 1, draft_round: 9, draft_order: 15 },
  { id: 19, name: "Tauros", team_id: 1, draft_round: 10, draft_order: 15 },

  // Kalamazoo Kangaskhans roster
  { id: 20, name: "Garchomp", team_id: 2, draft_round: 1, draft_order: 20 },
  { id: 21, name: "Meowscarada", team_id: 2, draft_round: 2, draft_order: 20 },
  { id: 22, name: "Urshifu Single Strike", team_id: 2, draft_round: 3, draft_order: 20 },
  { id: 23, name: "Slowking Galarian", team_id: 2, draft_round: 4, draft_order: 20 },
  { id: 24, name: "Volcarona", team_id: 2, draft_round: 5, draft_order: 20 },
  { id: 25, name: "Maushold", team_id: 2, draft_round: 6, draft_order: 20 },
  { id: 26, name: "Raikou", team_id: 2, draft_round: 7, draft_order: 20 },
  { id: 27, name: "Blissey", team_id: 2, draft_round: 8, draft_order: 20 },

  // Detroit Drakes roster
  { id: 28, name: "Landorus Therian", team_id: 10, draft_round: 2, draft_order: 17 },
  { id: 29, name: "Ogerpon", team_id: 10, draft_round: 3, draft_order: 17 },
  { id: 30, name: "Slither Wing", team_id: 10, draft_round: 4, draft_order: 17 },
  { id: 31, name: "Torkoal", team_id: 10, draft_round: 5, draft_order: 17 },
  { id: 32, name: "Vikavolt", team_id: 10, draft_round: 6, draft_order: 17 },
  { id: 33, name: "Scream Tail", team_id: 10, draft_round: 7, draft_order: 17 },
  { id: 34, name: "Jirachi", team_id: 10, draft_round: 8, draft_order: 17 },
  { id: 35, name: "Feraligatr", team_id: 10, draft_round: 9, draft_order: 17 },

  // Manchester Milcerys roster
  { id: 36, name: "Cinderace", team_id: 8, draft_round: 1, draft_order: 12 },
  { id: 37, name: "Ribombee", team_id: 8, draft_round: 2, draft_order: 12 },
  { id: 38, name: "Iron Crown", team_id: 8, draft_round: 3, draft_order: 12 },
  { id: 39, name: "Pecharunt", team_id: 8, draft_round: 4, draft_order: 12 },
  { id: 40, name: "Lilligant", team_id: 8, draft_round: 5, draft_order: 12 },
  { id: 41, name: "Kyurem", team_id: 8, draft_round: 6, draft_order: 12 },
  { id: 42, name: "Suicune", team_id: 8, draft_round: 7, draft_order: 12 },
  { id: 43, name: "Heracross", team_id: 8, draft_round: 8, draft_order: 12 },
  { id: 44, name: "Morgrem", team_id: 8, draft_round: 9, draft_order: 12 },
  { id: 45, name: "Muk", team_id: 8, draft_round: 10, draft_order: 12 },
]

export const mockMatches = [
  // Week 1
  { id: 1, week: 1, team1_id: 1, team2_id: 17, team1_score: 3, team2_score: 2, winner_id: 1, differential: 1 },
  { id: 2, week: 1, team1_id: 9, team2_id: 7, team1_score: 2, team2_score: 3, winner_id: 7, differential: 1 },
  { id: 3, week: 1, team1_id: 6, team2_id: 11, team1_score: 4, team2_score: 1, winner_id: 6, differential: 3 },
  { id: 4, week: 1, team1_id: 5, team2_id: 10, team1_score: 3, team2_score: 3, winner_id: null, differential: 0 },
  { id: 5, week: 1, team1_id: 2, team2_id: 4, team1_score: 4, team2_score: 2, winner_id: 2, differential: 2 },
  { id: 6, week: 1, team1_id: 8, team2_id: 16, team1_score: 3, team2_score: 1, winner_id: 8, differential: 2 },

  // Week 2
  { id: 7, week: 2, team1_id: 1, team2_id: 12, team1_score: 4, team2_score: 1, winner_id: 1, differential: 3 },
  { id: 8, week: 2, team1_id: 2, team2_id: 14, team1_score: 3, team2_score: 2, winner_id: 2, differential: 1 },
  { id: 9, week: 2, team1_id: 3, team2_id: 8, team1_score: 2, team2_score: 3, winner_id: 8, differential: 1 },
  { id: 10, week: 2, team1_id: 4, team2_id: 11, team1_score: 4, team2_score: 2, winner_id: 4, differential: 2 },

  // Week 14 (Playoffs - Round 1)
  {
    id: 54,
    week: 11,
    team1_id: 1,
    team2_id: 17,
    team1_score: 3,
    team2_score: 1,
    winner_id: 1,
    differential: 2,
    is_playoff: true,
    playoff_round: 1,
  },
  {
    id: 55,
    week: 11,
    team1_id: 9,
    team2_id: 7,
    team1_score: 2,
    team2_score: 3,
    winner_id: 7,
    differential: 1,
    is_playoff: true,
    playoff_round: 1,
  },
  {
    id: 56,
    week: 11,
    team1_id: 6,
    team2_id: 11,
    team1_score: 2,
    team2_score: 3,
    winner_id: 11,
    differential: 1,
    is_playoff: true,
    playoff_round: 1,
  },
  {
    id: 57,
    week: 11,
    team1_id: 5,
    team2_id: 10,
    team1_score: 1,
    team2_score: 3,
    winner_id: 10,
    differential: 2,
    is_playoff: true,
    playoff_round: 1,
  },
  {
    id: 58,
    week: 11,
    team1_id: 14,
    team2_id: 2,
    team1_score: 2,
    team2_score: 4,
    winner_id: 2,
    differential: 2,
    is_playoff: true,
    playoff_round: 1,
  },
  {
    id: 59,
    week: 11,
    team1_id: 13,
    team2_id: 8,
    team1_score: 1,
    team2_score: 3,
    winner_id: 8,
    differential: 2,
    is_playoff: true,
    playoff_round: 1,
  },
  {
    id: 60,
    week: 11,
    team1_id: 12,
    team2_id: 3,
    team1_score: 2,
    team2_score: 4,
    winner_id: 3,
    differential: 2,
    is_playoff: true,
    playoff_round: 1,
  },
  {
    id: 61,
    week: 11,
    team1_id: 15,
    team2_id: 4,
    team1_score: 1,
    team2_score: 3,
    winner_id: 4,
    differential: 2,
    is_playoff: true,
    playoff_round: 1,
  },

  // Quarterfinals
  {
    id: 62,
    week: 12,
    team1_id: 1,
    team2_id: 7,
    team1_score: 4,
    team2_score: 2,
    winner_id: 1,
    differential: 2,
    is_playoff: true,
    playoff_round: 2,
  },
  {
    id: 63,
    week: 12,
    team1_id: 10,
    team2_id: 11,
    team1_score: 3,
    team2_score: 2,
    winner_id: 10,
    differential: 1,
    is_playoff: true,
    playoff_round: 2,
  },
  {
    id: 64,
    week: 12,
    team1_id: 8,
    team2_id: 2,
    team1_score: 3,
    team2_score: 2,
    winner_id: 8,
    differential: 1,
    is_playoff: true,
    playoff_round: 2,
  },
  {
    id: 65,
    week: 12,
    team1_id: 3,
    team2_id: 4,
    team1_score: 2,
    team2_score: 4,
    winner_id: 4,
    differential: 2,
    is_playoff: true,
    playoff_round: 2,
  },

  // Semifinals
  {
    id: 66,
    week: 13,
    team1_id: 1,
    team2_id: 10,
    team1_score: 2,
    team2_score: 3,
    winner_id: 10,
    differential: 1,
    is_playoff: true,
    playoff_round: 3,
  },
  {
    id: 67,
    week: 13,
    team1_id: 4,
    team2_id: 8,
    team1_score: 2,
    team2_score: 3,
    winner_id: 8,
    differential: 1,
    is_playoff: true,
    playoff_round: 3,
  },

  // Finals
  {
    id: 68,
    week: 14,
    team1_id: 10,
    team2_id: 8,
    team1_score: 4,
    team2_score: 2,
    winner_id: 10,
    differential: 2,
    is_playoff: true,
    playoff_round: 4,
  },
  // Consolation
  {
    id: 69,
    week: 14,
    team1_id: 4,
    team2_id: 1,
    team1_score: 2,
    team2_score: 3,
    winner_id: 1,
    differential: 1,
    is_playoff: true,
    playoff_round: 4,
  },
]

export const mockPokemonStats = [
  // Top performers
  { id: 1, pokemon_id: 1, match_id: 1, kills: 3 }, // Great Tusk
  { id: 2, pokemon_id: 1, match_id: 4, kills: 4 },
  { id: 3, pokemon_id: 1, match_id: 7, kills: 3 },
  { id: 4, pokemon_id: 1, match_id: 10, kills: 3 },
  { id: 5, pokemon_id: 1, match_id: 15, kills: 4 },

  { id: 6, pokemon_id: 10, match_id: 1, kills: 2 }, // Deoxys
  { id: 7, pokemon_id: 10, match_id: 7, kills: 3 },
  { id: 8, pokemon_id: 10, match_id: 12, kills: 4 },
  { id: 9, pokemon_id: 10, match_id: 18, kills: 4 },

  { id: 10, pokemon_id: 22, match_id: 5, kills: 3 }, // Urshifu Single Strike
  { id: 11, pokemon_id: 22, match_id: 8, kills: 2 },
  { id: 12, pokemon_id: 22, match_id: 14, kills: 3 },
  { id: 13, pokemon_id: 22, match_id: 20, kills: 4 },

  { id: 14, pokemon_id: 28, match_id: 54, kills: 3 }, // Landorus Therian (Playoff performance)

  { id: 15, pokemon_id: 36, match_id: 6, kills: 2 }, // Cinderace
  { id: 16, pokemon_id: 36, match_id: 9, kills: 1 },
]

export const mockDivisions = [
  { id: 1, name: "Kanto", conference: "Lance" },
  { id: 2, name: "Johto", conference: "Lance" },
  { id: 3, name: "Hoenn", conference: "Leon" },
  { id: 4, name: "Sinnoh", conference: "Leon" },
]

// Helper function to get team by id
export function getTeamById(id: number) {
  return mockTeams.find((team) => team.id === id)
}

// Helper function to get pokemon by team
export function getPokemonByTeam(teamId: number) {
  return mockPokemon.filter((p) => p.team_id === teamId)
}

// Helper function to get matches for a team
export function getMatchesForTeam(teamId: number) {
  return mockMatches.filter((m) => m.team1_id === teamId || m.team2_id === teamId)
}

// Helper function to calculate MVP stats
export function getMVPStats() {
  const stats = new Map<
    number,
    { pokemon_id: number; name: string; team: string; totalKills: number; matches: number }
  >()

  mockPokemonStats.forEach((stat) => {
    const pokemon = mockPokemon.find((p) => p.id === stat.pokemon_id)
    if (!pokemon) return

    const team = mockTeams.find((t) => t.id === pokemon.team_id)
    if (!team) return

    if (!stats.has(stat.pokemon_id)) {
      stats.set(stat.pokemon_id, {
        pokemon_id: stat.pokemon_id,
        name: pokemon.name,
        team: team.name,
        totalKills: 0,
        matches: 0,
      })
    }

    const current = stats.get(stat.pokemon_id)!
    current.totalKills += stat.kills
    current.matches += 1
  })

  return Array.from(stats.values())
    .map((s) => ({
      ...s,
      avgKills: (s.totalKills / s.matches).toFixed(2),
    }))
    .sort((a, b) => b.totalKills - a.totalKills)
}
