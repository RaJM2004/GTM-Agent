from duckduckgo_search import DDGS
import json

res = DDGS().text('site:linkedin.com/in/ "AI" "founder" "Hyderabad"', max_results=3)
print(json.dumps(res, indent=2))
