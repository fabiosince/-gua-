const UNIT_NUMBERS=["11", "12", "13", "14", "15", "16", "17", "18", "21", "22", "23", "24", "25", "26", "27", "28", "31", "32", "33", "34", "35", "36", "37", "38", "41", "42", "43", "44", "45", "46", "47", "48", "51", "52", "53", "54", "55", "56", "57", "58", "61", "62", "63", "64", "65", "66", "67", "68", "71", "72", "73", "74", "75", "76", "77", "78", "81", "82", "83", "84", "85", "86", "87", "88", "91", "92", "93", "94", "95", "96", "97", "98", "101", "102", "103", "104", "105", "106", "107", "108", "PRINCIPAL"];
const KEY='agua_condominio_v2_data';
let state=loadState(),selected=null,photoData=null;
const $=id=>document.getElementById(id);
const monthKey=()=>new Date().toISOString().slice(0,7);
const today=()=>new Date().toISOString().slice(0,10);
const fmt=n=>Number(n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
function loadState(){try{return JSON.parse(localStorage.getItem(KEY))||{readings:[]}}catch(e){return {readings:[]}}}
function saveState(){localStorage.setItem(KEY,JSON.stringify(state))}
function showScreen(id){
 document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id));
 document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.screen===id));
 if(id==='readings')renderUnits(); if(id==='history')renderHistory(); if(id==='reports')updateDashboard(); if(id==='alerts')renderAlerts();
 window.scrollTo({top:0,behavior:'smooth'});
}
function unitObj(id){return {id,number:id,type:id==='PRINCIPAL'?'principal':'residencial',meter:state.meters?.[id]||''}}
function currentReading(id,period=monthKey()){return state.readings.find(r=>r.unitId===id&&r.period===period)}
function previousReading(id){
 const arr=state.readings.filter(r=>r.unitId===id).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 return arr[0]?.current||0;
}
function allUnits(){return UNIT_NUMBERS.map(unitObj)}
function updateDashboard(){
 const units=allUnits(), cur=units.map(u=>({u,r:currentReading(u.id)}));
 const done=cur.filter(x=>x.r).length;
 let res=0,main=0,alerts=0;
 cur.forEach(x=>{if(!x.r)return;const c=Number(x.r.current)-Number(x.r.previous);if(c<0)alerts++;if(x.u.type==='principal')main+=Math.max(c,0);else res+=Math.max(c,0)});
 $('done').textContent=done;$('donePct').textContent=Math.round(done/81*100)+'%';$('pending').textContent=81-done;$('alertCount').textContent=alerts;
 $('resTotal').textContent=fmt(res)+' m³';$('mainTotal').textContent=fmt(main)+' m³';$('diffTotal').textContent=fmt(main-res)+' m³';
 $('rDone').textContent=done;$('rRes').textContent=fmt(res)+' m³';$('rMain').textContent=fmt(main)+' m³';$('rAlerts').textContent=alerts;
}
function renderUnits(){
 const q=($('search').value||'').toLowerCase(), f=$('filter').value;
 let list=allUnits().filter(u=>String(u.number).toLowerCase().includes(q)||String(u.meter).toLowerCase().includes(q));
 list=list.filter(u=>{const r=currentReading(u.id),c=r?Number(r.current)-Number(r.previous):0;if(f==='pending')return !r;if(f==='done')return !!r&&c>=0;if(f==='alert')return !!r&&c<0;return true});
 $('unitList').innerHTML=list.map(u=>{
  const r=currentReading(u.id),c=r?Number(r.current)-Number(r.previous):0;
  const cls=!r?'pending':c<0?'alert':'ok',status=!r?'PENDENTE':c<0?'REVISAR':'REALIZADA';
  return `<div class="unit"><div><div class="unit-title">${u.number==='PRINCIPAL'?'UNIDADE PRINCIPAL':'UNIDADE '+u.number}</div><div class="unit-meta">${u.type==='principal'?'Medidor principal':'Hidrômetro individual'} ${u.meter?'• '+u.meter:''}</div><span class="status ${cls}">${status}</span>${r?`<div class="unit-meta">Atual: ${fmt(r.current)} m³ • Consumo: ${fmt(c)} m³</div>`:''}</div><button class="${r?'secondary':'primary'}" onclick="openModal('${u.id}')">${r?'Editar':'Ler'}</button></div>`;
 }).join('')||'<div class="panel">Nenhuma unidade encontrada.</div>';
}
function openModal(id){
 selected=unitObj(id);const r=currentReading(id);photoData=r?.photo||null;
 $('modalType').textContent=selected.type==='principal'?'MEDIÇÃO PRINCIPAL':'HIDRÔMETRO INDIVIDUAL';
 $('modalTitle').textContent=selected.number==='PRINCIPAL'?'Unidade Principal':'Unidade '+selected.number;
 $('readDate').value=r?.date||today();$('prev').value=r?.previous??previousReading(id);$('current').value=r?.current??'';$('meter').value=r?.meter||selected.meter||'';$('notes').value=r?.notes||'';
 $('photo').value='';$('photoPreview').innerHTML=photoData?`<img src="${photoData}" alt="Foto do hidrômetro">`:'';$('ocrStatus').textContent='';updateCalc();$('modal').classList.add('show');
}
function closeModal(){$('modal').classList.remove('show')}
function updateCalc(){const c=Number($('current').value||0)-Number($('prev').value||0);$('calc').textContent='Consumo: '+fmt(c)+' m³';$('calc').style.color=c<0?'#a32626':'#0b5cab'}
$('current').addEventListener('input',updateCalc);
$('photo').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const reader=new FileReader();reader.onload=()=>{photoData=reader.result;$('photoPreview').innerHTML=`<img src="${photoData}" alt="Foto do hidrômetro">`};reader.readAsDataURL(f)});
$('ocrBtn').onclick=async()=>{
 if(!photoData)return toast('Tire ou selecione uma foto primeiro.');
 if(!window.Tesseract)return toast('OCR indisponível sem internet.');
 $('ocrStatus').textContent='Lendo o visor…';
 try{
  const result=await Tesseract.recognize(photoData,'eng',{logger:m=>{if(m.status==='recognizing text')$('ocrStatus').textContent='OCR '+Math.round(m.progress*100)+'%'}});
  const nums=(result.data.text.match(/\d+(?:[.,]\d+)?/g)||[]).sort((a,b)=>b.length-a.length);
  if(nums.length){$('current').value=nums[0].replace(',','.');updateCalc();$('ocrStatus').textContent='Valor sugerido. Confira visualmente o hidrômetro antes de salvar.'}
  else $('ocrStatus').textContent='Não consegui identificar o visor. Informe manualmente.';
 }catch(e){$('ocrStatus').textContent='Não foi possível executar o OCR.'}
};
function saveReading(){
 const prev=Number($('prev').value||0),cur=Number($('current').value),date=$('readDate').value||today();
 if(!Number.isFinite(cur)||cur<0)return toast('Informe uma leitura válida.');
 if(cur<prev&&!confirm('A leitura atual é menor que a anterior. Salvar mesmo assim?'))return;
 state.meters=state.meters||{};state.meters[selected.id]=$('meter').value.trim();
 const record={unitId:selected.id,period:monthKey(),date,previous:prev,current:cur,meter:$('meter').value.trim(),notes:$('notes').value.trim(),photo:photoData||null,savedAt:new Date().toISOString()};
 const i=state.readings.findIndex(r=>r.unitId===selected.id&&r.period===monthKey());
 if(i>=0)state.readings[i]=record;else state.readings.push(record);
 saveState();closeModal();updateDashboard();renderUnits();toast('Leitura salva neste aparelho.');
}
function renderHistory(){
 const q=($('historySearch').value||'').toLowerCase();
 const rows=state.readings.filter(r=>r.unitId.toLowerCase().includes(q)).sort((a,b)=>b.savedAt.localeCompare(a.savedAt));
 $('historyList').innerHTML=rows.length?rows.map(r=>{
 const c=Number(r.current)-Number(r.previous);return `<div class="history-item"><b>${r.unitId==='PRINCIPAL'?'UNIDADE PRINCIPAL':'UNIDADE '+r.unitId}</b><div class="unit-meta">${r.date} • anterior ${fmt(r.previous)} • atual ${fmt(r.current)}</div><div><strong>Consumo: ${fmt(c)} m³</strong>${r.notes?` • ${r.notes}`:''}</div></div>`;
 }).join(''):'<div class="panel">Nenhuma leitura registrada ainda.</div>';
}
function renderAlerts(){
 const rows=state.readings.filter(r=>Number(r.current)<Number(r.previous));
 $('alertsList').innerHTML=rows.length?rows.map(r=>`<div class="history-item"><span class="status alert">REVISAR</span><h3>${r.unitId==='PRINCIPAL'?'Unidade Principal':'Unidade '+r.unitId}</h3><div class="unit-meta">Leitura atual ${fmt(r.current)} m³ menor que anterior ${fmt(r.previous)} m³.</div></div>`).join(''):'<div class="panel"><b>✓ Nenhum alerta crítico.</b><p class="muted">O sistema passará a gerar mais análises à medida que houver histórico.</p></div>';
}
function exportCSV(){
 const rows=[['Unidade','Tipo','Período','Data','Anterior (m³)','Atual (m³)','Consumo (m³)','Hidrômetro','Observações']];
 allUnits().forEach(u=>{const r=currentReading(u.id);if(r)rows.push([u.number,u.type,r.period,r.date,r.previous,r.current,(Number(r.current)-Number(r.previous)).toFixed(2),r.meter||'',r.notes||''])});
 const csv=rows.map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(';')).join('\n');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.download='leituras-agua-'+monthKey()+'.csv';a.click();
}
function backupJSON(){
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));a.download='backup-leituras-agua-'+today()+'.json';a.click();toast('Backup criado.');
}
$('restore').addEventListener('change',e=>{
 const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{try{const data=JSON.parse(rd.result);if(!Array.isArray(data.readings))throw Error();state=data;saveState();updateDashboard();renderUnits();toast('Backup restaurado.')}catch(x){toast('Arquivo de backup inválido.')}};rd.readAsText(f);
});
function clearAll(){if(confirm('Apagar TODAS as leituras deste aparelho? Esta ação não pode ser desfeita.')){localStorage.removeItem(KEY);state={readings:[]};updateDashboard();renderUnits();toast('Dados apagados.')}}
function printReport(){showScreen('reports');setTimeout(()=>window.print(),100)}
function toast(t){const el=$('toast');el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2300)}
$('period').textContent=new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
$('menuBtn').onclick=()=>showScreen('readings');
updateDashboard();renderUnits();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
