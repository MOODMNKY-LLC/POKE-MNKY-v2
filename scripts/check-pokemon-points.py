#!/usr/bin/env python3
"""
Check how many Pokemon have a specific point value in the draft pool
"""
import os
import sys
from supabase import create_client

# Get Supabase credentials
supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321')
supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY', 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz')

try:
    supabase = create_client(supabase_url, supabase_key)
    
    # Get point value from command line or default to 20
    point_value = int(sys.argv[1]) if len(sys.argv) > 1 else 20
    
    # Query draft pool
    result = supabase.table('draft_pool').select('pokemon_name, point_value, is_available', count='exact').eq('point_value', point_value).execute()
    
    print(f'\n📊 Pokemon with {point_value} points: {result.count}')
    
    if result.count > 0:
        print(f'\n📋 List of Pokemon:')
        for pokemon in result.data:
            status = '✅ Available' if pokemon.get('is_available', False) else '❌ Drafted'
            print(f"   - {pokemon.get('pokemon_name', 'Unknown')} ({status})")
    
    # Also show breakdown by availability
    available = supabase.table('draft_pool').select('*', count='exact').eq('point_value', point_value).eq('is_available', True).execute()
    drafted = supabase.table('draft_pool').select('*', count='exact').eq('point_value', point_value).eq('is_available', False).execute()
    
    print(f'\n📊 Breakdown:')
    print(f"   Available: {available.count}")
    print(f"   Drafted: {drafted.count}")
    
except Exception as e:
    print(f'❌ Error: {e}')
    sys.exit(1)
