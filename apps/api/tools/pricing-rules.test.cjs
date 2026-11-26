const assert = require('node:assert/strict');
const { resolveNight, planAmount, defaultPolicy, bookedPolicy, feeAmount, policyFingerprint } = require('../dist/core/pricing-rules.js');
const { HotelService } = require('../dist/core/hotel.service.js');
const { day } = require('../dist/core/util.js');
let n = 0;
async function test(name, fn) { await fn(); n++; console.log('PASS', name); }

const base=2250000,weekend={enabled:true,surchargeVnd:1000000};const d=s=>day(s);let plans=[defaultPolicy('FLEXIBLE'),defaultPolicy('NON_REFUNDABLE')];let overrides=[{date:d('2026-12-26'),amountVnd:4500000,period:{name:'Christmas'}}];const type={id:'r',code:'deluxe',baseRateVnd:base,isPublished:true};const client={roomType:{findUnique:async()=>type},dailyRate:{findMany:async()=>overrides},hotelSettings:{findUnique:async()=>({weekendEnabled:weekend.enabled,weekendSurchargeVnd:weekend.surchargeVnd})},ratePlanPolicy:{findMany:async()=>plans}};const hotel=new HotelService(client);
(async()=>{
await test('weekday, Saturday and Sunday',()=>{assert.equal(resolveNight(d('2026-12-25'),base,weekend).raw,base);for(const v of ['2026-12-26','2026-12-27'])assert.equal(resolveNight(d(v),base,weekend).raw,3250000)});
await test('special overrides weekend rather than stacking',()=>assert.deepEqual(resolveNight(d('2026-12-26'),base,weekend,4500000),{raw:4500000,source:'SPECIAL'}));
await test('disable weekend',()=>assert.equal(resolveNight(d('2026-12-27'),base,{...weekend,enabled:false}).raw,base));
await test('actual HotelService.quote sums mixed nights',async()=>{const q=await hotel.quote(client,'r',['2026-12-25','2026-12-26','2026-12-27'].map(d),'FLEXIBLE');assert.deepEqual(q.lines.map(x=>x.amountVnd),[2250000,4500000,3250000]);assert.equal(q.totalVnd,10000000)});
await test('actual quote applies non-refundable after special price',async()=>assert.equal((await hotel.quote(client,'r',[d('2026-12-26')],'NON_REFUNDABLE')).totalVnd,4050000));
await test('calendar correct weekday index and source',async()=>{const c=await hotel.rateCalendar('deluxe','2026-12');assert.equal(c.length,31);assert.equal(c[25].source,'SPECIAL');assert.equal(c[26].source,'WEEKEND');assert.equal(c[25].flexibleVnd,4500000)});
await test('existing policy snapshot retains discount even after plan update or disabling',async()=>{const old=defaultPolicy('NON_REFUNDABLE');plans=[plans[0],{...old,discountPercent:20,active:false}];await assert.rejects(hotel.quote(client,'r',[d('2026-12-26')],'NON_REFUNDABLE'),/unavailable/);assert.equal((await hotel.quote(client,'r',[d('2026-12-26')],'NON_REFUNDABLE',old)).totalVnd,4050000);assert.equal(bookedPolicy('NON_REFUNDABLE',null).discountPercent,10)});
await test('fee caps, zero fee and full fee',()=>{assert.equal(feeAmount('FIRST_NIGHT',4500000,3000000),3000000);assert.equal(feeAmount('FULL',1,100),100);assert.equal(feeAmount('NONE',1,100),0)});
await test('policy fingerprint independent of property order and changes with policy',()=>{let p=defaultPolicy('FLEXIBLE');assert.equal(policyFingerprint(p),policyFingerprint(Object.fromEntries(Object.entries(p).reverse())));assert.notEqual(policyFingerprint(p),policyFingerprint({...p,freeCancellationHours:72}))});
await test('invalid calendar date and inverted range',async()=>{assert.throws(()=>d('2026-02-30'));await assert.rejects(hotel.saveSpecial({startDate:'2099-12-28',endDate:'2099-12-27'},'staff'),/1–366/)});
// In-memory transaction double for actual range create/edit/delete methods. Not a PostgreSQL integration test.
let periods=new Map(),daily=[],seq=0,audits=[];const tx={ $queryRaw:async()=>[],roomType:{findMany:async({where})=>where.code?[{id:'r'}]:where.dailyRates? [{id:'r'}]:[{id:'r'},{id:'s'}]},specialRatePeriod:{findUnique:async({where})=>periods.get(where.id)||null,create:async({data})=>{const r={id:String(++seq),...data};periods.set(r.id,r);return r},update:async({where,data})=>{const r={id:where.id,...data};periods.set(r.id,r);return r},delete:async({where})=>periods.delete(where.id)},dailyRate:{findFirst:async({where})=>daily.find(r=>where.roomTypeId.in.includes(r.roomTypeId)&&r.date>=where.date.gte&&r.date<=where.date.lte&&(!where.OR||r.periodId!==where.OR[1].periodId.not))||null,deleteMany:async({where})=>{daily=daily.filter(r=>r.periodId!==where.periodId)},createMany:async({data})=>{daily.push(...data)}},auditLog:{create:async({data})=>audits.push(data)}};const svc=new HotelService({$transaction:async f=>f(tx)});const spec={name:'Christmas',roomTypeCode:'deluxe',startDate:'2099-12-24',endDate:'2099-12-27',amountVnd:4500000};let period;
await test('inclusive period creates 4 daily rows',async()=>{period=await svc.saveSpecial(spec,'staff');assert.equal(daily.length,4);assert.equal(daily[3].date.toISOString().slice(0,10),'2099-12-27')});
await test('overlap rejected',async()=>assert.rejects(svc.saveSpecial({...spec,startDate:'2099-12-27',endDate:'2099-12-28'},'staff'),/overlaps/));
await test('same day accepted and editing removes old period rows',async()=>{await svc.saveSpecial({...spec,endDate:spec.startDate},'staff',period.id);assert.equal(daily.length,1)});
await test('delete removes period rows and writes audit',async()=>{await svc.deleteSpecial(period.id,'staff');assert.equal(daily.length,0);assert.equal(periods.size,0);assert.equal(audits.length,3)});
await test('all rooms creates one row per room per day',async()=>{await svc.saveSpecial({...spec,roomTypeCode:'*'},'staff');assert.equal(daily.length,8)});
console.log(`${n} tests passed`);
})().catch(e=>{console.error(e);process.exit(1)});
