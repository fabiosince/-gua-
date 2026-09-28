const UNIT_NUMBERS=["11","12","13","14","15","16","17","18","21","22","23","24","25","26","27","28","31","32","33","34","35","36","37","38","41","42","43","44","45","46","47","48","51","52","53","54","55","56","57","58","61","62","63","64","65","66","67","68","71","72","73","74","75","76","77","78","81","82","83","84","85","86","87","88","91","92","93","94","95","96","97","98","101","102","103","104","105","106","107","108","PRINCIPAL"];
const KEY='agua_condominio_v2_data';
const APP_VERSION='V2.29';
const $=id=>document.getElementById(id);
const monthKey=(d=new Date())=>{const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0');return `${y}-${m}`};
let state=loadState(),selected=null,photoData=null,ocrPhotoData=null,selectedPeriod=monthKey();
const today=()=>new Date().toISOString().slice(0,10);
const fmt=n=>Number(n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
function loadState(){try{const data=JSON.parse(localStorage.getItem(KEY))||{readings:[]};data.readings=Array.isArray(data.readings)?data.readings:[];data.references=data.references||{};data.closures=data.closures||{};data.readings.forEach(r=>{const arr=data.readings.filter(x=>x.unitId===r.unitId&&x.period<r.period).sort((a,b)=>b.period.localeCompare(a.period)||String(b.date).localeCompare(String(a.date)));if(arr[0]?.current!==undefined)r.previous=Number(arr[0].current);else if(data.references?.[r.period]?.[r.unitId]!==undefined)r.previous=Number(data.references[r.period][r.unitId]);});return data}catch(e){return {readings:[],references:{},closures:{}}}}
function saveState(){localStorage.setItem(KEY,JSON.stringify(state))}
function isClosed(period=selectedPeriod){return !!state.closures?.[period]}
function toggleClosure(){
  state.closures=state.closures||{};
  if(isClosed()){
    if(!confirm('Reabrir o fechamento de '+periodLabel(selectedPeriod)+' para permitir alterações?'))return;
    delete state.closures[selectedPeriod];
    saveState();
    renderReports(); renderUnitPanel(); renderUnits(); renderAlerts();
    toast('Mês reaberto para edição.');
    return;
  }
  const d=reportData();
  if(d.done<81){
    if(!confirm(`Há ${81-d.done} leituras pendentes. Fechar mesmo assim?`))return;
  }
  if(d.alerts.length>0){
    if(!confirm(`Existem ${d.alerts.length} alerta(s) de consumo. Fechar mesmo assim?`))return;
  }
  state.closures[selectedPeriod]={closedAt:new Date().toISOString()};
  saveState();
  renderReports(); renderUnitPanel(); renderUnits(); renderAlerts();
  toast('Mês '+periodLabel(selectedPeriod)+' marcado como fechado.');
}

function periodLabel(p){const [y,m]=p.split('-');return new Date(Number(y),Number(m)-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}
function setUnitFilter(value){$('filter').value=value;document.querySelectorAll('.filter-chip').forEach(b=>b.classList.toggle('active',b.dataset.filter===value));renderUnits();}
let guidedMode=false;
let mapFilter='all';
function startGuidedReading(){guidedMode=true;showScreen('readings');renderUnits();setTimeout(()=>openNextPending(),80);toast('Modo de leitura iniciado. Após salvar, a próxima pendente será aberta.');}
function updateModalProgress(){const total=allUnits().length, done=allUnits().filter(u=>!!currentReading(u.id)).length;const pos=selected?allUnits().findIndex(u=>u.id===selected.id)+1:0;if($('modalProgress'))$('modalProgress').textContent=pos?`Unidade ${pos} de ${total} • ${done}/${total} concluídas`:'';}
function openNextPending(){const search=document.getElementById('search');if(search)search.value='';const filter=document.getElementById('filter');if(filter)filter.value='all';const u=allUnits().find(x=>!currentReading(x.id));if(!u){guidedMode=false;return toast('Todas as unidades deste mês já possuem leitura.');}showScreen('readings');setTimeout(()=>openModal(u.id),40);}
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id));document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.screen===id));if(id==='dashboard')renderUnitPanel();if(id==='readings')renderUnits();if(id==='history')renderHistory();if(id==='reports')renderReports();if(id==='alerts')renderAlerts();if(id==='references')renderReferences();if(id==='map')renderUnitMap();window.scrollTo({top:0,behavior:'smooth'})}
function unitObj(id){return {id,number:id,type:id==='PRINCIPAL'?'principal':'residencial',meter:state.meters?.[id]||''}}
function currentReading(id,period=selectedPeriod){return state.readings.find(r=>r.unitId===id&&r.period===period)}
function previousReading(id,period=selectedPeriod){const arr=state.readings.filter(r=>r.unitId===id&&r.period<period).sort((a,b)=>b.period.localeCompare(a.period)||String(b.date).localeCompare(String(a.date)));if(arr[0]?.current!==undefined&&arr[0]?.current!==null)return Number(arr[0].current);const ref=state.references?.[period]?.[id];if(ref!==undefined&&ref!==null&&ref!=='')return Number(ref);return 0}
function allUnits(){return UNIT_NUMBERS.map(unitObj)}
function setPeriod(v){if(!/^\d{4}-\d{2}$/.test(v))return;selectedPeriod=v;$('periodPicker').value=v;$('period').textContent=periodLabel(v);updateDashboard();renderUnitPanel();renderUnits();renderAlerts();renderReports();renderUnitMap();renderHistory()}
function shiftPeriod(delta){const [y,m]=selectedPeriod.split('-').map(Number);const d=new Date(y,m-1+delta,1);setPeriod(monthKey(d))}
function updateDashboard(){const units=allUnits(),cur=units.map(u=>({u,r:currentReading(u.id)}));const done=cur.filter(x=>x.r).length;let res=0,main=0,alerts=0;cur.forEach(x=>{if(!x.r)return;const c=Number(x.r.current)-Number(x.r.previous);const st=consumptionStatus(x.u.id,c,selectedPeriod);if(st.level==='warning'||st.level==='critical'||st.level==='negative')alerts++;if(x.u.type==='principal')main+=Math.max(c,0);else res+=Math.max(c,0)});$('done').textContent=done;$('donePct').textContent=Math.round(done/81*100)+'%';$('pending').textContent=81-done;$('alertCount').textContent=alerts;$('resTotal').textContent=fmt(res)+' m³';$('mainTotal').textContent=fmt(main)+' m³';$('diffTotal').textContent=fmt(main-res)+' m³'}
function clearDashboardUnitSearch(){const input=$('dashboardUnitSearch');if(input){input.value='';renderUnitPanel();input.focus()}}
function unitMapStatus(u){
  const r=currentReading(u.id);
  if(!r)return 'pending';
  const c=consumption(r);
  return c>50?'alert':(c>25?'alert':'done');
}
function setMapFilter(filter){
  mapFilter=filter;
  document.querySelectorAll('[data-map-filter]').forEach(b=>b.classList.toggle('active',b.dataset.mapFilter===filter));
  renderUnitMap();
}
function renderUnitMap(){
  const grid=$('unitMap');if(!grid)return;
  const q=($('mapSearch')?.value||'').trim().toLowerCase();
  const units=allUnits().filter(u=>{
    const r=currentReading(u.id), status=unitMapStatus(u);
    const hay=`${u.number} ${u.meter||''} ${u.id}`.toLowerCase();
    const match=!q||hay.includes(q);
    return match && (mapFilter==='all'||(mapFilter==='pending'&&!r)||(mapFilter==='done'&&status==='done')||(mapFilter==='alert'&&status==='alert'));
  });
  const counts={done:0,pending:0,alert:0};allUnits().forEach(u=>counts[unitMapStatus(u)]++);
  if($('mapDone'))$('mapDone').textContent=counts.done;
  if($('mapPending'))$('mapPending').textContent=counts.pending;
  if($('mapAlert'))$('mapAlert').textContent=counts.alert;
  grid.innerHTML=units.map(u=>{
    const r=currentReading(u.id),status=unitMapStatus(u), c=r?consumption(r):null;
    const icon=status==='done'?'🟢':status==='alert'?'🔴':'🟡';
    const label=!r?'Pendente':`${fmt(c)} m³`;
    return `<button class="unit-map-card ${status}" onclick="openModal('${u.id}')"><span class="unit-map-icon">${icon}</span><strong>${u.number==='PRINCIPAL'?'PRINCIPAL':'${u.number}'}</strong><small>${label}</small>${u.meter?`<em>${u.meter}</em>`:''}</button>`;
  }).join('') || '<div class="empty">Nenhuma unidade encontrada.</div>';
}
function renderUnitPanel(){
  const el=$('unitPanel');
  if(!el)return;
  const q=($('dashboardUnitSearch')?.value||'').trim().toLowerCase();
  const all=allUnits();
  const units=q?all.filter(u=>{const label=u.number==='PRINCIPAL'?'principal unidade principal':`unidade ${u.number}`;return label.toLowerCase().includes(q)||String(u.meter||'').toLowerCase().includes(q)}):all;
  let done=0, warning=0, critical=0;
  el.innerHTML=units.map(u=>{
    const r=currentReading(u.id);
    const c=r?Number(r.current)-Number(r.previous):0;
    const st=r?consumptionStatus(u.id,c,selectedPeriod):{level:'pending',label:'Leitura pendente',reason:''};
    const status=!r?'pending':st.level==='critical'?'critical':st.level==='warning'?'warning':st.level==='negative'?'critical':'done';
    if(r)done++;
    if(status==='warning')warning++;
    if(status==='critical')critical++;
    const label=u.number==='PRINCIPAL'?'PRINCIPAL':u.number;
    const icon=status==='done'?'✓':status==='critical'?'!':status==='warning'?'⚠':'•';
    const title=status==='done'?`Normal • ${fmt(c)} m³`:status==='warning'?`Suspeita • ${fmt(c)} m³ • ${st.reason}`:status==='critical'?`Acima do normal • ${fmt(c)} m³ • ${st.reason}`:'Leitura pendente';
    return `<button class="unit-panel-item ${status}" title="${title}" onclick="openModal('${u.id}')"><span class="unit-panel-number">${label}</span><span class="unit-panel-status">${icon}</span></button>`;
  }).join('') || '<div class="panel" style="grid-column:1/-1">Nenhuma unidade encontrada para esta busca.</div>';
  $('panelDone').textContent=`${done}/${all.length}`;
  const summary=$('panelRiskSummary');
  if(summary)summary.innerHTML=`<span class="risk-mini normal">● Normal</span><span class="risk-mini warning">⚠ Suspeita: ${warning}</span><span class="risk-mini critical">! Acima do normal: ${critical}</span>`;
}

function renderUnits(){const q=($('search').value||'').toLowerCase(),f=$('filter').value;let list=allUnits().filter(u=>String(u.number).toLowerCase().includes(q)||String(u.meter).toLowerCase().includes(q));list=list.filter(u=>{const r=currentReading(u.id),c=r?Number(r.current)-Number(r.previous):0,st=r?consumptionStatus(u.id,c,selectedPeriod):{level:'pending'};if(f==='pending')return !r;if(f==='done')return !!r&&st.level==='normal';if(f==='warning')return !!r&&st.level==='warning';if(f==='critical')return !!r&&st.level==='critical';if(f==='alert')return !!r&&(st.level==='warning'||st.level==='critical'||st.level==='negative');return true});$('unitList').innerHTML=list.map(u=>{const r=currentReading(u.id),c=r?Number(r.current)-Number(r.previous):0,st=r?consumptionStatus(u.id,c,selectedPeriod):{level:'pending',label:'PENDENTE',reason:''};const cls=!r?'pending':st.level==='critical'?'alert':st.level==='warning'?'warning':'ok';const status=!r?'PENDENTE':st.label;return `<div class="unit"><div><div class="unit-title">${u.number==='PRINCIPAL'?'UNIDADE PRINCIPAL':'UNIDADE '+u.number}</div><div class="unit-meta">${u.type==='principal'?'Medidor principal':'Hidrômetro individual'} ${u.meter?'• '+u.meter:''}</div><span class="status ${cls}">${status}</span>${r?`<div class="unit-meta">Atual: ${fmt(r.current)} m³ • Consumo: ${fmt(c)} m³${st.level!=='normal'?` • ${st.reason}`:''}</div>`:''}</div><button class="${r?'secondary':'primary'}" onclick="openModal('${u.id}')">${r?'Editar':'Ler'}</button></div>`}).join('')||'<div class="panel">Nenhuma unidade encontrada.</div>'}

function adjustCurrent(delta){const el=$('current');if(!el)return;const n=Number(el.value||0);el.value=(Math.max(0,(Number.isFinite(n)?n:0)+delta)).toFixed(2);updateCalc();updateModalRisk();el.focus();el.select()}
function prepareCurrentField(){const el=$('current');if(!el)return;setTimeout(()=>{el.focus();el.select()},120)}
function openModal(id){selected=unitObj(id);const r=currentReading(id);const appliedPrevious=previousReading(id);photoData=r?.photo||null;ocrPhotoData=photoData;$('modalType').textContent=selected.type==='principal'?'MEDIÇÃO PRINCIPAL':'HIDRÔMETRO INDIVIDUAL';$('modalTitle').textContent=selected.number==='PRINCIPAL'?'Unidade Principal':'Unidade '+selected.number;$('readDate').value=r?.date||today();$('prev').value=appliedPrevious;const [py,pm]=selectedPeriod.split('-').map(Number);const prevDate=new Date(py,pm-2,1);const prevPeriod=monthKey(prevDate);$('prevHelp').textContent=`Leitura de ${periodLabel(prevPeriod)}. Campo editável para cadastrar o valor de referência do mês anterior.`;$('current').value=r?.current??'';$('meter').value=r?.meter||selected.meter||'';$('notes').value=r?.notes||'';$('photo').value='';$('photoPreview').innerHTML=photoData?`<img src="${photoData}" alt="Foto do hidrômetro">`:'';$('ocrStatus').textContent='';updateCalc();updateModalRisk();updateModalProgress();updateSaveButton();$('modal').classList.add('show');prepareCurrentField()}
function closeModal(){$('modal').classList.remove('show')}
function updateCalc(){const c=Number($('current').value||0)-Number($('prev').value||0);$('calc').textContent='Consumo: '+fmt(c)+' m³';$('calc').className='calc '+(c<0?'negative':'')}
function updateModalRisk(){const box=$('modalRisk');if(!box||!selected)return;const prev=Number($('prev').value),cur=Number($('current').value);if(!Number.isFinite(prev)||!Number.isFinite(cur)){box.innerHTML='';return}const c=cur-prev;const st=consumptionStatus(selected.id,c,selectedPeriod);const cls=st.level==='critical'?'alert':st.level==='warning'?'warning':'ok';const icon=st.level==='critical'?'🚨':st.level==='warning'?'⚠️':'🟢';box.innerHTML=`<div class="reading-risk ${cls}"><b>${icon} ${st.label.toUpperCase()}</b><span>${st.reason}</span>${st.level!=='normal'?'<small>Recomenda-se verificar esta unidade. O alerta não confirma vazamento.</small>':''}</div>`}
if($('current'))$('current').addEventListener('input',()=>{updateCalc();updateModalRisk()});
if($('current'))$('current').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();saveReading()}});
document.addEventListener('keydown',e=>{if(!$('modal')?.classList.contains('show'))return;if(e.key==='Escape')closeModal()});if($('prev'))$('prev').addEventListener('input',()=>{updateCalc();updateModalRisk()});
async function applyWatermark(dataUrl){
  if(!dataUrl)return null;
  return await new Promise(resolve=>{
    const base=new Image(),wm=new Image();
    let loaded=0;
    const done=()=>{loaded++;if(loaded<2)return;
      const canvas=document.createElement('canvas');canvas.width=base.naturalWidth||base.width;canvas.height=base.naturalHeight||base.height;
      const ctx=canvas.getContext('2d',{alpha:false});ctx.drawImage(base,0,0,canvas.width,canvas.height);
      const targetW=Math.max(160,Math.round(canvas.width*0.28));
      const targetH=Math.round((wm.naturalHeight||wm.height)*targetW/(wm.naturalWidth||wm.width));
      const pad=Math.round(canvas.width*0.025);
      ctx.globalAlpha=0.92;ctx.drawImage(wm,canvas.width-targetW-pad,canvas.height-targetH-pad,targetW,targetH);ctx.globalAlpha=1;
      resolve(canvas.toDataURL('image/jpeg',.72));
    };
    base.onload=done;base.onerror=()=>resolve(dataUrl);wm.onload=done;wm.onerror=()=>resolve(dataUrl);
    base.src=dataUrl;wm.src='watermark.png';
  });
}
async function preparePhoto(file){
  if(!file)return null;
  return await new Promise(resolve=>{
    const reader=new FileReader();
    reader.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        // Guarda somente uma versão otimizada: suficiente para o OCR do visor,
        // sem ocupar o espaço da foto original da câmera.
        const max=1200, scale=Math.min(1,max/Math.max(img.width,img.height));
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(img.width*scale));
        canvas.height=Math.max(1,Math.round(img.height*scale));
        const ctx=canvas.getContext('2d',{alpha:false});
        ctx.imageSmoothingEnabled=true;
        ctx.imageSmoothingQuality='high';
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL('image/jpeg',.72));
      };
      img.onerror=()=>resolve(reader.result);
      img.src=reader.result;
    };
    reader.onerror=()=>resolve(null);
    reader.readAsDataURL(file);
  });
}
if($('photo'))$('photo').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;ocrPhotoData=await preparePhoto(f);photoData=await applyWatermark(ocrPhotoData);$('photoPreview').innerHTML=photoData?`<img src="${photoData}" alt="Foto do hidrômetro"><div class="photo-caption">📷 Foto otimizada • marca Tangará aplicada</div>`:'';$('ocrStatus').textContent=ocrPhotoData?'Foto pronta para OCR. A marca d’água é aplicada apenas à cópia armazenada.':'';});
$('ocrBtn').onclick=async()=>{
  if(!ocrPhotoData)return toast('Tire ou selecione uma foto primeiro.');
  if(!window.Tesseract)return toast('Leitura automática indisponível sem internet. Informe manualmente.');
  $('ocrStatus').textContent='🔎 Preparando leitura do visor…';
  try{
    const result=await Tesseract.recognize(ocrPhotoData,'eng',{logger:m=>{if(m.status==='recognizing text')$('ocrStatus').textContent='🔎 OCR '+Math.round(m.progress*100)+'%'}});
    const raw=(result.data.text||'').replace(/O/gi,'0').replace(/[|lI]/g,'1');
    const nums=(raw.match(/\d+(?:[.,]\d+)?/g)||[]).map(v=>v.replace(',','.')).filter(v=>Number.isFinite(Number(v))&&Number(v)>=0).sort((a,b)=>b.length-a.length);
    if(nums.length){
      const candidate=nums[0];
      $('current').value=candidate;
      updateCalc();
      updateModalRisk();
      $('ocrStatus').innerHTML=`<b>💡 Sugestão: ${fmt(candidate)} m³</b> • confira o visor antes de salvar.`;
      $('current').focus();$('current').select();
    }else $('ocrStatus').textContent='Não consegui identificar a leitura. Confira a foto e informe manualmente.';
  }catch(e){$('ocrStatus').textContent='Não foi possível executar a leitura automática. Informe manualmente.';}
};
function updateSaveButton(){const b=$('saveReadingBtn'),skip=$('skipGuidedBtn');if(!b)return;b.innerHTML=guidedMode?'💾 Salvar e próxima →':'💾 Salvar leitura';b.classList.toggle('guided-save',guidedMode);if(skip)skip.style.display=guidedMode?'block':'none'}
function skipGuidedUnit(){if(!guidedMode||!selected)return;const next=allUnits().find(u=>u.id!==selected.id&&!currentReading(u.id));closeModal();if(next){toast('Unidade pulada. Abrindo a próxima…');setTimeout(()=>openModal(next.id),180)}else{guidedMode=false;toast('Não há outra unidade pendente.')}}
function saveReading(){if(isClosed()){if(!confirm('Este mês está fechado. Reabrir para editar esta leitura?'))return;state.closures=state.closures||{};delete state.closures[selectedPeriod];saveState();}const prev=previousReading(selected.id,selectedPeriod),cur=Number($('current').value),date=$('readDate').value||today();if(!Number.isFinite(cur)||cur<0)return toast('Informe uma leitura válida.');if(cur<prev&&!confirm('A leitura atual é menor que a anterior. Salvar mesmo assim?'))return;state.meters=state.meters||{};state.meters[selected.id]=$('meter').value.trim();const record={unitId:selected.id,period:selectedPeriod,date,previous:prev,current:cur,meter:$('meter').value.trim(),notes:$('notes').value.trim(),photo:photoData||null,savedAt:new Date().toISOString()};const i=state.readings.findIndex(r=>r.unitId===selected.id&&r.period===selectedPeriod);if(i>=0)state.readings[i]=record;else state.readings.push(record);saveState();closeModal();updateDashboard();renderUnitPanel();renderUnits();renderAlerts();renderReports();renderUnitMap();if(guidedMode){const next=allUnits().find(u=>!currentReading(u.id));if(next){toast('Leitura salva. Abrindo a próxima unidade…');setTimeout(()=>openModal(next.id),260)}else{guidedMode=false;toast('🎉 Todas as 81 leituras deste mês foram concluídas.')}}else toast('Leitura salva neste aparelho.')}

function referencePeriod(period=selectedPeriod){const [y,m]=period.split('-').map(Number);return monthKey(new Date(y,m-2,1))}
function renderReferences(){const refPeriod=referencePeriod();$('referencePeriodLabel').textContent=periodLabel(refPeriod);$('targetPeriodLabel').textContent=periodLabel(selectedPeriod);const box=state.references?.[selectedPeriod]||{};const priorReadings={};state.readings.filter(r=>r.period===refPeriod).forEach(r=>priorReadings[r.unitId]=r.current);$('referenceGrid').innerHTML=allUnits().map(u=>{const v=box[u.id]??priorReadings[u.id]??'';const label=u.number==='PRINCIPAL'?'Principal':u.number;return `<label class="reference-cell"><span>${label}</span><input class="reference-input" data-unit="${u.id}" type="number" step="0.01" min="0" inputmode="decimal" value="${v}" placeholder="0,00"></label>`}).join('');$('referenceCount').textContent=`${Object.values(box).filter(v=>v!==''&&v!==null&&v!==undefined).length}/81 preenchidas`}
function saveReferences(){if(isClosed()){toast('O mês está fechado. Reabra o mês para alterar referências.');return}state.references=state.references||{};state.references[selectedPeriod]=state.references[selectedPeriod]||{};const refs=state.references[selectedPeriod];document.querySelectorAll('.reference-input').forEach(input=>{const id=input.dataset.unit;const raw=input.value.trim();if(raw==='')delete refs[id];else{const n=Number(raw.replace(',','.'));if(Number.isFinite(n)&&n>=0)refs[id]=n}});state.readings.forEach(r=>{if(r.period===selectedPeriod){const arr=state.readings.filter(x=>x.unitId===r.unitId&&x.period<selectedPeriod).sort((a,b)=>b.period.localeCompare(a.period));if(arr[0]?.current!==undefined)r.previous=Number(arr[0].current);else if(Object.prototype.hasOwnProperty.call(refs,r.unitId))r.previous=Number(refs[r.unitId]);}});saveState();renderReferences();updateDashboard();renderUnitPanel();renderUnits();renderAlerts();renderReports();renderUnitMap();toast('Referências aplicadas ao mês '+periodLabel(selectedPeriod)+'.')}
function fillReferencesFromPreviousMonth(){if(isClosed()){toast('O mês está fechado. Reabra o mês para alterar referências.');return}const refPeriod=referencePeriod();state.references=state.references||{};state.references[selectedPeriod]=state.references[selectedPeriod]||{};const refs=state.references[selectedPeriod];let count=0;state.readings.filter(r=>r.period===refPeriod).forEach(r=>{refs[r.unitId]=Number(r.current);count++});state.readings.forEach(r=>{if(r.period===selectedPeriod){const arr=state.readings.filter(x=>x.unitId===r.unitId&&x.period<selectedPeriod).sort((a,b)=>b.period.localeCompare(a.period));if(arr[0]?.current!==undefined)r.previous=Number(arr[0].current);else if(Object.prototype.hasOwnProperty.call(refs,r.unitId))r.previous=Number(refs[r.unitId]);}});saveState();renderReferences();updateDashboard();renderUnitPanel();renderUnits();renderAlerts();renderReports();renderUnitMap();toast(count?`${count} leituras do mês anterior carregadas e aplicadas.`:'Não há leituras do mês anterior para carregar.')}
function historyStatus(unitId,c,period){const st=consumptionStatus(unitId,c,period);return {level:st.level,label:st.label,reason:st.reason}}
function renderHistory(){
  const q=($('historySearch').value||'').toLowerCase();
  const units=allUnits();
  const sel=$('historyUnitSelect');
  if(sel){
    const current=sel.value||units[0]?.id||'';
    sel.innerHTML=units.map(u=>`<option value="${u.id}">${u.id==='PRINCIPAL'?'UNIDADE PRINCIPAL':'UNIDADE '+u.number}</option>`).join('');
    sel.value=units.some(u=>u.id===current)?current:(units[0]?.id||'');
  }
  const rows=state.readings.filter(r=>r.unitId.toLowerCase().includes(q)).sort((a,b)=>b.period.localeCompare(a.period)||String(b.savedAt).localeCompare(String(a.savedAt)));
  $('historyList').innerHTML=rows.length?rows.map(r=>{
    const c=Number(r.current)-Number(r.previous);
    const st=historyStatus(r.unitId,c,r.period);
    const cls=st.level==='critical'?'alert':st.level==='warning'?'warning':st.level==='pending'?'pending':'ok';
    return `<div class="history-item history-clickable" onclick="selectHistoryUnit('${r.unitId}')"><b>${r.unitId==='PRINCIPAL'?'UNIDADE PRINCIPAL':'UNIDADE '+r.unitId}</b><div class="unit-meta">${periodLabel(r.period)} • ${r.date} • anterior ${fmt(r.previous)} • atual ${fmt(r.current)}</div><div><strong>Consumo: ${fmt(c)} m³</strong> • <span class="status ${cls}">${st.label}</span>${r.notes?` • ${r.notes}`:''}</div></div>`
  }).join(''):'<div class="panel">Nenhuma leitura registrada ainda.</div>';
  renderUnitHistory();
}
function selectHistoryUnit(id){const sel=$('historyUnitSelect');if(sel){sel.value=id;renderUnitHistory();$('unitHistorySummary')?.scrollIntoView({behavior:'smooth',block:'nearest'});}}
function renderUnitHistory(){
  const sel=$('historyUnitSelect');
  const id=sel?.value;
  if(!id){$('unitHistorySummary').innerHTML='';$('unitHistoryTable').innerHTML='';return;}
  const readings=state.readings.filter(r=>r.unitId===id).sort((a,b)=>a.period.localeCompare(b.period)||String(a.date).localeCompare(String(b.date)));
  const label=id==='PRINCIPAL'?'Unidade Principal':'Unidade '+id;
  if(!readings.length){
    $('unitHistorySummary').innerHTML=`<div class="history-summary"><b>${label}</b><span>Nenhuma leitura registrada.</span></div>`;
    $('unitHistoryTable').innerHTML='';
    return;
  }
  const total=readings.reduce((sum,r)=>{const c=Number(r.current)-Number(r.previous);return sum+(Number.isFinite(c)&&c>=0?c:0)},0);
  const last=readings[readings.length-1];
  const lastC=Number(last.current)-Number(last.previous);
  const st=historyStatus(id,lastC,last.period);
  const cls=st.level==='critical'?'alert':st.level==='warning'?'warning':st.level==='pending'?'pending':'ok';
  $('unitHistorySummary').innerHTML=`<div class="history-summary"><div><b>${label}</b><small>${readings.length} período(s) registrado(s)</small></div><div><span>Último consumo</span><strong>${fmt(lastC)} m³</strong></div><div><span>Consumo acumulado</span><strong>${fmt(total)} m³</strong></div><div><span>Última situação</span><strong class="status ${cls}">${st.label}</strong></div></div>`;
  const body=[...readings].reverse().map(r=>{
    const c=Number(r.current)-Number(r.previous);
    const x=historyStatus(id,c,r.period);
    const ccls=x.level==='critical'?'alert':x.level==='warning'?'warning':x.level==='pending'?'pending':'ok';
    const closed=isClosed(r.period);
    return `<tr><td><b>${periodLabel(r.period)}</b></td><td>${fmt(r.previous)} m³</td><td>${fmt(r.current)} m³</td><td><b>${fmt(c)} m³</b></td><td><span class="status ${ccls}">${x.label}</span></td><td>${closed?'🔒 Fechado':'🟢 Aberto'}</td></tr>`;
  }).join('');
  $('unitHistoryTable').innerHTML=`<table class="monthly-table history-detail-table"><thead><tr><th>Período</th><th>Leitura anterior</th><th>Leitura atual</th><th>Consumo</th><th>Situação</th><th>Mês</th></tr></thead><tbody>${body}</tbody></table>`;
}

function renderAlerts(){const rows=allUnits().map(u=>{const r=currentReading(u.id);if(!r)return null;const c=Number(r.current)-Number(r.previous);const st=consumptionStatus(u.id,c,selectedPeriod);if(st.level==='normal'||st.level==='pending')return null;return {u,r,c,kind:st.level,text:st.reason}}).filter(Boolean);$('alertsList').innerHTML=rows.length?rows.map(x=>`<div class="history-item"><span class="status ${x.kind==='critical'?'alert':'warning'}">${x.kind==='critical'?'🚨 CRÍTICO':'⚠️ ALERTA MÉDIO'}</span><h3>${x.u.number==='PRINCIPAL'?'Unidade Principal':'Unidade '+x.u.number}</h3><div class="unit-meta">Consumo ${fmt(x.c)} m³ • ${x.text}</div><p class="muted">O alerta indica uma anomalia de consumo e não confirma vazamento. Se houver suspeita, faça o teste do hidrômetro com todos os pontos de água fechados.</p></div>`).join(''):'<div class="panel"><b>✓ Nenhum alerta de consumo acima do padrão neste período.</b><p class="muted">A comparação usa até os 3 períodos anteriores disponíveis para cada unidade.</p></div>'}
function consumptionStatus(unitId, consumption, period=selectedPeriod){
  const n=Number(consumption);
  if(!Number.isFinite(n)) return {level:'critical',label:'ALERTA CRÍTICO',reason:'Consumo inválido; revisar as leituras.'};
  if(n<0) return {level:'critical',label:'ALERTA CRÍTICO',reason:'A leitura atual é menor que a leitura anterior. Revisar as leituras.'};
  if(n>50) return {level:'critical',label:'ALERTA CRÍTICO',reason:`Consumo de ${fmt(n)} m³: acima de 50 m³. Verificação prioritária para possível consumo excessivo ou vazamento.`};
  if(n>25) return {level:'warning',label:'ALERTA MÉDIO',reason:`Consumo de ${fmt(n)} m³: acima de 25 m³. Recomenda-se verificar a unidade.`};
  return {level:'normal',label:'NORMAL',reason:`Consumo de ${fmt(n)} m³: dentro do limite normal de até 25 m³.`};
}

function reportRows(period=selectedPeriod){return allUnits().map(u=>{const r=currentReading(u.id,period);if(!r)return {unit:u.number,type:u.type,previous:'',current:'',consumption:'',status:'Pendente',level:'pending'};const previous=Number(r.previous),current=Number(r.current),consumption=current-previous;const st=consumptionStatus(u.id,consumption,period);return {unit:u.number,type:u.type,previous,current,consumption,status:st.label,level:st.level};})}
function reportData(period=selectedPeriod){const rows=reportRows(period),done=rows.filter(x=>x.level!=='pending').length,residential=rows.filter(x=>x.type==='residencial'&&x.level!=='pending'),main=rows.find(x=>x.unit==='PRINCIPAL');const res=residential.reduce((s,x)=>s+Math.max(Number(x.consumption),0),0);const mainC=main&&main.level!=='pending'?Math.max(Number(main.consumption),0):0;const alerts=rows.filter(x=>x.level==='warning'||x.level==='critical');return {rows,residential,res,mainC,diff:mainC-res,done,alerts,critical:alerts.filter(x=>x.level==='critical').length}}
function renderReportTable(rows){
  const label=u=>u==='PRINCIPAL'?'Unidade Principal':'Unidade '+u;
  const statusClass=x=>x.level==='critical'?'alert':x.level==='warning'?'warning':x.level==='pending'?'pending':'ok';
  $('reportTable').innerHTML=`<table class="monthly-table"><thead><tr><th>Unidade</th><th>Leitura anterior</th><th>Leitura atual</th><th>Consumo</th><th>Situação</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${label(x.unit)}</td><td>${x.previous===''?'—':fmt(x.previous)+' m³'}</td><td>${x.current===''?'—':fmt(x.current)+' m³'}</td><td>${x.consumption===''?'—':fmt(x.consumption)+' m³'}</td><td><span class="status ${statusClass(x)}">${x.status}</span></td></tr>`).join('')}</tbody></table>`;
}
function renderReports(){const d=reportData();$('rDone').textContent=`${d.done}/81`;$('rRes').textContent=fmt(d.res)+' m³';$('rAlerts').textContent=d.alerts.length;$('rCritical').textContent=d.critical;$('reportPeriod').textContent=periodLabel(selectedPeriod);const closed=isClosed();if($('reportClosureStatus'))$('reportClosureStatus').textContent=closed?'🔒 FECHADO':'🟢 ABERTO';if($('closureBtn')){$('closureBtn').textContent=closed?'🔓 Reabrir mês':'🔒 Fechar mês';$('closureBtn').classList.toggle('danger',closed)}if($('closureMessage'))$('closureMessage').innerHTML=closed?`<div class="closure-closed"><b>🔒 Mês fechado.</b> Leituras e referências deste período só podem ser alteradas após reabrir o mês.</div>`:`<div class="closure-open"><b>🟢 Mês aberto.</b> Confira as leituras e os alertas antes de fechar.</div>`;renderReportTable(d.rows);const box=$('reportWarning');if(box){const sus=d.rows.filter(x=>x.level==='warning').length;const crit=d.rows.filter(x=>x.level==='critical').length;const flagged=d.rows.filter(x=>x.level==='warning'||x.level==='critical');box.innerHTML=(sus||crit)?`<div class="report-alert-box"><b>⚠️ ${sus} suspeita(s) • 🚨 ${crit} acima do normal</b><p>Unidades para verificação pela administração:</p><div class="report-flagged-list">${flagged.map(x=>`<div><b>${x.unit==='PRINCIPAL'?'Unidade Principal':'Unidade '+x.unit}</b> — ${fmt(x.consumption)} m³ — <strong>${x.status.toUpperCase()}</strong></div>`).join('')}</div><small>O alerta indica anomalia de consumo e não confirma vazamento.</small></div>`:'<div class="report-ok-box">✓ Nenhuma unidade classificada como suspeita ou acima do normal.</div>'}}
function exportCSV(){const d=reportData();const rows=[['Unidade','Leitura anterior (m³)','Leitura atual (m³)','Consumo (m³)']];d.rows.forEach(x=>rows.push([x.unit,x.previous===''?'':x.previous,x.current===''?'':x.current,x.consumption===''?'':Number(x.consumption).toFixed(2)]));const csv=rows.map(row=>row.map(v=>`"${String(v).replaceAll('\"','\"\"')}"`).join(';')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.download='leituras-agua-'+selectedPeriod+'.csv';a.click();toast('Arquivo CSV criado.')}
function backupJSON(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));a.download='backup-leituras-agua-'+today()+'.json';a.click();toast('Backup criado.')}
function openReferences(){showScreen('references');renderReferences();}

if($('referenceSaveBtn'))$('referenceSaveBtn').addEventListener('click',saveReferences);if($('referenceFillBtn'))$('referenceFillBtn').addEventListener('click',fillReferencesFromPreviousMonth);if($('openReferencesBtn'))$('openReferencesBtn').addEventListener('click',openReferences);if($('restore'))$('restore').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{try{const data=JSON.parse(rd.result);if(!Array.isArray(data.readings))throw Error();state=data;saveState();updateDashboard();renderUnitPanel();renderUnits();renderAlerts();renderReports();renderUnitMap();toast('Backup restaurado.')}catch(x){toast('Arquivo de backup inválido.')}};rd.readAsText(f)});
function clearAll(){if(confirm('Apagar TODAS as leituras e referências deste aparelho? Esta ação não pode ser desfeita.')){localStorage.removeItem(KEY);state={readings:[],references:{},closures:{}};updateDashboard();renderUnitPanel();renderUnits();renderAlerts();renderReports();renderUnitMap();toast('Dados apagados.')}}
let selectedExportFormat='pdf';
function selectExportFormat(format){selectedExportFormat=format;document.querySelectorAll('.export-format').forEach(b=>b.classList.toggle('selected',b.dataset.format===format));const btn=document.querySelector('.export-main-btn');if(btn)btn.textContent=format==='csv'?'⬇️ Exportar relatório em CSV':'⬇️ Exportar relatório em PDF'}
function exportReport(){if(selectedExportFormat==='csv'){exportCSV();return}printReport()}
function renderPrintReport(){const d=reportData();const label=u=>u==='PRINCIPAL'?'Principal':u;const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');const cell=v=>v===''?'':Number(v).toFixed(2);const el=$('printReportOnly');if(!el)return;el.innerHTML=`<table><thead><tr><th>Unidade</th><th>Leitura anterior</th><th>Leitura atual</th><th>Consumo</th></tr></thead><tbody>${d.rows.map(x=>`<tr><td>${esc(label(x.unit))}</td><td>${esc(cell(x.previous))}</td><td>${esc(cell(x.current))}</td><td>${esc(cell(x.consumption))}</td></tr>`).join('')}</tbody></table>`}
function printReport(){
  const d=reportData();
  const label=u=>u==='PRINCIPAL'?'Unidade Principal':'Unidade '+u;
  const cell=v=>v===''?'':Number(v).toFixed(2);
  const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('\"','&quot;');
  const rows=d.rows.map(x=>`<tr><td>${esc(label(x.unit))}</td><td>${esc(cell(x.previous))}</td><td>${esc(cell(x.current))}</td><td>${esc(cell(x.consumption))}</td></tr>`).join('');
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>Leituras ${selectedPeriod}</title><style>
  @page{size:A4 landscape;margin:5mm}html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Arial,sans-serif}body{font-size:7.5px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #777;padding:1.5px 3px;height:9px;line-height:1;white-space:nowrap}th{font-weight:700;background:#f2f2f2}th:first-child,td:first-child{text-align:left;width:34%}th:not(:first-child),td:not(:first-child){text-align:right;width:22%}</style></head><body><table><thead><tr><th>Unidade</th><th>Leitura anterior</th><th>Leitura atual</th><th>Consumo</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=function(){setTimeout(function(){window.print()},150)};<\/script></body></html>`;
  const w=window.open('','_blank');
  if(w){w.document.open();w.document.write(html);w.document.close();toast('PDF preparado somente com as leituras.');return}
  renderPrintReport();showScreen('reports');setTimeout(()=>{window.print();toast('PDF preparado somente com as leituras.')},100);
}
function toast(t){const el=$('toast');el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2300)}
$('periodPicker').value=selectedPeriod;$('period').textContent=periodLabel(selectedPeriod);renderReferences();updateDashboard();renderUnitPanel();renderUnits();renderAlerts();renderReports();renderUnitMap();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
