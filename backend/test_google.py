import httpx
from bs4 import BeautifulSoup
import json
import asyncio

async def test():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "en-US,en;q=0.9",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get("https://www.google.com/search", params={"q": "AI founder Hyderabad site:linkedin.com/in/"}, headers=headers, follow_redirects=True)
        soup = BeautifulSoup(resp.text, "lxml")
        results = []
        for div in soup.select("div.g, div.tF2Cxc"):
            title_el = div.select_one("h3")
            link_el = div.select_one("a[href]")
            snippet_el = div.select_one("div.VwiC3b, span.aCOpRe")
            if title_el and link_el:
                href = link_el.get("href", "")
                if href.startswith("/url?q="):
                    href = href.split("/url?q=")[1].split("&")[0]
                results.append({
                    "title": title_el.get_text(strip=True), 
                    "link": href, 
                    "snippet": snippet_el.get_text(strip=True) if snippet_el else ""
                })
        print(json.dumps(results, indent=2))

asyncio.run(test())
