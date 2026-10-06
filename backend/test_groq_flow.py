import os
import urllib.request
import json
from dotenv import load_dotenv

load_dotenv('backend/.env')
key = os.getenv('GROQ_API_KEY')

def call_groq(messages):
    payload = json.dumps({'model': 'openai/gpt-oss-120b', 'messages': messages, 'temperature': 0.3}).encode('utf-8')
    req = urllib.request.Request(
        'https://api.groq.com/openai/v1/chat/completions',
        data=payload,
        headers={'Authorization': f'Bearer {key}', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Content-Type': 'application/json'}
    )
    res = urllib.request.urlopen(req)
    return json.loads(res.read())['choices'][0]['message']['content']

history = [{'role': 'system', 'content': 'You are AlgoMentor, an expert DSA tutor.'}]

# Turn 1
history.append({'role': 'user', 'content': 'What is recursion?'})
ans1 = call_groq(history)
history.append({'role': 'assistant', 'content': ans1})

# Turn 2
history.append({'role': 'user', 'content': 'Give me an example.'})
ans2 = call_groq(history)
history.append({'role': 'assistant', 'content': ans2})

# Turn 3
history.append({'role': 'user', 'content': 'Now explain the same thing using trees.'})
ans3 = call_groq(history)
history.append({'role': 'assistant', 'content': ans3})

# Turn 4
history.append({'role': 'user', 'content': "What's its time complexity?"})
ans4 = call_groq(history)

print("Turn 2:", ans2[:150])
print("Turn 3:", ans3[:150])
print("Turn 4:", ans4[:150])
