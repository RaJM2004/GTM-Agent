import httpx
from bs4 import BeautifulSoup
import json
import asyncio

async def test():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml"
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get("https://html.duckduckgo.com/html/", params={"q": "AI founder Hyderabad site:linkedin.com/in/"}, headers=headers)
        soup = BeautifulSoup(resp.text, "lxml")
        results = []
        for a in soup.find_all("a", class_="result__url"):
            link = a.get("href")
            title_tag = a.find_previous("a", class_="result__snippet")
            snippet_tag = a.find_previous("a", class_="result__snippet") # wait snippet is a class result__snippet
            results.append({"link": link})
        print(len(results))

asyncio.run(test())
