/**
 * Test script for team parser with real team file
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { parseShowdownTeam, exportTeamToShowdown } from '../lib/team-parser';

async function testTeamParser() {
  console.log('🧪 Testing Team Parser with Real Team File\n');
  
  // Read the team file
  const teamFilePath = join(process.cwd(), '[gen8ou] some team (2020-03-14).txt');
  const teamText = readFileSync(teamFilePath, 'utf-8');
  
  console.log('📄 File Info:');
  console.log(`   Length: ${teamText.length} characters`);
  console.log(`   First line: ${teamText.split('\n')[0]}`);
  console.log(`   Has trailing whitespace: ${teamText.trimEnd() !== teamText}\n`);
  
  // Parse the team
  console.log('🔍 Parsing team...\n');
  const parsed = await parseShowdownTeam(teamText);
  
  // Display results
  console.log('✅ Parse Results:');
  console.log(`   Pokemon count: ${parsed.pokemon.length}`);
  console.log(`   Errors: ${parsed.errors.length > 0 ? parsed.errors.join(', ') : 'None'}`);
  
  if (parsed.metadata) {
    console.log('\n📋 Metadata:');
    console.log(`   Generation: ${parsed.metadata.generation || 'N/A'}`);
    console.log(`   Format: ${parsed.metadata.format || 'N/A'}`);
    console.log(`   Folder: ${parsed.metadata.folder || 'N/A'}`);
    console.log(`   Team Name: ${parsed.metadata.teamName || 'N/A'}`);
    console.log(`   Raw Header: ${parsed.metadata.rawHeader || 'N/A'}`);
  }
  
  console.log('\n👾 Pokemon List:');
  parsed.pokemon.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name} @ ${p.item || 'No Item'}`);
    console.log(`      Ability: ${p.ability || 'N/A'}`);
    console.log(`      Moves: ${p.moves.length} moves`);
  });
  
  // Test export
  console.log('\n📤 Testing Export...\n');
  const exported = exportTeamToShowdown(parsed, {
    includeHeader: true,
    generation: parsed.metadata?.generation,
    format: parsed.metadata?.format,
    teamName: parsed.metadata?.teamName
  });
  
  console.log('✅ Export Results:');
  console.log(`   Length: ${exported.length} characters`);
  console.log(`   Has header: ${exported.includes('===')}`);
  console.log(`   First 150 chars:\n${exported.substring(0, 150)}...\n`);
  
  // Check for issues
  const issues: string[] = [];
  
  if (parsed.pokemon.length !== 6) {
    issues.push(`Expected 6 Pokemon, got ${parsed.pokemon.length}`);
  }
  
  if (!parsed.metadata?.generation) {
    issues.push('Generation not extracted');
  }
  
  if (!parsed.metadata?.format) {
    issues.push('Format not extracted');
  }
  
  if (!parsed.metadata?.teamName) {
    issues.push('Team name not extracted');
  }
  
  if (parsed.errors.length > 0) {
    issues.push(`Parse errors: ${parsed.errors.join(', ')}`);
  }
  
  if (issues.length > 0) {
    console.log('⚠️  Issues Found:');
    issues.forEach(issue => console.log(`   - ${issue}`));
  } else {
    console.log('✅ All checks passed!');
  }
}

testTeamParser().catch(console.error);
