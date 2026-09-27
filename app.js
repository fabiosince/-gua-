const UNIT_NUMBERS=[...Array(8)].map((_,i)=>11+i).concat([...Array(8)].map((_,i)=>21+i),[...Array(8)].map((_,i)=>31+i),[...Array(8)].map((_,i)=>41+i),[...Array(8)].map((_,i)=>51+i),[...Array(8)].map((_,i)=>61+i),[...Array(8)].map((_,i)=>71+i),[...Array(8)].map((_,i)=>81+i),[...Array(8)].map((_,i)=>91+i),[...Array(8)].map((_,i)=>101+i)];
const UNITS=UNIT_NUMBERS.map(n=>({id:String(n),number:String(n),type:'residencial'})).concat([{id:'principal',number:'UNIDADE PRINCIPAL',type:'principal'}]);
let readings=JSON.parse(localStorage.getItem('agua_readings')||'{}');
let selectedId=null, deferredPrompt=null;
const $=id=>document.getElementById(id);
const today=()=>new Date().toISOString().slice(0,10);
const monthKey=()=>today().slice(0,7);
$('periodLabel').textContent=new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'});

function saveDB(){localStorage.setItem('agua_readings',JSON.stringify(readings))}
function current(id){return readings[id]?.[monthKey()]||null}
function latestPrevious(id){
  const arr=Object.values(readings[id]||{}).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  return arr.length?Number(arr[0].current||0):0;
}
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id));
  document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.screen===id));
  if(id==='leituras')renderUnits();
  if(id==='alertas')renderAlerts();
  updateDashboard();
}
function renderUnits(){
  const q=($('search').value||'').toLowerCase();
  const items=UNITS.filter(u=>`${u.number} ${u.id}`.toLowerCase().includes(q));
  $('unitList').innerHTML=items.map(u=>{
    const r=current(u.id), cons=r?Number(r.current)-Number(r.previous):null;
    const abnormal=r&&cons<0;
    return `<div class="unit">
      <div class="unit-left"><div class="unit-title">${u.number}</div>
      <div class="unit-meta">${u.type==='principal'?'Medição geral do condomínio':'Hidrômetro individual'}${r?.meterId?' • '+escapeHtml(r.meterId):''}</div>
      <span class="status ${abnormal?'danger':r?'ok':'pending'}">${abnormal?'ERRO DE LEITURA':r?'LEITURA REALIZADA':'PENDENTE'}</span>
      ${r?`<div class="unit-meta">Atual: ${fmt(r.current)} m³ • Consumo: ${fmt(cons)} m³</div>`:''}</div>
      <button class="${r?'secondary':'primary'}" onclick="openModal('${u.id}')">${r?'Editar':'Ler'}</button>
    </div>`;
  }).join('');
}
function fmt(n){return Number(n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function openModal(id){
  selectedId=id; const u=UNITS.find(x=>x.id===id), r=current(id);
  $('modalType').textContent=u.type==='principal'?'MEDIÇÃO PRINCIPAL':'UNIDADE RESIDENCIAL';
  $('modalTitle').textContent=u.number;
  $('readDate').value=r?.date||today();
  $('prevRead').value=r?.previous ?? latestPrevious(id);
  $('currentRead').value=r?.current ?? '';
  $('meterId').value=r?.meterId||'';
  $('notes').value=r?.notes||'';
  $('photo').value='';
  $('photoPreview').innerHTML=r?.photo?`<img src="${r.photo}" alt="Foto do hidrômetro">`: '';
  $('validation').textContent='';
  $('modal').classList.add('show');
}
function closeModal(){$('modal').classList.remove('show')}
$('currentRead').addEventListener('input',validateRead);
function validateRead(){
  const prev=Number($('prevRead').value||0), cur=Number($('currentRead').value||0);
  if(cur<prev){$('validation').textContent='⚠️ A leitura atual é menor que a anterior. Verifique o valor.';$('validation').style.color='#a52727'}
  else {$('validation').textContent=`Consumo do período: ${fmt(cur-prev)} m³`;$('validation').style.color='#14733d'}
}
$('photo').addEventListener('change',e=>{
  const f=e.target.files[0]; if(!f)return;
  const reader=new FileReader();reader.onload=()=>{$('photoPreview').innerHTML=`<img src="${reader.result}" alt="Foto do hidrômetro">`;};reader.readAsDataURL(f);
});
function saveReading(){
  const date=$('readDate').value||today(), prev=Number($('prevRead').value||0), cur=Number($('currentRead').value);
  if(!Number.isFinite(cur)||cur<0){toast('Informe uma leitura atual válida.');return}
  const commit=()=>{
    if(!readings[selectedId])readings[selectedId]={};
    const photoEl=$('photoPreview').querySelector('img');
    readings[selectedId][monthKey()]={date,previous:prev,current:cur,meterId:$('meterId').value.trim(),notes:$('notes').value.trim(),photo:photoEl?.src||null};
    saveDB();closeModal();renderUnits();renderAlerts();updateDashboard();toast('Leitura salva com sucesso.');
  };
  if(cur<prev && !confirm('A leitura atual é menor que a anterior. Deseja salvar mesmo assim?'))return;
  commit();
}
function updateDashboard(){
  let done=0,total=0, residential=0, main=0, alerts=0;
  UNITS.forEach(u=>{const r=current(u.id);if(r){done++;const c=Number(r.current)-Number(r.previous);if(u.type==='principal')main+=Math.max(0,c);else residential+=Math.max(0,c);if(c<0)alerts++;}});
  $('doneCount').textContent=done;$('pendingCount').textContent=81-done;$('donePct').textContent=Math.round(done/81*100)+'%';
  $('totalResidential').textContent=fmt(residential)+' m³';$('mainConsumption').textContent=fmt(main)+' m³';
  $('difference').textContent=fmt(main-residential)+' m³';$('alertCount').textContent=alerts;
}
function renderAlerts(){
  const out=[];
  UNITS.forEach(u=>{
    const r=current(u.id);if(!r)return;
    const c=Number(r.current)-Number(r.previous);
    if(c<0)out.push(`<div class="alert-item"><b>🔴 ${u.number}</b><br>Leitura atual menor que a anterior. Verificar registro.</div>`);
    const history=Object.values(readings[u.id]||{}).map(x=>Number(x.current)-Number(x.previous)).filter(x=>x>=0);
    if(history.length>=3){const avg=history.slice(-3).reduce((a,b)=>a+b,0)/Math.min(3,history.length);if(avg>0&&c>avg*1.8)out.push(`<div class="alert-item"><b>⚠️ ${u.number}</b><br>Consumo atual (${fmt(c)} m³) está acima do histórico recente (${fmt(avg)} m³).</div>`);}
  });
  $('alertsList').innerHTML=out.length?out.join(''):'<div class="panel"><b>✓ Nenhum alerta identificado.</b><p class="muted">O sistema analisará leituras anormais conforme o histórico for acumulado.</p></div>';
}
function exportCSV(){
  const rows=[['Unidade','Tipo','Data','Leitura anterior (m³)','Leitura atual (m³)','Consumo (m³)','Hidrômetro','Observações','Status']];
  UNITS.forEach(u=>{const r=current(u.id);rows.push([u.number,u.type,r?.date||'',r?.previous??'',r?.current??'',r?(Number(r.current)-Number(r.previous)).toFixed(2):'',r?.meterId||'',r?.notes||'',r?'Realizada':'Pendente'])});
  const csv=rows.map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(';')).join('\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`leituras-agua-${monthKey()}.csv`;a.click();URL.revokeObjectURL(a.href);
}
function backupJSON(){const blob=new Blob([JSON.stringify(readings,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='backup-leituras-agua.json';a.click();URL.revokeObjectURL(a.href)}
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2200)}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('installBtn').hidden=false});
$('installBtn').onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('installBtn').hidden=true};
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
renderUnits();updateDashboard();