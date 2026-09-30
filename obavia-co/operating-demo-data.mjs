// Authored demonstration only. No customer, provider, or operational records.
export const cohort = Object.freeze({id:'synthetic-offer-a-sep',label:'September · Offer A · Lead Tier 2',basis:'200 assigned opportunities; one retained booking per opportunity; all attendance windows closed',synthetic:true});
const authoredStageSizes = Object.freeze([200,160,140,70,42,14,12]);
export const stageNames = Object.freeze(['Lead','Contact','Booked','Attended','Qualified','Won','Collected']);
export const records = Object.freeze(Array.from({length:200},(_,i)=>Object.freeze({id:`DEMO-${String(i+1).padStart(3,'0')}`,stage:authoredStageSizes.reduce((last,n,index)=>i<n?index:last,0),attendance:i<70?'Attended':i<140?'Missed':'Not booked',agenda:i%3===0?'Agenda recorded':'Agenda not recorded',reschedule:i%4===0?'Option recorded':'Option not recorded'})));
export const counts = Object.freeze(stageNames.map((_,stage)=>records.filter(r=>r.stage>=stage).length));
export const transitions = Object.freeze(stageNames.slice(1).map((name,i)=>Object.freeze({metric_id:`demo-stage-${i+1}`,definition_version:'synthetic-1',name,from:stageNames[i],value:counts[i+1]/counts[i],numerator:counts[i+1],denominator:counts[i],unit:'ratio',cohort_id:cohort.id,data_state:'synthetic_complete',unknown_count:0,evidence_query_id:`demo-records-stage-${i+1}`})));
export const attendance = transitions[2];
export const target = Object.freeze({metric_id:'demo-attendance-target',value:.6,numerator:84,denominator:140,unit:'ratio',cohort_id:cohort.id,data_state:'illustrative_target',label:'Illustrative target',assumptions:'Same offer, source tier and mature booking cohort; room for 14 extra appointments. Downstream outcomes are not modeled.'});
export const attendanceScenario = Object.freeze({metric_id:'demo-incremental-attendance',value:target.numerator-attendance.numerator,numerator:target.numerator-attendance.numerator,denominator:attendance.denominator,unit:'modeled_attendances',cohort_id:cohort.id,data_state:'illustrative_scenario'});
export const diagnosticSample = Object.freeze([3,17,28,49,68,73,88,102,121,138].map(n=>records[n-1]));
