import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv('d:/projects/pitchsense/scripts/.env')
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

matches = supabase.table('matches').select('*').eq('home_team', 'France').eq('away_team', 'Spain').execute()
for m in matches.data:
    match_id = m['id']
    print(f'Found match ID: {match_id}')
    
    # Update match result to 0-2 (France 0, Spain 2)
    supabase.table('matches').update({'result': '0-2'}).eq('id', match_id).execute()
    
    # Re-evaluate predictions
    preds = supabase.table('predictions').select('*').eq('match_id', match_id).execute()
    for p in preds.data:
        is_correct = (p['prediction'] == 'Spain')
        is_exact = (p['score_prediction'] == 'France 0-2') or (p['score_prediction'] == '0-2') or (p['score_prediction'] == 'Spain 2-0') or (p['score_prediction'] == '2-0 Spain')
        print(f"Scoring {p['alias']}: Correct={is_correct}, Exact={is_exact}")
        supabase.table('predictions').update({
            'is_correct': is_correct,
            'is_exact_score': is_exact
        }).eq('id', p['id']).execute()

print('Done manual re-scoring!')
