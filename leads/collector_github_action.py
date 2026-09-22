#!/usr/bin/env python3
"""
GitHub Actions Collector - Free 24/7
- Runs limited batch (25 leads per GitHub Action run, every 15 min = 100/hour = 2400/day free)
- No infinite loop - exits after target, GitHub cron restarts it
- Uses same TRUE NO_SITE logic
- Writes to leads-no-website-batch.csv for import-github.mjs
"""
import sys, json, urllib.request, urllib.parse, csv, time, os, threading, random, argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

# Small subset of areas for fast GitHub Action run (10 min max)
AREAS = [
    ("London", "UK", "Central", "51.45,-0.25,51.60,0.05"),
    ("London", "UK", "South", "51.40,-0.20,51.55,0.10"),
    ("Manchester", "UK", "M1-M30", "53.35,-2.40,53.60,-2.05"),
    ("Birmingham", "UK", "B1-B30", "52.35,-2.05,52.60,-1.75"),
    ("Leeds", "UK", "LS1-LS30", "53.65,-1.75,53.95,-1.35"),
    ("Bristol", "UK", "BS1-BS30", "51.35,-2.75,51.60,-2.40"),
    ("Glasgow", "UK", "G1-G30", "55.75,-4.40,55.95,-4.10"),
    ("New York", "USA", "Manhattan", "40.65,-74.05,40.90,-73.90"),
    ("Los Angeles", "USA", "Central", "33.85,-118.45,34.20,-118.05"),
    ("Dubai", "AE", "All", "25.00,55.05,25.35,55.40"),
    ("Sydney", "AU", "Central", "-33.95,151.05,-33.75,151.30"),
    ("Singapore", "SG", "All", "1.20,103.60,1.50,104.00"),
    ("Bangkok", "TH", "Central", "13.60,100.40,13.90,100.70"),
    ("Manila", "PH", "Central", "14.50,120.90,14.70,121.10"),
]

CATEGORIES = {
    "dental": ['"healthcare"="dentist"', '"amenity"="dentist"'],
    "eye": ['"healthcare"="ophthalmologist"', '"healthcare"="optometrist"', '"shop"="optician"'],
    "pet_store": ['"shop"="pet"', '"amenity"="veterinary"'],
    "hospital": ['"amenity"="hospital"', '"amenity"="clinic"'],
    "physio": ['"healthcare"="physiotherapist"'],
}

def fetch(q):
    eps = ENDPOINTS[:]
    random.shuffle(eps)
    for ep in eps:
        try:
            data = urllib.parse.urlencode({"data": q}).encode()
            req = urllib.request.Request(ep, data=data, headers={"User-Agent":f"ClientForge-GH/1.0"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode())
        except Exception as e:
            print(f"  Fetch fail {ep}: {e}", flush=True)
            time.sleep(1)
    return {"elements":[]}

def parse(elements, cat, city, country, area):
    rows=[]
    for el in elements:
        tags=el.get("tags",{})
        name=tags.get("name","") or ""
        if not name or len(name)<3 or len(name)>100: continue
        website=(tags.get("website") or tags.get("contact:website") or "").strip()
        email=(tags.get("email") or tags.get("contact:email") or "").strip()
        phone=(tags.get("phone") or tags.get("contact:phone") or "").strip()
        if website!="": continue
        if not email: continue
        if any(b in email.lower() for b in ["example.com","test.com","noreply","no-reply",".png",".jpg"]): continue
        if "@" not in email or "." not in email.split("@")[-1]: continue
        if len(email)>80: continue
        rows.append({
            "company_name": name[:100],
            "business_category": cat,
            "website": "",
            "email": email[:150],
            "phone": phone[:40],
            "address": area,
            "city": city,
            "country": country,
            "area": area,
            "source": f"github_action_{country.lower()}",
        })
    return rows

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--target', type=int, default=25, help='Leads to collect per run')
    args = parser.parse_args()
    target = args.target

    # Find CSV path - works both in Arena and GitHub Action
    possible_csv = [
        "/home/user/leads/leads-no-website-batch.csv",
        "leads/leads-no-website-batch.csv",
        "../leads/leads-no-website-batch.csv",
        "leads-no-website-batch.csv",
    ]
    csv_path = None
    for p in possible_csv:
        if os.path.exists(p):
            csv_path = p
            break
    if not csv_path:
        # default for GitHub Action
        csv_path = "leads-no-website-batch.csv"
        if not os.path.exists("leads"):
            # if running from crm folder
            if os.path.exists("../leads"):
                csv_path = "../leads/leads-no-website-batch.csv"
            else:
                os.makedirs("leads", exist_ok=True)
                csv_path = "leads/leads-no-website-batch.csv"

    print(f"SUPER FAST GitHub Action - target {target} - CSV {csv_path} - {datetime.now()}", flush=True)

    all_rows=[]
    seen=set()
    try:
        with open(csv_path, newline='', encoding='utf-8') as f:
            existing=list(csv.DictReader(f))
            valid=[r for r in existing if r.get('email','').strip() and not r.get('website','').strip()]
            all_rows.extend(valid)
            seen=set((r['company_name'].lower().strip(), r['email'].lower().strip()) for r in valid)
            print(f"Loaded {len(valid)} existing from {csv_path}", flush=True)
    except Exception as e:
        print(f"Fresh start: {e}", flush=True)

    def job(args):
        city, country, area_name, bbox, cat, tags = args
        filters="\n".join([f'  node[{t}]({bbox});' for t in tags] + [f'  way[{t}]({bbox});' for t in tags])
        q=f"[out:json][timeout:50];({filters});out center 600;"
        data=fetch(q)
        rows=parse(data.get("elements",[]), cat, city, country, area_name)
        fresh=[r for r in rows if (r['company_name'].lower().strip(), r['email'].lower().strip()) not in seen]
        return {"city":city,"country":country,"cat":cat,"raw":len(data.get("elements",[])),"match":len(rows),"fresh":fresh}

    # Build jobs - limited for GitHub Action (50 queries max per run)
    jobs=[]
    for city, country, area_name, bbox in AREAS:
        for cat, tag_list in CATEGORIES.items():
            jobs.append((city, country, area_name, bbox, cat, tag_list))
    random.shuffle(jobs)
    batch_jobs = jobs[:50]  # Only 50 queries per run = ~2-3 min

    print(f"\nBATCH - Need {target} - {len(batch_jobs)} queries - 15 workers", flush=True)

    new=0
    lock = threading.Lock()

    with ThreadPoolExecutor(max_workers=15) as ex:
        futs = {ex.submit(job, j): j for j in batch_jobs}
        for fut in as_completed(futs):
            try:
                res = fut.result()
                if res["fresh"]:
                    print(f"  ✓ [{res['city']}] {res['cat']:10s} +{len(res['fresh'])} | {res['fresh'][0]['company_name'][:30]} {res['fresh'][0]['email'][:30]}", flush=True)
                    with lock:
                        for r in res["fresh"]:
                            key=(r['company_name'].lower().strip(), r['email'].lower().strip())
                            if key not in seen and len(all_rows)<target+100:  # allow some buffer
                                seen.add(key)
                                all_rows.append(r)
                                new+=1
                                if new >= target:
                                    break
            except Exception as e:
                print(f"  ✗ {e}", flush=True)
            if new >= target:
                break

    # Write only NEW leads for this run to CSV (for import)
    # Keep only latest target leads for import efficiency
    final_to_write = all_rows[-target:] if len(all_rows) > target else all_rows

    # Ensure dir exists
    os.makedirs(os.path.dirname(csv_path) if os.path.dirname(csv_path) else ".", exist_ok=True)

    with open(csv_path,"w",newline="",encoding="utf-8") as f:
        w=csv.DictWriter(f, fieldnames=["company_name","business_category","website","email","phone","address","city","country","area","source"])
        w.writeheader()
        w.writerows(final_to_write)

    print(f"\nDONE +{new} Total {len(final_to_write)}/{target} written to {csv_path}", flush=True)

if __name__ == "__main__":
    main()
