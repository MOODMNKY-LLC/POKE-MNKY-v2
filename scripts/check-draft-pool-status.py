#!/usr/bin/env python3
"""Check draft pool status"""
from supabase import create_client

supabase = create_client(
    'http://127.0.0.1:54321',
    'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'
)

# Check total Pokemon
total = supabase.table('draft_pool').select('*', count='exact').limit(0).execute()
print(f"Total Pokemon in draft_pool: {total.count}")

# Check by point value
if total.count > 0:
    print("\nPokemon by point value:")
    for point_val in range(12, 21):
        count = supabase.table('draft_pool').select('*', count='exact').eq('point_value', point_val).eq('is_available', True).execute()
        if count.count > 0:
            print(f"  {point_val} points: {count.count} Pokemon")
    
    # Check availability
    available = supabase.table('draft_pool').select('*', count='exact').eq('is_available', True).execute()
    unavailable = supabase.table('draft_pool').select('*', count='exact').eq('is_available', False).execute()
    print(f"\nAvailability:")
    print(f"  Available: {available.count}")
    print(f"  Unavailable: {unavailable.count}")
else:
    print("\nWARNING: Draft pool table is empty!")
    print("   You may need to populate it with Pokemon data.")
