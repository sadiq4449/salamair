// =============================================
// DATA
// =============================================
const USERS=[
{id:1,name:'John Doe',email:'john@skytravels.com',role:'Agent',company:'Sky Travels',active:true,joined:'2023-06-15'},
{id:2,name:'Sarah Smith',email:'sarah@ouatravel.com',role:'Agent',company:'OUA Travel',active:true,joined:'2023-08-20'},
{id:3,name:'Rami Hassan',email:'rami@gulfair.com',role:'Agent',company:'Gulf Air Travels',active:false,joined:'2023-09-10'},
{id:4,name:'Mike Johnson',email:'mike@salamair.com',role:'Sales',company:'Salam Air',active:true,joined:'2023-03-01'},
{id:5,name:'Emily Brown',email:'emily@salamair.com',role:'Admin',company:'Salam Air',active:true,joined:'2022-11-15'},
{id:6,name:'Ahmed Ali',email:'ahmed@skytravels.com',role:'Agent',company:'Sky Travels',active:true,joined:'2024-01-05'},
{id:7,name:'Fatima Khan',email:'fatima@salamair.com',role:'Sales',company:'Salam Air',active:true,joined:'2023-07-22'},
{id:8,name:'Omar Rashid',email:'omar@ouatravel.com',role:'Agent',company:'OUA Travel',active:true,joined:'2024-01-18'}
];

const REQS=[
{id:'REQ-2024-001',route:'MCT-DXB',travelDate:'2024-02-15',pax:12,price:95,status:'review',priority:'urgent',agent:'Sky Travels',created:'2024-01-20'},
{id:'REQ-2024-002',route:'MCT-KHI',travelDate:'2024-02-10',pax:25,price:85,status:'rm',priority:'normal',agent:'OUA Travel',created:'2024-01-18'},
{id:'REQ-2024-003',route:'MCT-BKK',travelDate:'2024-03-01',pax:8,price:140,status:'approved',priority:'normal',agent:'Sky Travels',created:'2024-01-15'},
{id:'REQ-2024-004',route:'MCT-COK',travelDate:'2024-02-25',pax:15,price:110,status:'submitted',priority:'normal',agent:'Gulf Air Travels',created:'2024-01-19'},
{id:'REQ-2024-005',route:'MCT-DXB',travelDate:'2024-02-05',pax:50,price:80,status:'rejected',priority:'urgent',agent:'Sky Travels',created:'2024-01-10'},
{id:'REQ-2024-006',route:'MCT-MLE',travelDate:'2024-02-20',pax:10,price:130,status:'submitted',priority:'urgent',agent:'OUA Travel',created:'2024-01-21'}
];

const ACTIVITIES=[
{type:'approved',text:'REQ-2024-003 approved by Sales Team',time:'2 min ago'},
{type:'submitted',text:'REQ-2024-006 submitted by OUA Travel',time:'15 min ago'},
{type:'rm',text:'REQ-2024-002 forwarded to RM',time:'1 hour ago'},
{type:'rejected',text:'REQ-2024-005 rejected — below minimum fare',time:'2 hours ago'},
{type:'submitted',text:'New agent registered: Omar Rashid (OUA Travel)',time:'3 hours ago'},
{type:'approved',text:'REQ-2024-003 RM approved at 130 OMR',time:'4 hours ago'}
];

const NOTIFS=[
{id:1,type:'info',text:'New agent registered: Omar Rashid',time:'3 hours ago',unread:true},
{id:2,type:'warning',text:'User Rami Hassan deactivated',time:'5 hours ago',unread:true}
];

const AGENTS=[
{id:1,name:'Sky Travels',company:'Sky Travels LLC',email:'ops@skytravels.com',rating:4.8,creditLimit:50000,totalReqs:156,approved:142,rejected:14,status:'active',joined:'2022-03-15'},
{id:2,name:'OUA Travel',company:'OUA Travel & Tours',email:'sales@ouatravel.com',rating:4.5,creditLimit:35000,totalReqs:89,approved:78,rejected:11,status:'active',joined:'2022-06-20'},
{id:3,name:'Gulf Air Travels',company:'Gulf Air Travels Ltd',email:'bookings@gulfairtravels.com',rating:4.2,creditLimit:25000,totalReqs:45,approved:38,rejected:7,status:'warning',joined:'2023-01-10'},
{id:4,name:'Desert Wings',company:'Desert Wings Travel',email:'info@desertwings.com',rating:3.8,creditLimit:15000,totalReqs:23,approved:18,rejected:5,status:'inactive',joined:'2023-08-05'}
];

const LOGS=[
{id:1,type:'info',text:'User John Doe logged in',time:'2024-01-21 09:30:15',user:'John Doe'},
{id:2,type:'info',text:'Request REQ-2024-006 created',time:'2024-01-21 08:15:22',user:'OUA Travel'},
{id:3,type:'warning',text:'RM reminder sent for REQ-2024-002',time:'2024-01-21 07:45:10',user:'Sales Team'},
{id:4,type:'error',text:'Email delivery failed to revenue@salamair.com',time:'2024-01-21 06:30:05',user:'System'},
{id:5,type:'security',text:'Password changed for user Mike Johnson',time:'2024-01-20 16:20:30',user:'Mike Johnson'},
{id:6,type:'info',text:'Request REQ-2024-005 approved',time:'2024-01-20 14:10:18',user:'Sales Team'},
{id:7,type:'info',text:'New flight schedule uploaded',time:'2024-01-20 10:00:00',user:'Admin'},
{id:8,type:'warning',text:'SLA breach: REQ-2024-001 overdue',time:'2024-01-20 09:15:45',user:'System'}
];

let charts={};

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded',()=>{renderStats();renderUsers();renderAllReqs();renderActivity();renderNotifs();renderAgents();renderLogs();initCharts()});

// =============================================
// NAVIGATION
// =============================================
function go(page){
    document.querySelectorAll('.pg').forEach(p=>p.classList.remove('active'));
    document.getElementById('pg-'+page).classList.add('active');
    document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
    document.querySelector(`.ni[onclick*="${page}"]`)?.classList.add('active');
    const titles={dashboard:'Admin Dashboard',users:'User Management',agents:'Agent Management',requests:'All Requests',analytics:'System Analytics',logs:'System Logs',settings:'Settings'};
    document.getElementById('pageTitle').textContent=titles[page]||'Dashboard';
    if(page==='analytics')setTimeout(()=>Object.values(charts).forEach(c=>c.resize()),100);
    if(window.innerWidth<=768)toggleSidebar();
}
function toggleSidebar(){document.getElementById('sidebar').classList.toggle('active');document.getElementById('sbOverlay').classList.toggle('active')}

// =============================================
// STATS
// =============================================
function renderStats(){
    const totalReqs=REQS.length,activeUsers=USERS.filter(u=>u.active).length,
    totalAgents=USERS.filter(u=>u.role==='Agent').length,totalSales=USERS.filter(u=>u.role==='Sales').length;
    document.getElementById('adminStats').innerHTML=`
    <div class="sc"><div class="si blue"><i class="fas fa-paper-plane"></i></div><div><div class="sv">${totalReqs}</div><div class="sl">Total Requests</div></div></div>
    <div class="sc"><div class="si purple"><i class="fas fa-users"></i></div><div><div class="sv">${activeUsers}</div><div class="sl">Active Users</div></div></div>
    <div class="sc"><div class="si teal"><i class="fas fa-user-tie"></i></div><div><div class="sv">${totalAgents}</div><div class="sl">Agents</div></div></div>
    <div class="sc"><div class="si orange"><i class="fas fa-headset"></i></div><div><div class="sv">${totalSales}</div><div class="sl">Sales Reps</div></div></div>`;
}

// =============================================
// USER MANAGEMENT
// =============================================
function renderUsers(){
    const f=getFilteredUsers();
    document.getElementById('userTbl').innerHTML=f.map(u=>`
    <tr>
        <td><div style="display:flex;align-items:center;gap:10px"><div class="av" style="width:32px;height:32px;font-size:.72rem">${u.name.split(' ').map(n=>n[0]).join('')}</div><strong>${u.name}</strong></div></td>
        <td>${u.email}</td><td>${u.company}</td>
        <td><span class="badge badge-${u.role.toLowerCase()}">${u.role}</span></td>
        <td><span class="badge badge-${u.active?'active':'inactive'}">${u.active?'Active':'Inactive'}</span></td>
        <td>${u.joined}</td>
        <td><div style="display:flex;gap:6px;align-items:center">
            <div class="tg ${u.active?'on':''}" onclick="toggleUser(${u.id})" title="${u.active?'Deactivate':'Activate'}"></div>
            <button class="btn btn-o btn-sm" onclick="editUser(${u.id})"><i class="fas fa-edit"></i></button>
        </div></td>
    </tr>`).join('');
}

function getFilteredUsers(){
    const s=document.getElementById('userSearch').value.toLowerCase(),
    r=document.getElementById('roleFilter').value;
    return USERS.filter(u=>{
        const ms=!s||u.name.toLowerCase().includes(s)||u.email.toLowerCase().includes(s)||u.company.toLowerCase().includes(s);
        const mr=!r||u.role===r;return ms&&mr;
    });
}
function filterUsers(){renderUsers()}

function toggleUser(id){
    const u=USERS.find(x=>x.id===id);if(!u)return;
    u.active=!u.active;renderUsers();renderStats();
    showToast(`User ${u.active?'activated':'deactivated'}: ${u.name}`,u.active?'success':'warning');
}

function editUser(id){
    const u=USERS.find(x=>x.id===id);if(!u)return;
    showToast(`Edit mode for ${u.name} (demo only)`,'info');
}

function openAddUserModal(){document.getElementById('addUserModal').classList.add('active')}
function closeAddUserModal(){document.getElementById('addUserModal').classList.remove('active')}

function addUser(){
    const name=document.getElementById('uName').value,email=document.getElementById('uEmail').value,
    company=document.getElementById('uCompany').value,role=document.getElementById('uRole').value;
    if(!name||!email){showToast('Please fill required fields','error');return;}
    USERS.push({id:USERS.length+1,name,email,role,company:company||'N/A',active:true,joined:new Date().toISOString().split('T')[0]});
    renderUsers();renderStats();closeAddUserModal();
    document.getElementById('uName').value='';document.getElementById('uEmail').value='';document.getElementById('uCompany').value='';
    showToast(`User ${name} added successfully`,'success');
}

// =============================================
// ALL REQUESTS
// =============================================
function fmtStatus(s){return{draft:'Draft',submitted:'Submitted',review:'Under Review',rm:'RM Pending',approved:'Approved',rejected:'Rejected'}[s]||s}

function renderAllReqs(){
    const f=getFilteredReqs();
    document.getElementById('allReqTbl').innerHTML=f.map(r=>`
    <tr><td><strong>${r.id}</strong></td><td>${r.agent}</td><td>${r.route}</td><td>${r.travelDate}</td><td>${r.pax}</td><td>${r.price} OMR</td><td><span class="badge badge-${r.status}">${fmtStatus(r.status)}</span></td><td><span class="badge badge-${r.priority}">${r.priority}</span></td><td>${r.created}</td></tr>`).join('');
}

function getFilteredReqs(){
    const s=document.getElementById('reqSearch').value.toLowerCase(),
    st=document.getElementById('reqStatusFilter').value,
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
        return ms&&mst&&mor&&md&&ma&&msales&&mdf&&mdt;
    });
}

function resetFilters(){
    document.getElementById('reqSearch').value='';
    document.getElementById('reqStatusFilter').value='';
    document.getElementById('originFilter').value='';
    document.getElementById('destFilter').value='';
    document.getElementById('agentFilter').value='';
    document.getElementById('salesFilter').value='';
    document.getElementById('dateFrom').value='';
    document.getElementById('dateTo').value='';
    renderAllReqs();
    showToast('Filters reset','success');
}
function filterReqs(){renderAllReqs()}

// =============================================
// ACTIVITY LOG
// =============================================
function renderActivity(){
    document.getElementById('activityLog').innerHTML=ACTIVITIES.map(a=>`
    <div class="act-item"><div class="act-icon ${a.type}"><i class="fas fa-${a.type==='approved'?'check':a.type==='rejected'?'times':a.type==='rm'?'envelope':'plus'}"></i></div><div class="act-text">${a.text}</div><div class="act-time">${a.time}</div></div>`).join('');
}

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
    const sc=document.getElementById('statusChart');if(!sc)return;
    charts.status=new Chart(sc,{type:'doughnut',data:{labels:['Submitted','Under Review','RM Pending','Approved','Rejected'],datasets:[{data:[2,1,1,1,1],backgroundColor:['#3b82f6','#f59e0b','#8b5cf6','#10b981','#ef4444']}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:12,padding:12}}}}});
    charts.role=new Chart(document.getElementById('roleChart'),{type:'doughnut',data:{labels:['Agents','Sales','Admins'],datasets:[{data:[5,2,1],backgroundColor:['#3b82f6','#0d9488','#8b5cf6']}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:12,padding:12}}}}});
    charts.revenue=new Chart(document.getElementById('revenueChart'),{type:'line',data:{labels:['Jan','Feb','Mar','Apr','May','Jun'],datasets:[{label:'Revenue (OMR)',data:[18000,22000,28000,35000,42000,45000],borderColor:'#0d9488',backgroundColor:'rgba(13,148,136,.1)',fill:true,tension:.4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:'rgba(0,0,0,.05)'}},x:{grid:{display:false}}}}});
    charts.route=new Chart(document.getElementById('routeChart'),{type:'bar',data:{labels:['MCT-DXB','MCT-KHI','MCT-BKK','MCT-COK','MCT-MLE'],datasets:[{label:'Requests',data:[18,14,10,8,5],backgroundColor:'#0d9488'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:'rgba(0,0,0,.05)'}},x:{grid:{display:false}}}}});
}

// =============================================
// AGENT MANAGEMENT
// =============================================
function renderAgents(){
    const f=getFilteredAgents();
    document.getElementById('agentTbl').innerHTML=f.map(a=>`
    <tr>
        <td><div style="display:flex;align-items:center;gap:10px"><div class="av" style="width:32px;height:32px;font-size:.72rem;background:${getStatusColor(a.status)}">${a.name.substring(0,2).toUpperCase()}</div><div><strong>${a.name}</strong><div style="font-size:.75rem;color:var(--g400)">${a.email}</div></div></div></td>
        <td>${a.company}</td>
        <td>${renderStars(a.rating)}</td>
        <td>${a.creditLimit.toLocaleString()} OMR</td>
        <td>${a.totalReqs}</td>
        <td><span style="color:var(--suc)">${a.approved}</span> / <span style="color:var(--dan)">${a.rejected}</span></td>
        <td><span class="badge badge-${a.status}">${a.status}</span></td>
        <td><button class="btn btn-o btn-sm" onclick="showToast('Edit agent ${a.name} (demo)','info')"><i class="fas fa-edit"></i></button></td>
    </tr>`).join('');
}

function getFilteredAgents(){
    const s=document.getElementById('agentSearch')?.value.toLowerCase()||'';
    return AGENTS.filter(a=>!s||a.name.toLowerCase().includes(s)||a.company.toLowerCase().includes(s)||a.email.toLowerCase().includes(s));
}
function filterAgents(){renderAgents();}

function getStatusColor(status){
    return{active:'linear-gradient(135deg,#10b981,#059669)',warning:'linear-gradient(135deg,#f59e0b,#d97706)',inactive:'linear-gradient(135deg,#ef4444,#dc2626)'}[status]||'var(--g400)';
}

function renderStars(rating){
    const full=Math.floor(rating),half=rating%1>=0.5;
    let html='';
    for(let i=0;i<full;i++)html+='<i class="fas fa-star" style="color:#f59e0b"></i>';
    if(half)html+='<i class="fas fa-star-half-alt" style="color:#f59e0b"></i>';
    for(let i=full+(half?1:0);i<5;i++)html+='<i class="far fa-star" style="color:var(--g300)"></i>';
    return html+' <span style="font-size:.8rem;color:var(--g500)">'+rating+'</span>';
}

// =============================================
// SYSTEM LOGS
// =============================================
function renderLogs(){
    const f=getFilteredLogs();
    document.getElementById('logsContainer').innerHTML=f.map(l=>`
    <div class="log-item log-${l.type}">
        <div class="log-icon"><i class="fas fa-${l.type==='error'?'times-circle':l.type==='warning'?'exclamation-triangle':l.type==='security'?'shield-alt':'info-circle'}"></i></div>
        <div class="log-content">
            <div class="log-text">${l.text}</div>
            <div class="log-meta"><span class="log-user"><i class="fas fa-user"></i> ${l.user}</span><span class="log-time"><i class="fas fa-clock"></i> ${l.time}</span></div>
        </div>
        <div class="log-badge">${l.type.toUpperCase()}</div>
    </div>`).join('');
}

function getFilteredLogs(){
    const s=document.getElementById('logSearch')?.value.toLowerCase()||'';
    const t=document.getElementById('logTypeFilter')?.value||'';
    return LOGS.filter(l=>{
        const ms=!s||l.text.toLowerCase().includes(s)||l.user.toLowerCase().includes(s);
        const mt=!t||l.type===t;
        return ms&&mt;
    });
}
function filterLogs(){renderLogs();}

// Close modals on overlay click
document.querySelectorAll('.mo').forEach(o=>{o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('active')})});
