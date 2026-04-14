// =============================================
// DATA
// =============================================
const REQS=[
{id:'REQ-2024-001',route:'MCT-DXB',travelDate:'2024-02-15',returnDate:'2024-02-20',pax:12,price:95,status:'review',priority:'urgent',agent:'Sky Travels',notes:'Group booking for corporate travel. Flexible on dates if better pricing available.',created:'2024-01-20',slaDeadline:'2024-01-21 18:00',tags:['VIP','Corporate'],reminderSent:false,reminderCount:0,
agentSales:[{type:'agent',author:'Sky Travels',text:'Need urgent approval for corporate group booking. Client is waiting.',time:'2024-01-20 09:30',avatar:'ST'},{type:'sales',author:'Sales Team',text:'Reviewing the request. Will get back with the best possible rate.',time:'2024-01-20 10:15',avatar:'SA'},{type:'agent',author:'Sky Travels',text:'Thank you. Please note this is for a VIP client — need response today.',time:'2024-01-20 11:00',avatar:'ST'}],
salesRm:[{type:'sales',author:'Sales Team',text:'Forwarding fare approval request for MCT-DXB, 12 pax at 95 OMR. Please advise.',time:'2024-01-20 10:30',avatar:'SA',isEmail:true},{type:'rm',author:'RM Office',text:'Under review. Will revert within 2 hours.',time:'2024-01-20 11:00',avatar:'RM',isEmail:true}]
},
{id:'REQ-2024-002',route:'MCT-KHI',travelDate:'2024-02-10',returnDate:'',pax:25,price:85,status:'rm',priority:'normal',agent:'Sky Travels',notes:'Wedding group — need adjacent seats if possible.',created:'2024-01-18',slaDeadline:'2024-01-19 18:00',tags:['Wedding'],reminderSent:false,reminderCount:0,
agentSales:[{type:'agent',author:'Sky Travels',text:'Requesting special fare for wedding group of 25 pax.',time:'2024-01-18 14:00',avatar:'ST'},{type:'sales',author:'Sales Team',text:'Sent to RM for approval at requested rate. Will update once we hear back.',time:'2024-01-18 15:30',avatar:'SA'}],
salesRm:[{type:'sales',author:'Sales Team',text:'Fare approval request: MCT-KHI, 25 pax at 85 OMR. Group is for wedding travel.',time:'2024-01-18 15:45',avatar:'SA',isEmail:true}]
},
{id:'REQ-2024-003',route:'MCT-BKK',travelDate:'2024-03-01',returnDate:'2024-03-10',pax:8,price:140,status:'approved',priority:'normal',agent:'Sky Travels',notes:'Leisure group — honeymoon travelers.',created:'2024-01-15',
agentSales:[{type:'agent',author:'Sky Travels',text:'Please approve at earliest convenience.',time:'2024-01-15 10:00',avatar:'ST'},{type:'sales',author:'Sales Team',text:'Approved at 130 OMR per pax. Congratulations!',time:'2024-01-16 09:00',avatar:'SA'}],
salesRm:[{type:'sales',author:'Sales Team',text:'Fare approval: MCT-BKK, 8 pax at 140 OMR.',time:'2024-01-15 11:00',avatar:'SA',isEmail:true},{type:'rm',author:'RM Office',text:'Approved at 130 OMR per pax.',time:'2024-01-15 14:00',avatar:'RM',isEmail:true}]
},
{id:'REQ-2024-004',route:'MCT-COK',travelDate:'2024-02-25',returnDate:'',pax:15,price:110,status:'submitted',priority:'normal',agent:'OUA Travel',notes:'Family reunion group.',created:'2024-01-19',
agentSales:[{type:'agent',author:'OUA Travel',text:'New request submitted for family group.',time:'2024-01-19 16:00',avatar:'OU'}],
salesRm:[]
},
{id:'REQ-2024-005',route:'MCT-DXB',travelDate:'2024-02-05',returnDate:'',pax:50,price:80,status:'rejected',priority:'urgent',agent:'Sky Travels',notes:'Large corporate event — but rate too low.',created:'2024-01-10',
agentSales:[{type:'agent',author:'Sky Travels',text:'Requesting special bulk rate for 50 pax corporate event.',time:'2024-01-10 09:00',avatar:'ST'},{type:'sales',author:'Sales Team',text:'Rate too low for this volume. Minimum 95 OMR required.',time:'2024-01-11 11:00',avatar:'SA'},{type:'agent',author:'Sky Travels',text:'Can we negotiate? Client has budget constraints.',time:'2024-01-11 12:00',avatar:'ST'},{type:'sales',author:'Sales Team',text:'Sorry, RM has confirmed 90 OMR is the floor for this route.',time:'2024-01-11 14:00',avatar:'SA'}],
salesRm:[{type:'sales',author:'Sales Team',text:'Bulk rate request: MCT-DXB, 50 pax at 80 OMR.',time:'2024-01-10 10:00',avatar:'SA',isEmail:true},{type:'rm',author:'RM Office',text:'Cannot approve below 90 OMR for this route. Reject.',time:'2024-01-11 09:00',avatar:'RM',isEmail:true}]
}
];

const FLIGHTS=[
{id:'OV101',route:'MCT-DXB',from:'MCT',to:'DXB',fromCity:'Muscat',toCity:'Dubai',dep:'06:00',arr:'07:30',duration:'1h 30m',date:'2024-02-01',seats:42,price:95,aircraft:'A320'},
{id:'OV103',route:'MCT-DXB',from:'MCT',to:'DXB',fromCity:'Muscat',toCity:'Dubai',dep:'14:00',arr:'15:30',duration:'1h 30m',date:'2024-02-01',seats:18,price:110,aircraft:'A320neo'},
{id:'OV201',route:'MCT-KHI',from:'MCT',to:'KHI',fromCity:'Muscat',toCity:'Karachi',dep:'08:00',arr:'10:30',duration:'2h 30m',date:'2024-02-05',seats:35,price:85,aircraft:'B737'},
{id:'OV203',route:'MCT-KHI',from:'MCT',to:'KHI',fromCity:'Muscat',toCity:'Karachi',dep:'22:00',arr:'00:30',duration:'2h 30m',date:'2024-02-05',seats:8,price:75,aircraft:'B737'},
{id:'OV301',route:'MCT-BKK',from:'MCT',to:'BKK',fromCity:'Muscat',toCity:'Bangkok',dep:'09:00',arr:'14:00',duration:'5h',date:'2024-02-10',seats:22,price:140,aircraft:'A321'},
{id:'OV303',route:'MCT-BKK',from:'MCT',to:'BKK',fromCity:'Muscat',toCity:'Bangkok',dep:'23:00',arr:'04:00',duration:'5h',date:'2024-02-10',seats:5,price:125,aircraft:'A321'},
{id:'OV401',route:'MCT-COK',from:'MCT',to:'COK',fromCity:'Muscat',toCity:'Kochi',dep:'07:30',arr:'12:30',duration:'3h 30m',date:'2024-02-15',seats:30,price:105,aircraft:'A320'},
{id:'OV501',route:'MCT-MLE',from:'MCT',to:'MLE',fromCity:'Muscat',toCity:'Maldives',dep:'10:00',arr:'15:00',duration:'4h 30m',date:'2024-02-01',seats:12,price:150,aircraft:'A320neo'}
];

const NOTIFS=[
{id:1,type:'success',text:'Request REQ-2024-003 has been approved',time:'2 min ago',unread:true},
{id:2,type:'info',text:'New message from Sales Team on REQ-2024-001',time:'15 min ago',unread:true},
{id:3,type:'warning',text:'RM replied on REQ-2024-005',time:'1 hour ago',unread:true},
{id:4,type:'info',text:'Request REQ-2024-002 sent to RM',time:'2 hours ago',unread:false},
{id:5,type:'success',text:'Counter offer accepted on REQ-2024-002',time:'3 hours ago',unread:false}
];

let curDetail=null;
let curConv='agent-sales';
let charts={};

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded',()=>{
    renderStats();renderRecent();renderAllReqs();renderNotifs();renderFlights();initCharts();
});

// =============================================
// NAVIGATION
// =============================================
function go(page){
    document.querySelectorAll('.pg').forEach(p=>p.classList.remove('active'));
    document.getElementById('pg-'+page).classList.add('active');
    document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
    document.querySelector(`.ni[onclick*="${page}"]`)?.classList.add('active');
    const titles={dashboard:'Agent Dashboard',requests:'All Requests',detail:'Request Details',flights:'Flight Availability',analytics:'Analytics'};
    document.getElementById('pageTitle').textContent=titles[page]||'Dashboard';
    if(page==='analytics')setTimeout(()=>Object.values(charts).forEach(c=>c.resize()),100);
    if(window.innerWidth<=768)toggleSidebar();
}

function toggleSidebar(){
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('sbOverlay').classList.toggle('active');
}

// =============================================
// STATS
// =============================================
function renderStats(){
    const t=REQS.length,p=REQS.filter(r=>['submitted','review','rm'].includes(r.status)).length,
    a=REQS.filter(r=>r.status==='approved').length,r=REQS.filter(r=>r.status==='rejected').length;
    document.getElementById('agentStats').innerHTML=`
    <div class="sc"><div class="si blue"><i class="fas fa-paper-plane"></i></div><div><div class="sv">${t}</div><div class="sl">Total Requests</div><div class="sch pos"><i class="fas fa-arrow-up"></i> 12%</div></div></div>
    <div class="sc"><div class="si yellow"><i class="fas fa-clock"></i></div><div><div class="sv">${p}</div><div class="sl">Pending</div></div></div>
    <div class="sc"><div class="si green"><i class="fas fa-check-circle"></i></div><div><div class="sv">${a}</div><div class="sl">Approved</div><div class="sch pos"><i class="fas fa-arrow-up"></i> 25%</div></div></div>
    <div class="sc"><div class="si red"><i class="fas fa-times-circle"></i></div><div><div class="sv">${r}</div><div class="sl">Rejected</div></div></div>`;
}

// =============================================
// TABLES
// =============================================
function fmtStatus(s){return{draft:'Draft',submitted:'Submitted',review:'Under Review',rm:'RM Pending',approved:'Approved',rejected:'Rejected'}[s]||s}

function getSLAStatus(deadline){
    if(!deadline)return null;
    const now=new Date(),sla=new Date(deadline);
    const hoursLeft=(sla-now)/(1000*60*60);
    if(hoursLeft<0)return{status:'overdue',text:'Overdue',class:'sla-overdue',icon:'fa-exclamation-circle'};
    if(hoursLeft<6)return{status:'warning',text:`${Math.ceil(hoursLeft)}h left`,class:'sla-warning',icon:'fa-clock'};
    return{status:'safe',text:`${Math.ceil(hoursLeft)}h left`,class:'sla-safe',icon:'fa-check-circle'};
}

function renderTags(tags){
    if(!tags||!tags.length)return'';
    return tags.map(t=>`<span class="badge-tag ${t.toLowerCase()}">${t}</span>`).join(' ');
}

function renderSLA(deadline){
    const sla=getSLAStatus(deadline);
    if(!sla)return'';
    return`<span class="sla-timer ${sla.class}"><i class="fas ${sla.icon}"></i> ${sla.text}</span>`;
}

function renderRecent(){
    document.getElementById('recentTbl').innerHTML=REQS.slice(0,4).map(r=>`
    <tr><td><strong>${r.id}</strong></td><td>${r.route} ${renderTags(r.tags)}</td><td>${r.pax}</td><td>${r.price} OMR</td><td><span class="badge badge-${r.status}">${fmtStatus(r.status)}</span> ${renderSLA(r.slaDeadline)}</td><td><span class="pdot ${r.priority}"></span> ${r.priority}</td><td>${r.status==='approved'?`<button class="btn btn-suc btn-sm" onclick="downloadRequest('${r.id}')"><i class="fas fa-download"></i> Download</button>`:`<button class="btn btn-o btn-sm" onclick="viewReq('${r.id}')">View</button>`}</td></tr>`).join('');
}

function renderAllReqs(){
    const f=getFiltered();
    if(!f.length){document.getElementById('allReqTbl').innerHTML='';document.getElementById('emptyState').style.display='block';return;}
    document.getElementById('emptyState').style.display='none';
    document.getElementById('allReqTbl').innerHTML=f.map(r=>`
    <tr><td><strong>${r.id}</strong></td><td>${r.route} ${renderTags(r.tags)}</td><td>${r.travelDate}</td><td>${r.pax}</td><td>${r.price} OMR</td><td><span class="badge badge-${r.status}">${fmtStatus(r.status)}</span> ${renderSLA(r.slaDeadline)}</td><td><span class="pdot ${r.priority}"></span> ${r.priority}</td><td>${r.created}</td><td>${r.status==='approved'?`<button class="btn btn-suc btn-sm" onclick="downloadRequest('${r.id}')"><i class="fas fa-download"></i> Download</button>`:`<button class="btn btn-o btn-sm" onclick="viewReq('${r.id}')"><i class="fas fa-eye"></i> View</button>`}</td></tr>`).join('');
}

function getFiltered(){
    const search = document.getElementById('searchInput').value.toLowerCase();
    const status = document.getElementById('statusFilter').value;
    const origin = document.getElementById('originFilter').value;
    const dest = document.getElementById('destFilter').value;
    const agent = document.getElementById('agentFilter').value;
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    
    return REQS.filter(req => {
        const matchesSearch = !search || 
            req.id.toLowerCase().includes(search) ||
            req.route.toLowerCase().includes(search) ||
            req.agent.toLowerCase().includes(search);
        const matchesStatus = !status || req.status === status;
        const matchesOrigin = !origin || req.route.startsWith(origin);
        const matchesDest = !dest || req.route.endsWith(dest);
        const matchesAgent = !agent || req.agent === agent;
        const matchesDateFrom = !dateFrom || req.travelDate >= dateFrom;
        const matchesDateTo = !dateTo || req.travelDate <= dateTo;
        
        return matchesSearch && matchesStatus && matchesOrigin && matchesDest && matchesAgent && matchesDateFrom && matchesDateTo;
    });
}

function resetFilters(){
    document.getElementById('searchInput').value='';
    document.getElementById('statusFilter').value='';
    document.getElementById('originFilter').value='';
    document.getElementById('destFilter').value='';
    document.getElementById('agentFilter').value='';
    document.getElementById('dateFrom').value='';
    document.getElementById('dateTo').value='';
    renderAllReqs();
    showToast('Filters reset','success');
}
function filterReqs(){renderAllReqs()}

function downloadRequest(id){
    showToast(`Downloading approval document for ${id} (demo)`,'success');
}

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
    document.getElementById('emSubject').textContent='Fare Approval Request — '+curDetail.id;
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
    curConv=tab;
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
    if(!msgs||!msgs.length){document.getElementById(el).innerHTML='<div class="empty"><div class="empty-i"><i class="fas fa-comments"></i></div><div class="empty-t">No messages yet</div><div class="empty-tx">Start the conversation</div></div>';return;}
    document.getElementById(el).innerHTML=msgs.map(m=>`
    <div class="tl-i">
        <div class="tl-a ${m.type}">${m.avatar}</div>
        <div class="tl-c ${m.type}">
            <div class="tl-hd"><span class="tl-au">${m.author}${m.isEmail?'<span class="em-b"><i class="fas fa-envelope"></i> Email</span>':''}</span><span class="tl-tm">${m.time}</span></div>
            <div class="tl-mg">${m.text}</div>
        </div>
    </div>`).join('');
}

function sendMsg(tab){
    if(!curDetail)return;
    const inputId=tab==='agent-sales'?'msgAS':null;
    if(!inputId)return;
    const el=document.getElementById(inputId);const txt=el.value.trim();if(!txt)return;
    const msg={type:'agent',author:'Sky Travels',text:txt,time:new Date().toLocaleString(),avatar:'ST'};
    curDetail.agentSales.push(msg);renderTimeline('agent-sales');el.value='';
    showToast('Message sent to Sales','success');
}

function simulateRMReply(){
    if(!curDetail)return;
    const approved=Math.random()>.3;
    const sp=Math.round(curDetail.price*(0.9+Math.random()*.2));
    const txt=approved?`Approved at ${sp} OMR per passenger.`:`Cannot approve. Minimum acceptable rate is ${sp} OMR.`;
    curDetail.salesRm.push({type:'rm',author:'RM Office',text:txt,time:new Date().toLocaleString(),avatar:'RM',isEmail:true});
    renderTimeline('sales-rm');
    if(approved){curDetail.status='approved';renderStatusFlow('approved');
    const sb=document.getElementById('detailStatus');sb.className='badge badge-approved';sb.textContent='Approved';
    showToast('RM approved the request!','success');}
    else{showToast('RM response received','warning');}
    addNotif('warning','RM replied on '+curDetail.id);
}

// =============================================
// AI
// =============================================
function updateAI(req){
    const sp=Math.round(req.price*.95),conf=Math.floor(70+Math.random()*25),rec=conf>80?'Accept':'Negotiate';
    document.getElementById('aiPrice').textContent=sp+' OMR';
    document.getElementById('confFill').style.width=conf+'%';
    document.getElementById('confText').textContent=conf+'%';
    const r=document.getElementById('aiRec');
    r.innerHTML=rec==='Accept'?'<i class="fas fa-check-circle"></i><span>Recommendation: Accept</span>':'<i class="fas fa-handshake"></i><span>Recommendation: Negotiate</span>';
    r.style.background=rec==='Accept'?'#d1fae5':'#fef3c7';r.style.color=rec==='Accept'?'#065f46':'#92400e';
}

// =============================================
// CREATE REQUEST
// =============================================
function openCreateModal(){document.getElementById('createModal').classList.add('active')}
function closeCreateModal(){document.getElementById('createModal').classList.remove('active')}

function saveDraft(){showToast('Draft saved successfully','success');closeCreateModal()}

function submitReq(){
    const route=document.getElementById('fRoute').value,pax=document.getElementById('fPax').value,
    price=document.getElementById('fPrice').value,travelDate=document.getElementById('fTravelDate').value,
    priority=document.getElementById('fPriority').value,notes=document.getElementById('fNotes').value;
    if(!route||!pax||!price||!travelDate){showToast('Please fill all required fields','error');return;}
    const nr={id:`REQ-${new Date().getFullYear()}-${String(REQS.length+1).padStart(3,'0')}`,route,travelDate,returnDate:document.getElementById('fReturnDate').value,pax:parseInt(pax),price:parseFloat(price),status:'submitted',priority,agent:'Sky Travels',notes,created:new Date().toISOString().split('T')[0],
    agentSales:[{type:'agent',author:'Sky Travels',text:'Request submitted for approval.',time:new Date().toLocaleString(),avatar:'ST'}],salesRm:[]};
    REQS.unshift(nr);renderStats();renderRecent();renderAllReqs();
    document.getElementById('createForm').reset();showToast('Request submitted successfully','success');closeCreateModal();
    addNotif('success','Your request '+nr.id+' has been submitted');
}

// =============================================
// FLIGHTS
// =============================================
function renderFlights(){
    const f=getFilteredFlights();
    document.getElementById('flightGrid').innerHTML=f.map(fl=>{
        const sc=fl.seats>20?'sb-h':fl.seats>10?'sb-m':'sb-l';
        const sl=fl.seats>20?'High':fl.seats>10?'Medium':'Low';
        return`<div class="fc">
        <div class="fc-hd"><span class="fc-rt">${fl.from} → ${fl.to}</span><span class="fc-no">${fl.id} · ${fl.aircraft}</span></div>
        <div class="fc-bd">
            <div class="fc-row"><div class="fc-dep"><div class="fc-city">${fl.from}</div><div class="fc-time">${fl.dep}</div></div><div class="fc-dur"><i class="fas fa-plane"></i> ${fl.duration}</div><div class="fc-arr"><div class="fc-city">${fl.to}</div><div class="fc-time">${fl.arr}</div></div></div>
            <div class="fc-meta"><div class="fc-mi"><i class="fas fa-calendar"></i>${fl.date}</div><div class="fc-mi"><i class="fas fa-chair"></i><span class="sb-b ${sc}">${fl.seats} seats (${sl})</span></div></div>
        </div>
        <div class="fc-ft"><span class="fc-pr">${fl.price} OMR <span>/pax</span></span><button class="btn btn-p btn-sm" onclick="openCreateModal()"><i class="fas fa-plus"></i> Request</button></div>
        </div>`;
    }).join('');
}

function getFilteredFlights(){
    const s=document.getElementById('flightSearch').value.toLowerCase(),
    rt=document.getElementById('routeFltFilter').value,
    dt=document.getElementById('dateFltFilter').value;
    return FLIGHTS.filter(fl=>{
        const ms=!s||fl.id.toLowerCase().includes(s)||fl.route.toLowerCase().includes(s)||fl.fromCity.toLowerCase().includes(s)||fl.toCity.toLowerCase().includes(s);
        const mrt=!rt||fl.route===rt;const mdt=!dt||fl.date===dt;
        return ms&&mrt&&mdt;
    });
}
function filterFlights(){renderFlights()}

// =============================================
// NOTIFICATIONS
// =============================================
function renderNotifs(){
    const u=NOTIFS.filter(n=>n.unread).length;
    document.getElementById('notifDot').textContent=u;
    document.getElementById('notifDot').style.display=u?'flex':'none';
    document.getElementById('notifList').innerHTML=NOTIFS.map(n=>`
    <div class="np-it ${n.unread?'unread':''}" onclick="markRead(${n.id})">
        <div class="np-ic ${n.type}"><i class="fas fa-${n.type==='success'?'check':n.type==='warning'?'exclamation':'info'}"></i></div>
        <div><div class="np-tx">${n.text}</div><div class="np-tm">${n.time}</div></div>
    </div>`).join('');
}

function toggleNotif(){document.getElementById('notifPanel').classList.toggle('active')}
function markRead(id){const n=NOTIFS.find(x=>x.id===id);if(n){n.unread=false;renderNotifs()}}
function addNotif(type,text){NOTIFS.unshift({id:NOTIFS.length+1,type,text,time:'Just now',unread:true});renderNotifs()}

// =============================================
// THEME
// =============================================
function toggleTheme(){
    const h=document.documentElement,c=h.getAttribute('data-theme'),n=c==='dark'?'light':'dark';
    h.setAttribute('data-theme',n);
    document.getElementById('themeIcon').className=n==='dark'?'fas fa-sun':'fas fa-moon';
}

// =============================================
// TOAST
// =============================================
function showToast(msg,type='info'){
    const c=document.getElementById('toastBox'),t=document.createElement('div');
    t.className='toast '+type;
    t.innerHTML=`<i class="fas fa-${type==='success'?'check-circle':type==='error'?'times-circle':'info-circle'}"></i><span>${msg}</span>`;
    c.appendChild(t);setTimeout(()=>{t.style.animation='si .3s ease reverse';setTimeout(()=>t.remove(),300)},3000);
}

// =============================================
// CHARTS
// =============================================
function initCharts(){
    const rc=document.getElementById('revenueChart');if(!rc)return;
    charts.revenue=new Chart(rc,{type:'line',data:{labels:['Jan','Feb','Mar','Apr','May','Jun'],datasets:[{label:'Revenue (OMR)',data:[32000,35000,38000,42000,45000,45250],borderColor:'#0d9488',backgroundColor:'rgba(13,148,136,.1)',fill:true,tension:.4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:'rgba(0,0,0,.05)'}},x:{grid:{display:false}}}}});
    charts.status=new Chart(document.getElementById('statusChart'),{type:'doughnut',data:{labels:['Approved','Pending','Rejected','RM Review'],datasets:[{data:[12,8,4,5],backgroundColor:['#10b981','#f59e0b','#ef4444','#8b5cf6']}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:12,padding:15}}}}});
}

// Close modals on overlay click
document.querySelectorAll('.mo').forEach(o=>{o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('active')})});
