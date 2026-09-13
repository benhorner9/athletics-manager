import fs from 'node:fs';
import assert from 'node:assert/strict';

const economy=fs.readFileSync('scripts/programme-economy-v2.js','utf8');
const game=fs.readFileSync('scripts/game.js','utf8');
const rate=Number(economy.match(/INFLATION_RATE=([.0-9]+)/)?.[1]);
const cap=Number(economy.match(/INFLATION_CAP=([.0-9]+)/)?.[1]);
assert(Number.isFinite(rate)&&rate>0&&rate<.1,'Inflation rate missing or invalid');
assert(Number.isFinite(cap)&&cap>=1.5&&cap<=3,'Inflation cap missing or invalid');
const index=year=>Math.min(cap,Math.pow(1+rate,Math.max(0,year-1)));
assert.equal(index(1),1,'Year 1 must be the monetary baseline');
for(let y=2;y<=40;y++)assert(index(y)>=index(y-1),'Monetary index must never fall');
assert(index(40)<=cap+1e-9,'40-year index exceeds cap');
assert(economy.includes('const grant=indexedGrant(n)'), 'AI programmes must receive indexed annual grants');
assert(economy.includes('const core=indexedGrant()'), 'Player forecast must use indexed core funding');
assert(game.includes('AMProgrammeEconomy?.indexedGrant?.(mn)'), 'Actual player season rollover must use indexed core funding');
assert(game.includes('AMProgrammeEconomy?.inflationIndex?.()'), 'Actual performance funding must use the same long-save index');

const cases=[
 {name:'lean',grant:2400000,cost:1500000,performance:150000},
 {name:'balanced',grant:3400000,cost:2800000,performance:450000},
 {name:'ambitious',grant:5200000,cost:5000000,performance:900000}
];
const checkpoints=[1,10,20,40];
for(const c of cases){
 const baseMargin=(c.grant+c.performance-c.cost)/(c.grant+c.performance);
 for(const year of checkpoints){
  const i=index(year),revenue=(c.grant+c.performance)*i,cost=c.cost*i,margin=(revenue-cost)/revenue;
  assert(Number.isFinite(revenue)&&Number.isFinite(cost),'Long-save cashflow became non-finite');
  assert(Math.abs(margin-baseMargin)<1e-9,`${c.name}: inflation alone changed operating margin by year ${year}`);
 }
}
console.log('Programme Economy 40-year soak');
console.table(checkpoints.map(year=>({year,index:index(year).toFixed(3),balancedGrant:Math.round(3400000*index(year)),balancedCost:Math.round(2800000*index(year))})));
console.log('PASS: revenue and recurring costs stay indexed together through 40 career years.');
