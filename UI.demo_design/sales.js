// =============================================
// DATA
// =============================================
const REQS=[
{id:'REQ-2024-001',route:'MCT-DXB',travelDate:'2024-02-15',returnDate:'2024-02-20',pax:12,price:95,status:'review',priority:'urgent',agent:'Sky Travels',notes:'Group booking for corporate travel. Flexible on dates.',created:'2024-01-20',slaDeadline:'2024-01-21 18:00',tags:['VIP','Corporate'],reminderCount:0,
agentSales:[{type:'agent',author:'Sky Travels',text:'Need urgent approval for corporate group booking. Client is waiting.',time:'2024-01-20 09:30',avatar:'ST'},{type:'sales',author:'Sales Team',text:'Reviewing the request. Will get back with the best possible rate.',time:'2024-01-20 10:15',avatar:'SA'},{type:'agent',author:'Sky Travels',text:'Please note this is for a VIP client — need response today.',time:'2024-01-20 11:00',avatar:'ST'}],
salesRm:[{type:'sales',author:'Sales Team',text:'Forwarding fare approval request for MCT-DXB, 12 pax at 95 OMR.',time:'2024-01-20 10:30',avatar:'SA',isEmail:true},{type:'rm',author:'RM Office',text:'Under review. Will revert within 2 hours.',time:'2024-01-20 11:00',avatar:'RM',isEmail:true}]
},
{id:'REQ-2024-002',route:'MCT-KHI',travelDate:'2024-02-10',returnDate:'',pax:25,price:85,status:'rm',priority:'normal',agent:'OUA Travel',notes:'Wedding group — need adjacent seats.',created:'2024-01-18',slaDeadline:'2024-01-19 18:00',tags:['Wedding'],reminderCount:1,
agentSales:[{type:'agent',author:'OUA Travel',text:'Requesting special fare for wedding group of 25 pax.',time:'2024-01-18 14:00',avatar:'OU'},{type:'sales',author:'Sales Team',text:'Sent to RM for approval. Will update once we hear back.',time:'2024-01-18 15:30',avatar:'SA'}],
salesRm:[{type:'sales',author:'Sales Team',text:'Fare approval: MCT-KHI, 25 pax at 85 OMR. Wedding group.',time:'2024-01-18 15:45',avatar:'SA',isEmail:true}]
},
{id:'REQ-2024-003',route:'MCT-BKK',travelDate:'2024-03-01',returnDate:'2024-03-10',pax:8,price:140,status:'approved',priority:'normal',agent:'Sky Travels',notes:'Leisure group — honeymoon.',created:'2024-01-15',
agentSales:[{type:'agent',author:'Sky Travels',text:'Please approve at earliest convenience.',time:'2024-01-15 10:00',avatar:'ST'},{type:'sales',author:'Sales Team',text:'Approved at 130 OMR per pax!',time:'2024-01-16 09:00',avatar:'SA'}],
salesRm:[{type:'sales',author:'Sales Team',text:'Fare approval: MCT-BKK, 8 pax at 140 OMR.',time:'2024-01-15 11:00',avatar:'SA',isEmail:true},{type:'rm',author:'RM Office',text:'Approved at 130 OMR per pax.',time:'2024-01-15 14:00',avatar:'RM',isEmail:true}]
},
{id:'REQ-2024-004',route:'MCT-COK',travelDate:'2024-02-25',returnDate:'',pax:15,price:110,status:'submitted',priority:'normal',agent:'Gulf Air Travels',notes:'Family reunion group.',created:'2024-01-19',slaDeadline:'2024-01-21 12:00',tags:['Family'],reminderCount:0,
agentSales:[{type:'agent',author:'Gulf Air Travels',text:'New request for family group.',time:'2024-01-19 16:00',avatar:'GA'}],
salesRm:[]
},
{id:'REQ-2024-005',route:'MCT-DXB',travelDate:'2024-02-05',returnDate:'',pax:50,price:80,status:'rejected',priority:'urgent',agent:'Sky Travels',notes:'Large corporate event — rate too low.',created:'2024-01-10',slaDeadline:'2024-01-12 18:00',tags:['Corporate','Bulk'],reminderCount:0,
agentSales:[{type:'agent',author:'Sky Travels',text:'Requesting bulk rate for 50 pax.',time:'2024-01-10 09:00',avatar:'ST'},{type:'sales',author:'Sales Team',text:'Minimum 95 OMR required for this volume.',time:'2024-01-11 11:00',avatar:'SA'},{type:'agent',author:'Sky Travels',text:'Can we negotiate?',time:'2024-01-11 12:00',avatar:'ST'},{type:'sales',author:'Sales Team',text:'RM confirmed 90 OMR is the floor.',time:'2024-01-11 14:00',avatar:'SA'}],
salesRm:[{type:'sales',author:'Sales Team',text:'Bulk rate: MCT-DXB, 50 pax at 80 OMR.',time:'2024-01-10 10:00',avatar:'SA',isEmail:true},{type:'rm',author:'RM Office',text:'Cannot approve below 90 OMR. Reject.',time:'2024-01-11 09:00',avatar:'RM',isEmail:true}]
},
{id:'REQ-2024-006',route:'MCT-MLE',travelDate:'2024-02-20',returnDate:'',pax:10,price:130,status:'submitted',priority:'urgent',agent:'OUA Travel',notes:'Holiday group — need quick response.',created:'2024-01-21',slaDeadline:'2024-01-22 10:00',tags:['Holiday'],reminderCount:0,
agentSales:[{type:'agent',author:'OUA Travel',text:'Urgent request for holiday group to Maldives.',time:'2024-01-21 08:00',avatar:'OU'}],
salesRm:[]
}
];

const FLIGHTS=[
{id:'OV101',route:'MCT-DXB',from:'MCT',to:'DXB',fromCity:'Muscat',toCity:'Dubai',dep:'06:00',arr:'07:30',duration:'1h 30m',date:'2024-02-01',seats:42,price:95,aircraft:'A320'},
{id:'OV103',route:'MCT-DXB',from:'MCT',to:'DXB',fromCity:'Muscat',toCity:'Dubai',dep:'14:00',arr:'15:30',duration:'1h 30m',date:'2024-02-01',seats:18,price:110,aircraft:'A320neo'},
{id:'OV201',route:'MCT-KHI',from:'MCT',to:'KHI',fromCity:'Muscat',toCity:'Karachi',dep:'08:00',arr:'10:30',duration:'2h 30m',date:'2024-02-05',seats:35,price:85,aircraft:'B737'},
{id:'OV301',route:'MCT-BKK',from:'MCT',to:'BKK',fromCity:'Muscat',toCity:'Bangkok',dep:'09:00',arr:'14:00',duration:'5h',date:'2024-02-10',seats:22,price:140,aircraft:'A321'},
{id:'OV401',route:'MCT-COK',from:'MCT',to:'COK',fromCity:'Muscat',toCity:'Kochi',dep:'07:30',arr:'12:30',duration:'3h 30m',date:'2024-02-15',seats:30,price:105,aircraft:'A320'},
{id:'OV501',route:'MCT-MLE',from:'MCT',to:'MLE',fromCity:'Muscat',toCity:'Maldives',dep:'10:00',arr:'15:00',duration:'4h 30m',date:'2024-02-01',seats:12,price:150,aircraft:'A320neo'}
];

const NOTIFS=[
{id:1,type:'info',text:'New request from OUA Travel — REQ-2024-006',time:'5 min ago',unread:true},
{id:2,type:'warning',text:'Urgent request pending: REQ-2024-001',time:'30 min ago',unread:true},
{id:3,type:'success',text:'RM approved REQ-2024-003',time:'1 hour ago',unread:true},
{id:4,type:'info',text:'New message from Sky Travels',time:'2 hours ago',unread:true},
{id:5,type:'warning',text:'RM reply on REQ-2024-005',time:'3 hours ago',unread:true}
];

let curDetail=null;let charts={};

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded',()=>{renderStats();renderPending();renderAllPending();renderNotifs();renderFlights();initCharts()});

// =============================================
// NAVIGATION
// =============================================
function go(page){
    document.querySelectorAll('.pg').forEach(p=>p.classList.remove('active'));
    document.getElementById('pg-'+page).classList.add('active');
    document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
    document.querySelector(`.ni[onclick*="${page}"]`)?.classList.add('active');
    const titles={dashboard:'Sales Dashboard',pending:'Pending Approvals',inbox:'Email Aggregation',cityview:'City-Wise View',agenthistory:'Agent History',flights:'Flight Availability',analytics:'Analytics',detail:'Request Details'};
    document.getElementById('pageTitle').textContent=titles[page]||'Dashboard';
    if(page==='analytics')setTimeout(()=>Object.values(charts).forEach(c=>c.resize()),100);
    if(page==='inbox')renderInbox();
    if(page==='city-view'){renderCityTabs();renderCityTable();}
    if(page==='agent-history')renderAgentList();
    if(window.innerWidth<=768)toggleSidebar();
}
function toggleSidebar(){document.getElementById('sidebar').classList.toggle('active');document.getElementById('sbOverlay').classList.toggle('active')}

// =============================================
// STATS
// =============================================
function renderStats(){
    const pending=REQS.filter(r=>['submitted','review'].includes(r.status)).length,
    rm=REQS.filter(r=>r.status==='rm').length,
    urgent=REQS.filter(r=>r.priority==='urgent'&&r.status!=='approved'&&r.status!=='rejected').length,
    processed=REQS.filter(r=>['approved','rejected'].includes(r.status)).length;
    document.getElementById('salesStats').innerHTML=`
    <div class="sc"><div class="si yellow"><i class="fas fa-clock"></i></div><div><div class="sv">${pending}</div><div class="sl">Pending Requests</div></div></div>
    <div class="sc"><div class="si purple"><i class="fas fa-envelope"></i></div><div><div class="sv">${rm}</div><div class="sl">RM Pending</div></div></div>
    <div class="sc"><div class="si red"><i class="fas fa-exclamation-circle"></i></div><div><div class="sv">${urgent}</div><div class="sl">Urgent Requests</div></div></div>
    <div class="sc"><div class="si green"><i class="fas fa-check-double"></i></div><div><div class="sv">${processed}</div><div class="sl">Processed</div></div></div>`;
}

// =============================================
// TABLES
// =============================================
function fmtStatus(s){return{draft:'Draft',submitted:'Submitted',review:'Under Review',rm:'RM Pending',approved:'Approved',rejected:'Rejected'}[s]||s}
function waitTime(c){const d=new Date(c),h=Math.floor((Date.now()-d)/(36e5));return h<1?'< 1h':h<24?h+'h':Math.floor(h/24)+'d'}

function getSLAStatus(deadline){
    if(!deadline)return null;
    const now=new Date(),sla=new Date(deadline);
    const hoursLeft=(sla-now)/(1000*60*60);
    if(hoursLeft<0)return{status:'overdue',text:'Overdue',class:'sla-overdue',icon:'fa-exclamation-circle'};
    if(hoursLeft<6)return{status:'warning',text:`${Math.ceil(hoursLeft)}h left`,class:'sla-warning',icon:'fa-clock'};
    return{status:'safe',text:`${Math.ceil(hoursLeft)}h left`,class:'sla-safe',icon:'fa-check-circle'};
}
function renderTags(tags){if(!tags||!tags.length)return'';return tags.map(t=>`<span class="badge badge-tag ${t.toLowerCase()}">${t}</span>`).join(' ');}
function renderSLA(deadline){const sla=getSLAStatus(deadline);if(!sla)return'';return`<span class="sla-timer ${sla.class}"><i class="fas ${sla.icon}"></i> ${sla.text}</span>`;}

const SMART_REPLIES=[
    "Please approve {price} OMR, high value agent, urgent group",
    "Requesting approval for {route}, {pax} passengers",
    "VIP client - need urgent response",
    "Can we negotiate on this rate?",
    "RM approval needed - fare below threshold"
];

function renderPending(){
    const p=REQS.filter(r=>['submitted','review','rm'].includes(r.status));
    document.getElementById('pendingCount').textContent=p.length;
    document.getElementById('pendingTbl').innerHTML=p.map(r=>`
    <tr><td><strong>${r.id}</strong></td><td>${r.agent}</td><td>${r.route} ${renderTags(r.tags)}</td><td>${r.pax}</td><td>${r.price} OMR</td><td><span class="badge badge-${r.priority}">${r.priority}</span></td><td>${renderSLA(r.slaDeadline)||waitTime(r.created)}</td><td><button class="btn btn-p btn-sm" onclick="viewReq('${r.id}')"><i class="fas fa-eye"></i> Review</button></td></tr>`).join('');
}

function renderAllPending(){
    const f=getFilteredPending();
    document.getElementById('allPendingTbl').innerHTML=f.map(r=>`
    <tr><td><strong>${r.id}</strong></td><td>${r.agent}</td><td>${r.route} ${renderTags(r.tags)}</td><td>${r.travelDate}</td><td>${r.pax}</td><td>${r.price} OMR</td><td><span class="badge badge-${r.status}">${fmtStatus(r.status)}</span> ${renderSLA(r.slaDeadline)}</td><td><span class="badge badge-${r.priority}">${r.priority}</span></td><td><button class="btn btn-p btn-sm" onclick="viewReq('${r.id}')"><i class="fas fa-eye"></i> Review</button></td></tr>`).join('');
}

function getFilteredPending(){
    const s=document.getElementById('searchInput').value.toLowerCase(),
    st=document.getElementById('statusFilter').value,
    origin=document.getElementById('originFilter').value,
    dest=document.getElementById('destFilter').value,
    agent=document.getElementById('agentFilter').value,
    sales=document.getElementById('salesFilter').value,
    dateFrom=document.getElementById('dateFrom').value,
    dateTo=document.getElementById('dateTo').value;
    return REQS.filter(r=>{
        const ms=!s||r.id.toLowerCase().includes(s)||r.route.toLowerCase().includes(s)||r.agent.toLowerCase().includes(s);
        const mst=!st||r.status===st;
        const mor=!origin||r.route.startsWith(origin);
        const md=!dest||r.route.endsWith(dest);
        const ma=!agent||r.agent===agent;
        const msales=!sales||!r.assignedTo||r.assignedTo===sales;
        const mdf=!dateFrom||r.travelDate>=dateFrom;
        const mdt=!dateTo||r.travelDate<=dateTo;
        return ms&&mst&&mor&&md&&ma&&msales&&mdf&&mdt&&['submitted','review','rm'].includes(r.status);
    });
}

function resetFilters(){
    document.getElementById('searchInput').value='';
    document.getElementById('statusFilter').value='';
    document.getElementById('originFilter').value='';
    document.getElementById('destFilter').value='';
    document.getElementById('agentFilter').value='';
    document.getElementById('salesFilter').value='';
    document.getElementById('dateFrom').value='';
    document.getElementById('dateTo').value='';
    renderAllPending();
    showToast('Filters reset','success');
}
function filterPending(){renderAllPending()}

// =============================================
// REQUEST DETAIL
// =============================================
function viewReq(id){
    curDetail=REQS.find(r=>r.id===id);if(!curDetail)return;
    document.getElementById('dId').textContent=curDetail.id;
    document.getElementById('dRoute').textContent=curDetail.route;
    document.getElementById('dDate').textContent=curDetail.travelDate;
    document.getElementById('dPax').textContent=curDetail.pax;
    document.getElementById('dPrice').textContent=curDetail.price+' OMR';
    document.getElementById('dAgent').textContent=curDetail.agent;
    document.getElementById('dNotes').textContent=curDetail.notes;
    const sb=document.getElementById('detailStatus');sb.className='badge badge-'+curDetail.status;sb.textContent=fmtStatus(curDetail.status);
    renderStatusFlow(curDetail.status);renderTimeline('agent-sales');renderTimeline('sales-rm');updateAI(curDetail);
    document.getElementById('emSubject').textContent='['+curDetail.id+'] Approval Needed - '+curDetail.route;
    // Show/hide actions based on status
    const ac=document.getElementById('actionCard');
    ac.style.display=['approved','rejected'].includes(curDetail.status)?'none':'block';
    go('detail');
}

function renderStatusFlow(status){
    const steps=[{k:'draft',l:'Draft'},{k:'submitted',l:'Submitted'},{k:'review',l:'Review'},{k:'decision',l:'Decision'}];
    const order=['draft','submitted','review','rm','approved'];
    const ci=order.indexOf(status);
    document.getElementById('statusFlow').innerHTML=steps.map((s,i)=>{
        const si=order.indexOf(s.k);let cls='',icon=(i+1)+'';
        if(si<ci||(s.k==='decision'&&['approved','rejected'].includes(status))){cls='done';icon='<i class="fas fa-check"></i>';}
        else if(s.k===status||(s.k==='decision'&&status==='rm')){cls='active';}
        return`<div class="ss ${cls}"><div class="sd2">${icon}</div><span>${s.l}</span></div>${i<3?'<div class="sln"></div>':''}`;
    }).join('');
}

// =============================================
// CONVERSATION TABS
// =============================================
function switchConv(tab){
    document.querySelectorAll('.ct-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.ct-p').forEach(p=>p.classList.remove('active'));
    event.target.closest('.ct-tab').classList.add('active');
    document.getElementById('conv-'+tab).classList.add('active');
    renderTimeline(tab);
}

function renderTimeline(tab){
    if(!curDetail)return;
    const msgs=tab==='agent-sales'?curDetail.agentSales:curDetail.salesRm;
    const el=tab==='agent-sales'?'tlAS':'tlSR';
    if(!msgs||!msgs.length){document.getElementById(el).innerHTML='<div style="text-align:center;padding:30px;color:var(--g400)"><i class="fas fa-comments" style="font-size:2rem;margin-bottom:10px;display:block"></i>No messages yet</div>';return;}
    document.getElementById(el).innerHTML=msgs.map(m=>`
    <div class="tl-i"><div class="tl-a ${m.type}">${m.avatar}</div><div class="tl-c ${m.type}"><div class="tl-hd"><span class="tl-au">${m.author}${m.isEmail?'<span class="em-b"><i class="fas fa-envelope"></i> Email</span>':''}</span><span class="tl-tm">${m.time}</span></div><div class="tl-mg">${m.text}</div></div></div>`).join('');
}

function sendMsg(tab){
    if(!curDetail)return;
    const el=document.getElementById('msgAS');const txt=el.value.trim();if(!txt)return;
    curDetail.agentSales.push({type:'sales',author:'Sales Team',text:txt,time:new Date().toLocaleString(),avatar:'SA'});
    renderTimeline('agent-sales');el.value='';showToast('Reply sent to agent','success');
}

function sendToRM(){
    if(!curDetail)return;
    const msg=document.getElementById('msgRM').value.trim();
    const txt=msg||`Fare approval request for ${curDetail.route}, ${curDetail.pax} pax at ${curDetail.price} OMR. Please advise.`;
    curDetail.salesRm.push({type:'sales',author:'Sales Team',text:txt,time:new Date().toLocaleString(),avatar:'SA',isEmail:true});
    curDetail.status='rm';renderStatusFlow('rm');
    const sb=document.getElementById('detailStatus');sb.className='badge badge-rm';sb.textContent='RM Pending';
    renderTimeline('sales-rm');document.getElementById('msgRM').value='';
    showToast('Request sent to RM via email','success');addNotif('info','Request '+curDetail.id+' sent to RM');
    renderStats();renderPending();renderAllPending();
}

function simulateRMReply(){
    if(!curDetail)return;
    const approved=Math.random()>.3;
    const sp=Math.round(curDetail.price*(0.9+Math.random()*.2));
    const txt=approved?`Approved at ${sp} OMR per passenger.`:`Cannot approve. Minimum rate is ${sp} OMR.`;
    curDetail.salesRm.push({type:'rm',author:'RM Office',text:txt,time:new Date().toLocaleString(),avatar:'RM',isEmail:true});
    renderTimeline('sales-rm');
    if(approved){curDetail.status='approved';renderStatusFlow('approved');
    const sb=document.getElementById('detailStatus');sb.className='badge badge-approved';sb.textContent='Approved';
    document.getElementById('actionCard').style.display='none';
    showToast('RM approved the request!','success');}
    else{showToast('RM response received','warning');}
    addNotif('warning','RM replied on '+curDetail.id);renderStats();renderPending();renderAllPending();
}

// =============================================
// SALES ACTIONS
// =============================================
function approveReq(){
    if(!curDetail)return;
    curDetail.status='approved';
    curDetail.agentSales.push({type:'sales',author:'Sales Team',text:`Request approved at ${curDetail.price} OMR per passenger.`,time:new Date().toLocaleString(),avatar:'SA'});
    renderStatusFlow('approved');renderTimeline('agent-sales');
    const sb=document.getElementById('detailStatus');sb.className='badge badge-approved';sb.textContent='Approved';
    document.getElementById('actionCard').style.display='none';
    showToast('Request approved!','success');addNotif('success','Request '+curDetail.id+' approved');
    renderStats();renderPending();renderAllPending();
}

function rejectReq(){
    if(!curDetail)return;
    curDetail.status='rejected';
    curDetail.agentSales.push({type:'sales',author:'Sales Team',text:'Request rejected. Rate does not meet minimum requirements.',time:new Date().toLocaleString(),avatar:'SA'});
    renderStatusFlow('rejected');renderTimeline('agent-sales');
    const sb=document.getElementById('detailStatus');sb.className='badge badge-rejected';sb.textContent='Rejected';
    document.getElementById('actionCard').style.display='none';
    showToast('Request rejected','error');addNotif('error','Request '+curDetail.id+' rejected');
    renderStats();renderPending();renderAllPending();
}

function openCounterModal(){
    if(!curDetail)return;
    document.getElementById('currentOffer').value=curDetail.price+' OMR';
    document.getElementById('counterModal').classList.add('active');
}
function closeCounterModal(){document.getElementById('counterModal').classList.remove('active')}

function submitCounter(){
    const price=document.getElementById('counterPrice').value;
    const msg=document.getElementById('counterMsg').value;
    if(!price){showToast('Enter counter offer price','error');return;}
    if(!curDetail)return;
    curDetail.agentSales.push({type:'sales',author:'Sales Team',text:`Counter offer: ${price} OMR. ${msg}`,time:new Date().toLocaleString(),avatar:'SA'});
    renderTimeline('agent-sales');closeCounterModal();
    showToast('Counter offer sent to agent','success');
    document.getElementById('counterPrice').value='';document.getElementById('counterMsg').value='';
}

// =============================================
// AI
// =============================================
function updateAI(req){
    const suggested=req.price>100?Math.round(req.price*0.9):Math.round(req.price*0.95);
    document.getElementById('aiPrice').textContent=suggested+' OMR';
    const conf=req.priority==='urgent'?75:88;
    document.getElementById('confFill').style.width=conf+'%';
    document.getElementById('confText').textContent=conf+'%';
    renderSmartReplies(req);
    updateNudgeBtn(req);
    generateEmailSummary(req);
}

function generateEmailSummary(req){
    const box=document.getElementById('aiSummaryBox');
    if(!box)return;
    const totalMsgs=(req.agentSales?.length||0)+(req.salesRm?.length||0);
    if(totalMsgs===0){box.innerHTML='<div style="color:var(--g400);text-align:center;padding:20px"><i class="fas fa-inbox" style="font-size:2rem;margin-bottom:10px;display:block"></i>No messages to summarize</div>';return;}
    setTimeout(()=>{
        const summary=createSummary(req);
        box.innerHTML=`<div style="background:var(--g50);padding:12px;border-radius:8px;border-left:3px solid var(--pur)"><div style="font-weight:600;color:var(--g800);margin-bottom:8px"><i class="fas fa-bolt" style="color:var(--pur);margin-right:6px"></i>Key Points (${totalMsgs} messages analyzed)</div><ul style="margin:0;padding-left:18px;line-height:1.8">${summary.map(s=>`<li>${s}</li>`).join('')}</ul></div>`;
    },800);
}

function createSummary(req){
    const points=[];
    if(req.priority==='urgent')points.push('<strong>Urgent request</strong> - VIP client needs quick response');
    if(req.tags?.includes('VIP'))points.push('High-value <strong>VIP agent</strong> - prioritize approval');
    if(req.tags?.includes('Corporate'))points.push('<strong>Corporate booking</strong> - potential repeat business');
    if(req.pax>=20)points.push(`Large group: <strong>${req.pax} passengers</strong> - bulk rate applicable`);
    if(req.price<90)points.push('Price is <strong>below market rate</strong> - verify with RM');
    if(req.reminderCount>0)points.push(`<strong>${req.reminderCount} reminder(s) sent</strong> to RM - awaiting response`);
    const statusMsg={submitted:'Request newly submitted - initial review needed',review:'Under Sales review - negotiation in progress',rm:'Pending RM approval - revenue verification',approved:'Request approved - awaiting ticket issuance',rejected:'Request rejected - consider counter offer'}[req.status];
    if(statusMsg)points.push(statusMsg);
    return points.length?points:['No significant insights - standard fare request'];
}

function renderSmartReplies(req){
    const container=document.getElementById('smartReplies');
    if(!container)return;
    const replies=SMART_REPLIES.map(r=>r.replace('{price}',req.price).replace('{route}',req.route).replace('{pax}',req.pax));
    container.innerHTML=replies.map((r,i)=>`<span class="smart-reply" onclick="insertSmartReply('${r.replace(/'/g,"\\'")}')">${r}</span>`).join('');
}

function insertSmartReply(text){
    const ta=document.getElementById('msgRM');
    if(ta)ta.value=text;
}

function updateNudgeBtn(req){
    const btn=document.getElementById('nudgeBtn');
    if(!btn)return;
    const showNudge=req.status==='rm'&&req.reminderCount<3;
    btn.style.display=showNudge?'block':'none';
    btn.disabled=req.reminderCount>=3;
    btn.innerHTML=req.reminderCount>0?`<i class="fas fa-bell"></i> Nudge RM (${req.reminderCount})`:`<i class="fas fa-bell"></i> Nudge RM`;
}

function nudgeRM(){
    if(!curDetail)return;
    curDetail.reminderCount=(curDetail.reminderCount||0)+1;
    const msgs=curDetail.salesRm||[];
    msgs.push({type:'sales',author:'Sales Team',text:`Reminder: Pending approval for ${curDetail.id}. Please respond.`,time:new Date().toLocaleString(),avatar:'SA',isEmail:true});
    renderTimeline('sales-rm');
    updateNudgeBtn(curDetail);
    showToast(`Reminder sent to RM for ${curDetail.id}`,'success');
}

// =============================================
// FLIGHTS
// =============================================
function renderFlights(){
    const s=document.getElementById('flightSearch').value.toLowerCase(),
    rt=document.getElementById('routeFltFilter').value;
    const f=FLIGHTS.filter(fl=>{
        const ms=!s||fl.id.toLowerCase().includes(s)||fl.route.toLowerCase().includes(s)||fl.fromCity.toLowerCase().includes(s)||fl.toCity.toLowerCase().includes(s);
        const mrt=!rt||fl.route===rt;return ms&&mrt;
    });
    document.getElementById('flightGrid').innerHTML=f.map(fl=>{
        const sc=fl.seats>20?'sb-h':fl.seats>10?'sb-m':'sb-l';
        return`<div class="fc"><div class="fc-hd"><span class="fc-rt">${fl.from} → ${fl.to}</span><span class="fc-no">${fl.id} · ${fl.aircraft}</span></div><div class="fc-bd"><div class="fc-row"><div class="fc-dep"><div class="fc-city">${fl.from}</div><div class="fc-time">${fl.dep}</div></div><div class="fc-dur"><i class="fas fa-plane"></i> ${fl.duration}</div><div class="fc-arr"><div class="fc-city">${fl.to}</div><div class="fc-time">${fl.arr}</div></div></div><div class="fc-meta"><div class="fc-mi"><i class="fas fa-calendar"></i>${fl.date}</div><div class="fc-mi"><i class="fas fa-chair"></i><span class="sb-b ${sc}">${fl.seats} seats</span></div></div></div><div class="fc-ft"><span class="fc-pr">${fl.price} OMR <span>/pax</span></span></div></div>`;
    }).join('');
}
function filterFlights(){renderFlights()}

// =============================================
// NOTIFICATIONS
// =============================================
function renderNotifs(){
    const u=NOTIFS.filter(n=>n.unread).length;
    document.getElementById('notifDot').textContent=u;document.getElementById('notifDot').style.display=u?'flex':'none';
    document.getElementById('notifList').innerHTML=NOTIFS.map(n=>`
    <div class="np-it ${n.unread?'unread':''}" onclick="markRead(${n.id})"><div class="np-ic ${n.type}"><i class="fas fa-${n.type==='success'?'check':n.type==='warning'?'exclamation':'info'}"></i></div><div><div class="np-tx">${n.text}</div><div class="np-tm">${n.time}</div></div></div>`).join('');
}
function toggleNotif(){document.getElementById('notifPanel').classList.toggle('active')}
function markRead(id){const n=NOTIFS.find(x=>x.id===id);if(n){n.unread=false;renderNotifs()}}
function addNotif(type,text){NOTIFS.unshift({id:NOTIFS.length+1,type,text,time:'Just now',unread:true});renderNotifs()}

// =============================================
// THEME
// =============================================
function toggleTheme(){
    const h=document.documentElement,c=h.getAttribute('data-theme'),n=c==='dark'?'light':'dark';
    h.setAttribute('data-theme',n);document.getElementById('themeIcon').className=n==='dark'?'fas fa-sun':'fas fa-moon';
}

// =============================================
// TOAST
// =============================================
function showToast(msg,type='info'){
    const c=document.getElementById('toastBox'),t=document.createElement('div');t.className='toast '+type;
    t.innerHTML=`<i class="fas fa-${type==='success'?'check-circle':type==='error'?'times-circle':'info-circle'}"></i><span>${msg}</span>`;
    c.appendChild(t);setTimeout(()=>{t.style.animation='si .3s ease reverse';setTimeout(()=>t.remove(),300)},3000);
}

// =============================================
// CHARTS
// =============================================
function initCharts(){
    const ac=document.getElementById('approvalChart');if(!ac)return;
    charts.approval=new Chart(ac,{type:'bar',data:{labels:['Jan','Feb','Mar','Apr','May','Jun'],datasets:[{label:'Approved',data:[8,12,15,18,22,24],backgroundColor:'#10b981'},{label:'Rejected',data:[3,4,2,5,3,4],backgroundColor:'#ef4444'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:12}}},scales:{y:{beginAtZero:true,grid:{color:'rgba(0,0,0,.05)'}},x:{grid:{display:false}}}}});
    charts.route=new Chart(document.getElementById('routeChart'),{type:'doughnut',data:{labels:['MCT-DXB','MCT-KHI','MCT-BKK','MCT-COK','MCT-MLE'],datasets:[{data:[18500,12000,9800,6500,5600],backgroundColor:['#0d9488','#3b82f6','#f59e0b','#8b5cf6','#ef4444']}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:12,padding:15}}}}});
}

// =============================================
// EMAIL AGGREGATION INBOX
// =============================================
const INBOX_THREADS=[
{id:1,agent:'Sky Travels',route:'MCT-DXB',subject:'RE: REQ-2024-001 - Fare approval needed',preview:'Need urgent approval for corporate group booking...',time:'10 min ago',unread:true,msgCount:3,avatar:'ST',color:'#3b82f6'},
{id:2,agent:'OUA Travel',route:'MCT-KHI',subject:'RE: REQ-2024-002 - Wedding group RM status',preview:'RM replied with approved fare at 85 OMR...',time:'25 min ago',unread:true,msgCount:2,avatar:'OU',color:'#0d9488'},
{id:3,agent:'Gulf Air Travels',route:'MCT-COK',subject:'RE: REQ-2024-004 - Family reunion',preview:'New request submitted for family group...',time:'1 hour ago',unread:false,msgCount:1,avatar:'GA',color:'#f59e0b'},
{id:4,agent:'Sky Travels',route:'MCT-DXB',subject:'RE: REQ-2024-005 - Bulk rate rejected',preview:'RM confirmed cannot approve below 90 OMR...',time:'3 hours ago',unread:false,msgCount:4,avatar:'ST',color:'#3b82f6'},
{id:5,agent:'OUA Travel',route:'MCT-MLE',subject:'RE: REQ-2024-006 - Holiday group',preview:'Urgent request for Maldives holiday group...',time:'5 hours ago',unread:true,msgCount:1,avatar:'OU',color:'#0d9488'}
];

const CITIES=[{code:'ALL',name:'All Cities'},{code:'MCT',name:'Muscat'},{code:'DXB',name:'Dubai'},{code:'KHI',name:'Karachi'},{code:'BKK',name:'Bangkok'},{code:'COK',name:'Kochi'},{code:'MLE',name:'Maldives'}];

const AGENTS=[
{id:1,name:'Sky Travels',company:'Sky Travels LLC',email:'ops@skytravels.com',totalReqs:24,approved:18,pending:3,rejected:3,avatar:'ST'},
{id:2,name:'OUA Travel',company:'OUA Travel & Tours',email:'sales@ouatravel.com',totalReqs:16,approved:12,pending:2,rejected:2,avatar:'OU'},
{id:3,name:'Gulf Air Travels',company:'Gulf Air Travels Ltd',email:'bookings@gulfairtravels.com',totalReqs:8,approved:5,pending:2,rejected:1,avatar:'GA'}
];

let curCity='ALL';

function renderInbox(){
    const f=getFilteredInbox();
    document.getElementById('inboxContainer').innerHTML=f.map(t=>`
    <div class="inbox-item ${t.unread?'unread':''}" onclick="viewThread(${t.id})">
        <div class="inbox-av" style="background:${t.color}">${t.avatar}</div>
        <div class="inbox-main">
            <div class="inbox-hd">
                <span class="inbox-agent">${t.agent}</span>
                <span class="badge badge-submitted">${t.route}</span>
            </div>
            <div class="inbox-subject">${t.subject}</div>
            <div class="inbox-meta">
                <span><i class="fas fa-envelope"></i> ${t.preview.substring(0,60)}...</span>
            </div>
        </div>
        <div style="text-align:right">
            <div style="font-size:.75rem;color:var(--g400);margin-bottom:4px">${t.time}</div>
            <span class="inbox-count">${t.msgCount} msgs</span>
        </div>
    </div>`).join('');
}

function getFilteredInbox(){
    const s=document.getElementById('inboxSearch')?.value.toLowerCase()||'';
    return INBOX_THREADS.filter(t=>!s||t.agent.toLowerCase().includes(s)||t.subject.toLowerCase().includes(s)||t.route.toLowerCase().includes(s));
}
function filterInbox(){renderInbox()}
function viewThread(id){showToast(`Viewing email thread ${id} (demo)`,'info');}

// =============================================
// CITY-WISE VIEW
// =============================================
function renderCityTabs(){
    document.getElementById('cityTabs').innerHTML=CITIES.map(c=>`
    <div class="city-tab ${c.code===curCity?'active':''}" onclick="switchCity('${c.code}')">${c.name}</div>`).join('');
}

function switchCity(code){
    curCity=code;
    renderCityTabs();
    renderCityTable();
}

function renderCityTable(){
    let f=REQS;
    if(curCity!=='ALL') f=f.filter(r=>r.route.includes(curCity));
    document.getElementById('cityTbl').innerHTML=f.map(r=>`
    <tr><td><strong>${r.id}</strong></td><td>${r.agent}</td><td>${r.route}</td><td>${r.pax}</td><td>${r.price} OMR</td><td><span class="badge badge-${r.status}">${fmtStatus(r.status)}</span></td><td>${r.created}</td></tr>`).join('');
}

// =============================================
// AGENT HISTORY
// =============================================
function renderAgentList(){
    const f=getFilteredAgents();
    document.getElementById('agentList').innerHTML=f.map(a=>`
    <div class="agent-card" onclick="viewAgentHistory('${a.name}')">
        <div class="agent-card-hd">
            <div class="agent-card-av">${a.avatar}</div>
            <div class="agent-card-info">
                <div class="agent-card-name">${a.name}</div>
                <div class="agent-card-company">${a.company}</div>
            </div>
        </div>
        <div class="agent-card-stats">
            <div class="agent-stat"><div class="agent-stat-val">${a.totalReqs}</div><div class="agent-stat-label">Total</div></div>
            <div class="agent-stat"><div class="agent-stat-val" style="color:var(--suc)">${a.approved}</div><div class="agent-stat-label">Approved</div></div>
            <div class="agent-stat"><div class="agent-stat-val" style="color:var(--warn)">${a.pending}</div><div class="agent-stat-label">Pending</div></div>
        </div>
    </div>`).join('');
}

function getFilteredAgents(){
    const s=document.getElementById('agentSearch')?.value.toLowerCase()||'';
    return AGENTS.filter(a=>!s||a.name.toLowerCase().includes(s)||a.company.toLowerCase().includes(s));
}
function filterAgentHistory(){renderAgentList();}
function viewAgentHistory(name){showToast(`Viewing full history for ${name} (demo)`,'info');}

// Close modals on overlay click
document.querySelectorAll('.mo').forEach(o=>{o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('active')})});
