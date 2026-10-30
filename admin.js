(() => {
  const config = window.HALALBRIDGE_SUPABASE || {};
  const setupNotice = document.getElementById('setup-notice');
  const loginPanel = document.getElementById('login-panel');
  const dashboard = document.getElementById('dashboard');
  const loginFeedback = document.getElementById('login-feedback');
  const feedback = document.getElementById('dashboard-feedback');
  const rows = document.getElementById('request-rows');
  const dialog = document.getElementById('request-dialog');
  let client = null, requests = [], activeRequest = null;

  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtDate = value => value ? new Date(value).toLocaleString() : '—';
  const val = value => value && String(value).trim() ? String(value) : '—';

  if (!config.url || !config.anonKey || !window.supabase) {
    setupNotice.hidden = false;
    return;
  }
  client = window.supabase.createClient(config.url, config.anonKey, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

  function showLogin(){loginPanel.hidden=false;dashboard.hidden=true;document.getElementById('logout-button').hidden=true;document.getElementById('admin-user').textContent='';}
  function showDashboard(user){loginPanel.hidden=true;dashboard.hidden=false;document.getElementById('logout-button').hidden=false;document.getElementById('admin-user').textContent=user.email||'Administrator';loadRequests();}
  async function checkSession(){
    const {data:{session}}=await client.auth.getSession();
    if(!session){showLogin();return;}
    const {data:profile,error}=await client.from('admin_profiles').select('role').eq('id',session.user.id).maybeSingle();
    if(error||!profile||profile.role!=='admin'){await client.auth.signOut();showLogin();loginFeedback.textContent='This account is not authorised for the admin dashboard.';return;}
    showDashboard(session.user);
  }
  document.getElementById('login-form').addEventListener('submit',async event=>{
    event.preventDefault();loginFeedback.textContent='Signing in…';
    const form=new FormData(event.currentTarget);
    const {data,error}=await client.auth.signInWithPassword({email:form.get('email'),password:form.get('password')});
    if(error){loginFeedback.textContent=error.message;return;}
    const {data:profile,error:profileError}=await client.from('admin_profiles').select('role').eq('id',data.user.id).maybeSingle();
    if(profileError||!profile||profile.role!=='admin'){await client.auth.signOut();loginFeedback.textContent='Access denied. This account is not an authorised administrator.';return;}
    loginFeedback.textContent='';showDashboard(data.user);
  });
  document.getElementById('logout-button').addEventListener('click',async()=>{await client.auth.signOut();showLogin();});
  document.getElementById('refresh-button').addEventListener('click',loadRequests);
  async function loadRequests(){
    feedback.textContent='Loading requests…';
    const {data,error}=await client.from('lab_testing_requests').select('*').order('created_at',{ascending:false}).limit(500);
    if(error){feedback.textContent='Could not load requests: '+error.message;return;}
    requests=data||[];render();feedback.textContent=requests.length?'Requests loaded.':'No requests have been received yet.';
  }
  function render(){
    const query=document.getElementById('search-input').value.toLowerCase().trim();
    const status=document.getElementById('status-filter').value;
    const type=document.getElementById('type-filter').value;
    const filtered=requests.filter(r=>{
      const hay=[r.request_no,r.name,r.email,r.company,r.product_name,r.required_test,r.preferred_laboratory,r.preferred_city,r.message].join(' ').toLowerCase();
      return (!query||hay.includes(query))&&(!status||r.status===status)&&(!type||r.department===type);
    });
    const count=(s)=>requests.filter(r=>r.status===s).length;
    document.getElementById('count-total').textContent=requests.length;
    document.getElementById('count-pending').textContent=count('Pending');
    document.getElementById('count-review').textContent=count('Under Review');
    document.getElementById('count-process').textContent=count('In Process');
    document.getElementById('count-completed').textContent=count('Completed');
    if(!filtered.length){rows.innerHTML='<tr><td colspan="7" class="empty">No matching requests found.</td></tr>';return;}
    rows.innerHTML=filtered.map(r=>`<tr>
      <td><strong>HB-${escapeHTML(r.request_no)}</strong><small>${escapeHTML(r.department||'Laboratory Testing')}</small></td>
      <td>${escapeHTML(fmtDate(r.created_at))}</td>
      <td><strong>${escapeHTML(val(r.company||r.name))}</strong><small>${escapeHTML(val(r.name))} · ${escapeHTML(val(r.email))}</small></td>
      <td><strong>${escapeHTML(val(r.product_name))}</strong><small>${escapeHTML(val(r.required_test))}</small></td>
      <td>${escapeHTML(val(r.preferred_laboratory))}<small>${escapeHTML(val(r.preferred_city))}</small></td>
      <td><span class="status" data-status="${escapeHTML(r.status)}">${escapeHTML(r.status)}</span></td>
      <td><button class="text-button" data-open="${escapeHTML(r.id)}">Review →</button></td>
    </tr>`).join('');
    rows.querySelectorAll('[data-open]').forEach(button=>button.addEventListener('click',()=>openRequest(button.dataset.open)));
  }
  function detailItem(label,value,wide=false){
    return `<div class="detail-item ${wide?'wide':''}"><span>${escapeHTML(label)}</span><strong>${escapeHTML(val(value))}</strong></div>`;
  }
  function openRequest(id){
    activeRequest=requests.find(r=>r.id===id);if(!activeRequest)return;
    document.getElementById('detail-title').textContent='HB-'+activeRequest.request_no;
    document.getElementById('request-detail').innerHTML=[
      detailItem('Received',fmtDate(activeRequest.created_at)),detailItem('Status',activeRequest.status),
      detailItem('Applicant',activeRequest.name),detailItem('Email',activeRequest.email),
      detailItem('Company',activeRequest.company),detailItem('Phone',activeRequest.phone),
      detailItem('Product / sample',activeRequest.product_name),detailItem('Preferred city',activeRequest.preferred_city),
      detailItem('Preferred laboratory',activeRequest.preferred_laboratory,true),detailItem('Required test',activeRequest.required_test,true),
      detailItem('Service',activeRequest.service),detailItem('Standard',activeRequest.standard),
      detailItem('Applicant message',activeRequest.message,true)
    ].join('');
    document.getElementById('detail-status').value=activeRequest.status||'Pending';
    document.getElementById('detail-notes').value=activeRequest.internal_notes||'';
    document.getElementById('detail-feedback').textContent='';
    dialog.showModal();
  }
  async function saveRequest(event){
    event.preventDefault();if(!activeRequest)return;
    const button=dialog.querySelector('button[type="submit"]');button.disabled=true;
    const update={status:document.getElementById('detail-status').value,internal_notes:document.getElementById('detail-notes').value.trim(),updated_at:new Date().toISOString()};
    const {error}=await client.from('lab_testing_requests').update(update).eq('id',activeRequest.id);
    button.disabled=false;
    if(error){document.getElementById('detail-feedback').textContent='Could not save: '+error.message;return;}
    dialog.close();await loadRequests();
  }
  document.getElementById('request-detail-form').addEventListener('submit',saveRequest);
  document.getElementById('close-dialog').addEventListener('click',()=>dialog.close());
  document.getElementById('cancel-detail').addEventListener('click',()=>dialog.close());
  ['search-input','status-filter','type-filter'].forEach(id=>document.getElementById(id).addEventListener('input',render));
  document.getElementById('export-button').addEventListener('click',()=>{
    const fields=['request_no','created_at','name','email','company','phone','product_name','preferred_city','preferred_laboratory','required_test','department','service','standard','message','status','internal_notes'];
    const csv=[fields.join(','),...requests.map(r=>fields.map(k=>'"'+String(r[k]??'').replace(/"/g,'""')+'"').join(','))].join('\r\n');
    const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='halalbridge-requests.csv';a.click();URL.revokeObjectURL(url);
  });
  checkSession();
})();
