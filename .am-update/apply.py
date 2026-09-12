from pathlib import Path

p=Path('tools/runtime-smoke.mjs')
text=p.read_text(encoding='utf-8')
old=""" if(w.AMAthleteAttributes){
  try{
   const attrs=w.AMAthleteAttributes.diagnostics();
   if(!attrs||attrs.scale!==20||attrs.playerFacingOverall!==false)fail('Athlete Attributes preview must expose a 1–20 scale with no player-facing Overall.');
   const sample=(w.s?.athletes||[])[0];
   if(sample){const model=w.AMAthleteAttributes.get(sample);if(!model||model.attributes?.length!==8)fail('Athlete Attributes preview must produce exactly eight event-specific attributes.');if(model.attributes?.some(x=>x.score<1||x.score>20))fail('Athlete Attributes produced a rating outside the 1–20 scale.');}
  }catch(err){fail(`Athlete Attributes diagnostics threw: ${err?.stack||err}`)}
 }
"""
new=""" if(w.AMAthleteAttributes){
  try{
   const attrs=w.AMAthleteAttributes.diagnostics();
   if(!attrs||attrs.scale!==20||attrs.playerFacingOverall!==false)fail('Athlete Attributes preview must expose a 1–20 scale with no player-facing Overall.');
   if(attrs.calibration!=='PB + event standards')fail('Athlete Attributes must be calibrated from objective performance standards.');
   const sample=(w.s?.athletes||[])[0];
   if(sample){const model=w.AMAthleteAttributes.get(sample);if(!model||model.attributes?.length!==8)fail('Athlete Attributes preview must produce exactly eight event-specific attributes.');if(model.attributes?.some(x=>x.score<1||x.score>20))fail('Athlete Attributes produced a rating outside the 1–20 scale.');}
   const audit=w.AMAthleteAttributes.audit(w.s?.athletes||[]);
   if(!audit||audit.athletes<1)fail('Athlete Attributes calibration audit did not inspect the athlete database.');
   if(audit.maxTwenties>2)fail(`Athlete Attributes elite-rarity rule failed: one athlete has ${audit.maxTwenties} ratings of 20.`);
   const twentyShare=audit.totalScores?audit.twenties/audit.totalScores:0;
   if(twentyShare>.04)fail(`Athlete Attributes calibration is too generous: ${(twentyShare*100).toFixed(1)}% of all ratings are 20.`);
   console.log(`[smoke] attribute audit: ${audit.athletes} athletes · avg ${audit.average}/20 · ${audit.twenties} twenties · ${audit.multipleTwenties} athletes with multiple 20s`);
  }catch(err){fail(`Athlete Attributes diagnostics threw: ${err?.stack||err}`)}
 }
"""
if old not in text:
    raise SystemExit('Athlete Attributes runtime-smoke anchor not found')
p.write_text(text.replace(old,new,1),encoding='utf-8')
