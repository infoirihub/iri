const toggle=document.querySelector('.menu-toggle');const nav=document.querySelector('.nav');toggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');toggle.setAttribute('aria-expanded','false')}));document.addEventListener('keydown',event=>{if(event.key==='Escape'&&nav.classList.contains('open')){nav.classList.remove('open');toggle.setAttribute('aria-expanded','false');toggle.focus();}});document.getElementById('year').textContent=new Date().getFullYear();const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.12});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));const dept=document.getElementById('department');const service=document.getElementById('service');const options={'Halal Research':['Ingredient Halal Status Assessment','Product Halal Assessment','Shariah Research Question','Technical Ingredient Query'],'Halal Training':['Basic Halal Awareness','Halal Internal Auditor Training','Halal Lead Auditor Training','HACCP / ISO / GMP Training','Corporate Training'],'Certification':['Halal Certification','ISO Certification','HACCP Certification','GMP Certification','Certification Consultancy'],'Laboratory Testing':['Food Product Testing','Ingredient Composition Analysis','Microbiological Testing','Chemical / Additive Analysis','Halal-related Product Testing','Species / DNA Identification','Gelatin / Collagen Source Analysis','Alcohol / Ethanol Analysis','Contaminants / Residue Testing','Find a Suitable Laboratory','Other'],'General Inquiry':['General Information','Partnership','Other']};
const labFields=document.getElementById('lab-request-fields');
const labSelect=document.getElementById('preferred-laboratory');
const requiredTest=document.querySelector('[name="required_test"]');
const formSubmitButton=document.querySelector('#inquiry-form button[type="submit"]');
function updateServices(){service.innerHTML='<option value="">Choose a service</option>';(options[dept.value]||[]).forEach(item=>{const option=document.createElement('option');option.textContent=item;service.appendChild(option)});const isLab=dept.value==='Laboratory Testing';labFields.hidden=!isLab;labSelect.required=isLab;requiredTest.required=isLab;if(formSubmitButton)formSubmitButton.innerHTML=isLab?'Submit lab testing request <span>→</span>':'Send enquiry <span>→</span>';}
dept.addEventListener('change',updateServices);document.querySelectorAll('[data-department]').forEach(link=>link.addEventListener('click',()=>{dept.value=link.dataset.department;updateServices()}));const inquiryForm=document.getElementById('inquiry-form');
const feedback=document.getElementById('form-feedback');
const whatsappLink=document.getElementById('whatsapp-enquiry');
inquiryForm.addEventListener('input',updateWhatsAppLink);
inquiryForm.addEventListener('change',updateWhatsAppLink);
function updateWhatsAppLink(){
  const data=Object.fromEntries(new FormData(inquiryForm).entries());
  const message='HalalBridge enquiry\\nName: '+(data.name||'')+'\\nEmail: '+(data.email||'')+'\\nCompany: '+(data.company||'')+'\\nDepartment: '+(data.department||'')+'\\nService: '+(data.service||'')+'\\nProduct / sample: '+(data.product_name||'')+'\\nPreferred laboratory: '+(data.preferred_laboratory||'')+'\\nRequired test: '+(data.required_test||'')+'\\nPreferred city: '+(data.preferred_city||'')+'\\nStandard: '+(data.standard||'')+'\\nPhone: '+(data.phone||'')+'\\nMessage: '+(data.message||'');
  whatsappLink.href='https://wa.me/92311211122291?text='+encodeURIComponent(message);
}
inquiryForm.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!inquiryForm.reportValidity()) return;
  const submitButton=inquiryForm.querySelector('button[type="submit"]');
  const isLabRequest=dept.value==='Laboratory Testing';
  submitButton.disabled=true;
  submitButton.textContent='Sending…';
  feedback.textContent='Sending your enquiry securely…';
  let databaseSaved=false;
  try{
    const formData=new FormData(inquiryForm);
    const config=window.HALALBRIDGE_SUPABASE||{};
    if(isLabRequest && config.url && config.anonKey && window.supabase){
      const db=window.supabase.createClient(config.url,config.anonKey);
      const request={
        name:String(formData.get('name')||'').trim(),
        email:String(formData.get('email')||'').trim(),
        company:String(formData.get('company')||'').trim()||null,
        phone:String(formData.get('phone')||'').trim()||null,
        product_name:String(formData.get('product_name')||'').trim()||null,
        preferred_city:String(formData.get('preferred_city')||'').trim()||null,
        preferred_laboratory:String(formData.get('preferred_laboratory')||'').trim(),
        required_test:String(formData.get('required_test')||'').trim(),
        department:'Laboratory Testing',
        service:String(formData.get('service')||'').trim()||null,
        standard:String(formData.get('standard')||'').trim()||null,
        message:String(formData.get('message')||'').trim()
      };
      const {error}=await db.from('lab_testing_requests').insert(request);
      if(error) throw new Error('Database submission failed: '+error.message);
      databaseSaved=true;
    }
    const response=await fetch(inquiryForm.action,{method:'POST',body:formData,headers:{'Accept':'application/json'}});
    const result=await response.json();
    if(!response.ok || result.success==='false') {
      if(databaseSaved) {
        feedback.textContent='Your lab request has been safely recorded in the HalalBridge dashboard, but the email notification could not be sent. Please also email contacthalalbridge@gmail.com if urgent.';
      } else throw new Error(result.message||'Email submission failed');
    } else {
      feedback.textContent=databaseSaved
        ?'Thank you. Your laboratory request has been recorded and the HalalBridge team has been notified.'
        :'Thank you. Your enquiry has been submitted successfully. Our team will contact you soon.';
    }
    inquiryForm.reset();
    updateServices();
    updateWhatsAppLink();
  }catch(error){
    if(isLabRequest && !databaseSaved && /Database submission failed/.test(error.message)){
      feedback.textContent='The admin database could not save this request. Please use WhatsApp or email contacthalalbridge@gmail.com so the team can receive it.';
    } else {
      feedback.textContent='We could not submit the form. Please use the WhatsApp option or email contacthalalbridge@gmail.com directly.';
    }
  }finally{
    submitButton.disabled=false;
    submitButton.innerHTML=dept.value==='Laboratory Testing'?'Submit lab testing request <span>→</span>':'Send enquiry <span>→</span>';
  }
});
updateServices();
updateWhatsAppLink();

/* Search and filter the laboratory directory */
(function(){
 const search=document.getElementById('lab-search');
 const city=document.getElementById('lab-city');
 const test=document.getElementById('lab-test');
 const grid=document.getElementById('lab-grid');
 if(!grid)return;
 const cards=[...grid.querySelectorAll('.lab-card')];
 const count=document.getElementById('lab-result-count');
 const empty=document.getElementById('lab-empty');
 function filterLabs(){
  const q=(search.value||'').trim().toLowerCase();
  const c=city.value.toLowerCase();
  const t=test.value.toLowerCase();
  let shown=0;
  cards.forEach(card=>{
   const matchesText=!q||card.textContent.toLowerCase().includes(q);
   const matchesCity=!c||card.dataset.city===c;
   const matchesTest=!t||(card.dataset.tests||'').split(' ').includes(t);
   const visible=matchesText&&matchesCity&&matchesTest;
   card.hidden=!visible;
   if(visible)shown++;
  });
  count.textContent='Showing '+shown+' of '+cards.length+' listed laboratories';
  empty.hidden=shown!==0;
 }
 [search,city,test].forEach(el=>el.addEventListener('input',filterLabs));
 [city,test].forEach(el=>el.addEventListener('change',filterLabs));
 document.querySelectorAll('[data-lab-enquiry]').forEach(link=>link.addEventListener('click',()=>{
  dept.value='Laboratory Testing';updateServices();
  const msg=document.querySelector('[name="message"]');
  if(msg&&!msg.value)msg.value='I would like help finding a suitable laboratory in Pakistan for product testing. Product / sample: ; Required test / parameter: ; Preferred city: ';
 }));
 filterLabs();
})();
