import requests
from datetime import datetime, timedelta

headers = {'x-apisports-key': 'd9b95aaeb9fa2b05895e086937fe16a2'}
url = 'https://v3.football.api-sports.io/fixtures'

print('Matches in next 7 days:')
for i in range(7):
    date = (datetime.now() + timedelta(days=i)).strftime('%Y-%m-%d')
    res = requests.get(url, headers=headers, params={'date': date, 'league': 1, 'season': 2026}).json()
    if 'response' in res:
        for m in res['response']:
            print(f"{m['fixture']['date']} - {m['teams']['home']['name']} vs {m['teams']['away']['name']}")
