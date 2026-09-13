from pathlib import Path
import re


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Missing patch anchor: {label}')
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label):
    out, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'Expected one match for {label}, got {count}')
    return out

pe_path = Path('scripts/programme-economy-v2.js')
pe = pe_path.read_text(encoding='utf-8')

income_block = r'''function fundingProjection(){const core=Number(safe(()=>nationalIdentityBlueprint(nation()).annualGrant,0)),rankRaw=Number(safe(()=>nationRanks().findIndex(x=>x[0]===nation())+1,0)),rank=rankRaw>0?rankRaw:8,medals=safe(()=>seasonMedalDelta(careerState().fundingMedalBaseline),{g:0,s:0,b:0}),performance=Math.max(0,(5-rank))*350000+Number(medals.g||0)*700000+Number(medals.s||0)*400000+Number(medals.b||0)*250000,deal=safe(()=>managementState().sponsors?.[yr()],null);return{core,rank,medals,performance,total:core+performance,sponsorPossible:deal&&!deal.settled?Number(deal.bonus||0):0}}
function commercialOffers(){const scale=clamp(costFactor()*inf(),.72,2.2);return safe(()=>sponsorOffers(),[]).map(o=>({...o,upfront:Math.round(Number(o.upfront||0)*scale/5000)*5000,bonus:Math.round(Number(o.bonus||0)*scale/5000)*5000}))}
function signCommercial(id){const m=safe(()=>managementState(),null);if(!m||wk()>=48)return false;m.sponsors??={};if(m.sponsors[yr()])return false;const offer=commercialOffers().find(x=>String(x.id)===String(id));if(!offer?.eligible)return false;m.sponsors[yr()]={...offer,season:yr(),signedWeek:wk(),podiums:0,wins:0,seen:{},settled:false};post(offer.upfront,`${offer.name} commercial partnership`,'Sponsorship',{commercial:true});mail('board',`Commercial partnership agreed: ${offer.name}`,`${cash(offer.upfront)} has been added to the programme. ${offer.goal} Potential performance payment: ${cash(offer.bonus)}. The guaranteed funding is not repaid if the target is missed.`,'info');saveNow();drawFinance2();return true}
function commercialPanel(){const deal=safe(()=>managementState().sponsors?.[yr()],null),offers=commercialOffers(),closed=wk()>=48;if(deal)return`<section class="pe-card"><div class="pe-card-head"><strong>Commercial Partnership</strong><span>Season ${yr()}</span></div><div class="pe-card-body"><div class="pe-commercial-current"><div><small>PARTNER</small><strong>${esc(deal.name)}</strong><p>${esc(deal.goal)}</p></div><div><small>GUARANTEED FUNDING</small><strong>${cash(deal.upfront)}</strong><p>Received in Week ${Number(deal.signedWeek)||'—'}.</p></div><div><small>POTENTIAL BONUS</small><strong>${cash(deal.bonus||0)}</strong><p>${deal.settled?`Settled · ${cash(deal.paidBonus||0)} paid`:`${Number(deal.podiums||0)} podiums · ${Number(deal.wins||0)} wins since signing`}</p></div></div></div></section>`;return`<section class="pe-card"><div class="pe-card-head"><strong>Commercial Partnerships</strong><span>${closed?'Signing window closed':'One agreement available this season'}</span></div><div class="pe-card-body"><div class="pe-sponsors">${offers.map(o=>`<article><header><small>PARTNERSHIP</small><h3>${esc(o.name)}</h3></header><p>${esc(o.goal)}</p><div><span><small>Guaranteed</small><strong>${cash(o.upfront)}</strong></span><span><small>Performance bonus</small><strong>${cash(o.bonus)}</strong></span></div><button class="btn secondary" data-commercial="${esc(o.id)}" ${closed||!o.eligible?'disabled':''}>${closed?'SIGNING CLOSED':!o.eligible?'REQUIREMENTS NOT MET':'REVIEW & SIGN'}</button></article>`).join('')}</div><p class="pe-note">Commercial values scale with the size of the national programme. Missing a performance target never claws back guaranteed funding.</p></div></section>`}
function income(){const f=fundingProjection(),deal=safe(()=>managementState().sponsors?.[yr()],null),positive=ledger().filter(x=>Number(x.amount)>0&&Number(x.season)===yr()),received=positive.reduce((a,x)=>a+Number(x.amount||0),0),by={federation:0,commercial:0,competition:0,other:0};for(const x of positive){const c=String(x.category||'').toLowerCase();if(c.includes('federation'))by.federation+=Number(x.amount||0);else if(c.includes('sponsor'))by.commercial+=Number(x.amount||0);else if(c.includes('prize')||c.includes('competition'))by.competition+=Number(x.amount||0);else by.other+=Number(x.amount||0)}return`<div class="pe-body"><section class="pe-card"><div class="pe-card-head"><strong>Funding Outlook</strong><span>Current season position</span></div><div class="pe-card-body"><div class="pe-income"><article><small>NEXT CORE ALLOCATION</small><strong>${cash(f.core)}</strong><p>Guaranteed federation baseline at the next season review.</p></article><article><small>PERFORMANCE FUNDING ESTIMATE</small><strong>${cash(f.performance)}</strong><p>Current rank #${f.rank} · medals this season ${Number(f.medals.g||0)}G ${Number(f.medals.s||0)}S ${Number(f.medals.b||0)}B.</p></article><article><small>PROJECTED NEXT ALLOCATION</small><strong>${cash(f.total)}</strong><p>Core funding plus the performance estimate if the season ended today.</p></article><article><small>RECEIVED THIS SEASON</small><strong>${cash(received)}</strong><p>Federation ${cash(by.federation)} · commercial ${cash(by.commercial)} · competition ${cash(by.competition)}${by.other?` · other ${cash(by.other)}`:''}.</p></article></div></div></section>${commercialPanel()}</div>`}
'''

pe = regex_once(
    pe,
    r'function income\(\)\{.*?\}\nfunction expenditure\(\)\{',
    income_block + 'function expenditure(){',
    'income section'
)

forecast_block = r'''function forecast(){const x=snap(),f=fundingProjection(),r=[];for(let i=0;i<=x.left;i+=4)r.push({w:Math.min(52,wk()+i),b:Number(s.funding)-x.weekly.total*i});const afterReview=x.projected+f.core+f.performance;return`<div class="pe-grid"><section class="pe-card"><div class="pe-card-head"><strong>Season Forecast</strong><span>${x.left} weeks remaining</span></div><div class="pe-card-body"><div class="pe-forecast"><small>PROJECTED SEASON-END BALANCE</small><strong class="${x.projected<0?'bad':''}">${cash(x.projected)}</strong><span>Current recurring commitments only, before the next annual allocation.</span></div><div class="pe-forecast-line">${r.map(x=>`<div><small>W${x.w}</small><i class="${x.b<0?'bad':''}"></i><strong>${cash(x.b)}</strong></div>`).join('')}</div><div class="pe-review-forecast"><div><small>NEXT CORE FUNDING</small><strong>${cash(f.core)}</strong><span>Guaranteed baseline</span></div><div><small>PERFORMANCE ESTIMATE</small><strong>${cash(f.performance)}</strong><span>Based on rank #${f.rank} and current medals</span></div><div><small>EST. POST-REVIEW POSITION</small><strong class="${afterReview<0?'bad':''}">${cash(afterReview)}</strong><span>Season-end balance plus projected federation allocation</span></div></div></div></section><aside class="pe-card"><div class="pe-card-head"><strong>Planning Assumptions</strong><span>Current commitments</span></div><div class="pe-card-body"><ul class="pe-list"><li>${cash(x.weekly.athlete)}/week athlete funding</li><li>${cash(x.weekly.staff)}/week staff salaries</li><li>${cash(x.weekly.facilities)}/week facility upkeep</li><li>${cash(x.weekly.operations)}/week operations</li><li>${cash(f.core)} next core allocation is guaranteed</li><li>${cash(f.performance)} performance funding is an estimate, not guaranteed</li>${f.sponsorPossible?`<li>${cash(f.sponsorPossible)} sponsor bonus remains possible and is not included above</li>`:''}</ul></div></aside></div>`}
'''
pe = regex_once(
    pe,
    r'function forecast\(\)\{.*?\}\nfunction fbody\(\)\{',
    forecast_block + 'function fbody(){',
    'forecast section'
)

binding_anchor = "root.querySelectorAll('[data-fs]').forEach(b=>b.onclick=()=>service(b.dataset.fs));safe(()=>window.AthleticsUI?.registerScreen?.('finance',{status:'candidate',replacement:'programme-economy-v2'}),null)"
binding_replacement = "root.querySelectorAll('[data-fs]').forEach(b=>b.onclick=()=>service(b.dataset.fs));root.querySelectorAll('[data-commercial]').forEach(b=>b.onclick=()=>{const offer=commercialOffers().find(x=>String(x.id)===String(b.dataset.commercial));if(!offer||!offer.eligible||wk()>=48)return;if(!safe(()=>confirm(`Sign ${offer.name}? ${cash(offer.upfront)} is guaranteed now; ${cash(offer.bonus)} remains performance-linked.`),true))return;signCommercial(offer.id)});safe(()=>window.AthleticsUI?.registerScreen?.('finance',{status:'candidate',replacement:'programme-economy-v2'}),null)"
pe = replace_once(pe, binding_anchor, binding_replacement, 'commercial finance binding')
pe = replace_once(pe, 'prog();recordFinance=record;facilityLevel=feff;', 'prog();recordFinance=record;signSponsor=signCommercial;facilityLevel=feff;', 'sponsorship authority cutover')

pe_path.write_text(pe, encoding='utf-8')

css_path = Path('styles/programme-economy-v1.css')
css = css_path.read_text(encoding='utf-8')
marker = '/* Programme Economy V2 — commercial income */'
if marker not in css:
    css += r'''

/* Programme Economy V2 — commercial income */
.pe-sponsors{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.pe-sponsors article{display:grid;grid-template-rows:auto minmax(54px,1fr) auto auto;gap:9px;padding:12px;border:1px solid #203e53;border-radius:10px;background:#081923}.pe-sponsors article header small{color:#72bde6;font-size:7px;font-weight:950;letter-spacing:.09em}.pe-sponsors article h3{margin:4px 0 0;font-size:14px}.pe-sponsors article>p{margin:0;color:#849dac;font-size:8px;line-height:1.5}.pe-sponsors article>div{display:grid;grid-template-columns:1fr 1fr;gap:6px}.pe-sponsors article>div>span{padding:8px;border:1px solid #1d384b;border-radius:8px;background:#07141e}.pe-sponsors article>div small,.pe-commercial-current small,.pe-review-forecast small{display:block;color:#708b9e;font-size:7px;font-weight:950;letter-spacing:.07em}.pe-sponsors article>div strong{display:block;margin-top:3px;font-size:11px}.pe-sponsors article>.btn{width:100%;min-height:39px;font-size:8px}.pe-commercial-current{display:grid;grid-template-columns:1.15fr .85fr .85fr;gap:8px}.pe-commercial-current>div{padding:11px;border:1px solid #1e3b4f;border-radius:9px;background:#071722}.pe-commercial-current strong{display:block;margin:4px 0;font-size:15px}.pe-commercial-current p{margin:0;color:#8098a9;font-size:8px;line-height:1.45}.pe-review-forecast{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:12px}.pe-review-forecast>div{padding:10px;border:1px solid #1f3b4e;border-radius:8px;background:#071722}.pe-review-forecast strong{display:block;margin:4px 0;font-size:13px}.pe-review-forecast strong.bad{color:#ef9aa3}.pe-review-forecast span{display:block;color:#738da0;font-size:7px;line-height:1.35}
@media(max-width:980px){.pe-sponsors{grid-template-columns:1fr}.pe-commercial-current{grid-template-columns:1fr}.pe-review-forecast{grid-template-columns:1fr}}
'''
css_path.write_text(css, encoding='utf-8')

cutover_path = Path('scripts/ui-cutover-v1.js')
cutover = cutover_path.read_text(encoding='utf-8')
cutover = replace_once(cutover, "const BUILD='2026.09.13-programme-economy2';", "const BUILD='2026.09.13-programme-economy3';", 'cutover build label')
cutover = cutover.replace('styles/programme-economy-v1.css?v=20260913-pe2', 'styles/programme-economy-v1.css?v=20260913-pe3')
cutover = cutover.replace('scripts/programme-economy-v2.js?v=20260913-pe2', 'scripts/programme-economy-v2.js?v=20260913-pe3')
cutover_path.write_text(cutover, encoding='utf-8')

game_path = Path('game.html')
game = game_path.read_text(encoding='utf-8')
game = replace_once(game, 'scripts/ui-cutover-v1.js?v=20260911-cutover4', 'scripts/ui-cutover-v1.js?v=20260913-pe3', 'ui cutover cache key')
game_path.write_text(game, encoding='utf-8')

print('Programme Economy income expansion applied.')
