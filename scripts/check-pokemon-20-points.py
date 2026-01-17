#!/usr/bin/env python3
"""Check how many Pokemon are available with 20 points"""
from supabase import create_client

supabase = create_client(
    'http://127.0.0.1:54321',
    'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'
)

# Query for Pokemon with 20 points
result = supabase.table('draft_pool').select(
    'pokemon_name, point_value, generation, is_available',
    count='exact'
).eq('point_value', 20).eq('is_available', True).execute()

print(f"Total Pokemon with 20 points: {result.count}")
print(f"\nFirst 10 Pokemon:")
for pokemon in result.data[:10]:
    gen = pokemon.get('generation', '?')
    print(f"  - {pokemon['pokemon_name']} (Gen {gen})")

if result.count > 10:
    print(f"\n... and {result.count - 10} more")
