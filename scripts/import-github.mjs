import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import https from "https";
import http from "http";

const prisma = new PrismaClient();

function parseCsv(text){
  const clean=text.replace(/^\uFEFF/,"");
  const rows=[];let row=[],field="",inQuotes=false;
  for(let i=0;i<clean.length;i++){
    const ch=clean[i];
    if(inQuotes){if(ch=='"'){if(clean[i+1]=='"'){field+='"';i++;}else inQuotes=false;}else field+=ch;}
    else if(ch=='"') inQuotes=true;
    else if(ch==','){row.push(field);field="";}
    else if(ch=='\n'){row.push(field);rows.push(row);row=[];field="";}
    else if(ch!='\r') field+=ch;
  }
  if(field||row.length){row.push(field);rows.push(row);}
  const nonEmpty=rows.filter(r=>r.some(c=>c.trim()!==""));
  if(!nonEmpty.length) return {headers:[],rows:[]};
  const headers=nonEmpty[0].map(h=>h.trim());
  const out=nonEmpty.slice(1).map(r=>{const o={};headers.forEach((h,idx)=>o[h]=(r[idx]??"").trim());return o;});
  return {headers,rows:out};
}

const GENERIC = new Set(['gmail.com','yahoo.com','hotmail.com','outlook.com','aol.com','icloud.com','protonmail.com','proton.me','yandex.com','mail.com','gmx.com','zoho.com','yahoo.co.uk','hotmail.co.uk','outlook.co.uk','live.com','msn.com','googlemail.com','ymail.com','inbox.com','me.com','mac.com']);

function hasLiveWebsite(domain){
  return new Promise((resolve)=>{
    if(!domain || GENERIC.has(domain.toLowerCase()) || domain.length<4 || !domain.includes('.')) return resolve(false);
    const check = (url, cb)=>{
      const lib = url.startsWith('https') ? https : http;
      const req = lib.get(url, {timeout: 5000}, (res)=>{
        // 200-399 = live site
        if(res.statusCode>=200 && res.statusCode<400){
          let body='';
          res.on('data', c=> body+=c);
          res.on('end', ()=>{
            // basic check: if body contains <html and not too small, it's a real site
            if(body.length>500 && body.toLowerCase().includes('<html')) cb(true);
            else cb(false);
          });
        } else {
          cb(false);
        }
      });
      req.on('error', ()=> cb(false));
      req.on('timeout', ()=> { req.destroy(); cb(false); });
    };
    // try https first, then http
    check(`https://${domain}`, (ok)=>{
      if(ok) resolve(true);
      else check(`http://${domain}`, (ok2)=> resolve(ok2));
    });
  });
}

async function main(){
  // Try multiple possible CSV locations
  const possiblePaths = [
    path.join(process.cwd(), "..", "leads", "leads-no-website-batch.csv"),
    path.join(process.cwd(), "leads", "leads-no-website-batch.csv"),
    "/home/user/leads/leads-no-website-batch.csv",
    path.join(process.cwd(), "leads-no-website-batch.csv"),
  ];
  let csvPath = null;
  for(const p of possiblePaths){
    if(fs.existsSync(p)){ csvPath=p; break; }
  }
  if(!csvPath){
    console.log("No CSV found in", possiblePaths);
    return;
  }
  const text=fs.readFileSync(csvPath,"utf8");
  const {rows}=parseCsv(text);
  console.log(`[GitHub Action Import] Found ${rows.length} rows from ${csvPath}`);

  let ins=0, upd=0, skipSite=0, skipGeneric=0, skipLiveSite=0;

  for(const r of rows){
    if(!r.email) continue;
    if((r.website||'').trim() !== '') { skipSite++; continue; }

    const emailDomain = (r.email.split('@')[1]||'').toLowerCase().trim();
    if(GENERIC.has(emailDomain)){ skipGeneric++; continue; }

    // TRUE NO_SITE verification - prevents Emma Clinic type false leads
    if(emailDomain){
      const live = await hasLiveWebsite(emailDomain);
      if(live){
        console.log(`  ✗ FALSE NO_SITE skipped: ${r.company_name} - ${emailDomain} has live website`);
        skipLiveSite++;
        continue;
      }
    }

    const data={
      companyName:r.company_name?.slice(0,120),
      businessCategory:r.business_category||'unknown',
      website:r.website||null,
      email:r.email?.slice(0,200),
      phone:r.phone||null,
      address:r.address||null,
      city:r.city||null,
      country:r.country||"UK",
      source:"no_website_github_action",
      status:"NEW",
      priority:"HIGH",
      optedInEmail:true,
      score:100,
      segment:"NO_SITE",
      hookLine:`Found ${r.company_name} on Google Maps - noticed you don't have a website yet. We help ${r.business_category} clinics in ${r.city} get more bookings with a simple site.`,
    };

    let existing=await prisma.lead.findFirst({where:{email:r.email}});
    if(!existing) existing=await prisma.lead.findFirst({where:{companyName:r.company_name, city:r.city||undefined}});

    if(existing){
      await prisma.lead.update({where:{id:existing.id},data});
      upd++;
    }else{
      await prisma.lead.create({data});
      ins++;
      console.log(`  ✓ Imported: ${r.company_name} - ${r.email} - ${r.city}`);
    }
  }

  console.log(`\nInserted ${ins}, updated ${upd}, skipped with site ${skipSite}, generic ${skipGeneric}, live website ${skipLiveSite}`);

  const total=await prisma.lead.count();
  const noSite=await prisma.lead.count({where:{OR:[{website:''},{website:null}]}});
  console.log(`DB now: ${total} total, ${noSite} no-site`);

  // Update heartbeat
  const hb = {
    timestamp: new Date().toISOString(),
    fileRows: rows.length,
    crmTotal: total,
    pid: process.pid,
    message: `GitHub Action: Collected ${rows.length} - CRM ${total}/200 - TRUE NO_SITE verified - Free 24/7`,
    collectors: 1,
    source: "github_action"
  };
  await prisma.setting.upsert({
    where: { key: 'collector_heartbeat' },
    update: { value: JSON.stringify(hb) },
    create: { key: 'collector_heartbeat', value: JSON.stringify(hb) }
  });
  console.log("Heartbeat updated:", hb.message);
}

main().catch(e=>{ console.error(e); process.exit(1); }).finally(()=>prisma.$disconnect());
