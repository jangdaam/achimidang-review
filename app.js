'use strict';
const key='locial.achimidang.review.v1';
const $=s=>document.querySelector(s);
const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let reviews;
try{const raw=localStorage.getItem(key);reviews=raw===null?seedReviews():JSON.parse(raw);if(!Array.isArray(reviews))throw Error()}catch{reviews=seedReviews()}
let tab='library',product='berry',selected='R001',filter='전체',timer;
const pInfo=()=>products.find(p=>p.id===product);
const state=r=>r.revision||r.base;
const chosen=()=>reviews.find(r=>r.id===selected&&r.product===product);
const productRows=()=>reviews.filter(r=>r.product===product);
const selectOptions=(items,current)=>items.map(x=>`<option ${x===current?'selected':''}>${h(x)}</option>`).join('');
const titles={library:['제품별 리뷰 노트','제품을 고르고, 별점과 함께 고객이 남긴 표현을 읽어보세요.'],signals:['품질 징후 분석','같은 표현도 취향인지 이전 구매품과의 차이인지 원문에서 확인하세요.'],actions:['품질 조치 관리','검토한 표현을 제품사양 대조, 공급사 문의 또는 자체 점검으로 연결하세요.']};
function toast(s){$('#toast').textContent=s;clearTimeout(timer);timer=setTimeout(()=>$('#toast').textContent='',3500)}
function persist(){try{localStorage.setItem(key,JSON.stringify(reviews));return true}catch{toast('이 브라우저에 저장할 수 없습니다. 자료 관리에서 CSV를 내려받으세요.');return false}}
function modal(content){$('#dialogbody').innerHTML=content;$('#dialog').showModal()}
function download(name,rows){
 const safe=x=>{const s=String(x??'');return '"'+(/^[=+@\-\t\r]/.test(s)?"'":'')+s.replaceAll('"','""')+'"'};
 const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(safe).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function clean(s){return s.trim().replace(/\b01[016789][- .]?\d{3,4}[- .]?\d{4}\b/g,'[전화번호]').replace(/[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[이메일]')}
function tableCSV(src){
 let rows=[],row=[],value='',quoted=false;src=src.replace(/^\uFEFF/,'');
 for(let i=0;i<src.length;i++){const c=src[i];if(c==='"'){if(quoted&&src[i+1]==='"'){value+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(value);value=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&src[i+1]==='\n')i++;row.push(value);if(row.some(x=>x.trim()))rows.push(row);row=[];value=''}else value+=c}
 if(quoted)throw Error('따옴표가 닫히지 않은 값이 있습니다.');row.push(value);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
function suggest(text){
 const rules=[['맛',/달|단맛|맛|새콤/],['향',/향|냄새/],['점도',/묽|흘|흐르|되직|점도/],['질감',/씹|알갱|덩어리|질감/],['내용물',/색|물층|분리/],['구성',/구성|조합|두 병/],['포장',/포장|뚜껑|샜|새었|칸막이|파손/]];
 const types=rules.filter(([,pattern])=>pattern.test(text)).map(([t])=>t);
 const change=/지난번|전보다|저번|이번에는|새었|샜|파손|묻어|접혀/.test(text),pref=/취향|입맛|좋아|좋은|좋았|마음에/.test(text);
 return {types:types.length?types:['기타'],expression:change?(pref?'복합':'변화관찰'):(pref?'선호':'불명확'),decision:change?'점검':pref?'참고':'추가 확인',evidence:text};
}
const csvHeads=['리뷰번호','상품명','옵션','별점','작성일','원문'];
const rawRow=r=>[r.id,products.find(p=>p.id===r.product).name,r.option,r.rating,r.date,r.text];
function prepareImport(src){
 const [head,...rows]=tableCSV(src);if(!head||!rows.length||!csvHeads.every(c=>head.includes(c)))throw Error('연습 CSV와 같은 제목 행과 리뷰 1건 이상이 필요합니다.');
 const ids=new Set(reviews.map(r=>r.id)),seen=new Set(reviews.map(r=>[r.product,r.option,r.date,r.rating,r.text].join('|'))),add=[];let duplicate=0;
 rows.forEach((row,i)=>{const at=k=>(row[head.indexOf(k)]??'').trim();const id=at('리뷰번호'),p=products.find(p=>p.name===at('상품명')),text=clean(at('원문')),rating=Number(at('별점')),date=at('작성일'),option=at('옵션')||'기본';
 if(row.length!==head.length||!p||!text||!id||!Number.isInteger(rating)||rating<1||rating>5||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw Error((i+2)+'행의 상품명·별점(1~5)·날짜·원문을 확인하세요.');
 const sig=[p.id,option,date,rating,text].join('|');if(ids.has(id)||seen.has(sig)){duplicate++;return}ids.add(id);seen.add(sig);add.push({id,product:p.id,text,rating,date,option,base:suggest(text),revision:null,history:[]})
 });return {add,duplicate};
}
function summary(r){return `<div class="meta"><span>${h(r.id)}</span><span>${h(r.date)}</span><span class="stars" aria-label="별점 ${r.rating}점">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span></div>`}
function ledger(r){return r.history.length?r.history.slice().reverse().map(a=>`<div class="entry"><div class="meta">${h(a.time.slice(0,10))} · ${h(a.route)} · ${h(a.status)}</div><p>${h(a.note)}</p></div>`).join(''):'<p class="note">저장한 조치가 여기에 쌓입니다.</p>'}
function editor(r){
 if(!r)return '<p class="empty">선택할 리뷰가 없습니다.</p>';
 const a=state(r),top=summary(r)+`<blockquote class="quote">“${h(r.text)}”</blockquote>`;
 if(tab==='library')return top+`<h3>리뷰 정보</h3><div class="quality"><span>${pInfo().name} · ${h(r.option)}</span><span>${r.revision?'담당자 검토 완료':'분류 초안'}</span></div><p class="hint">상품과 원문을 확인한 뒤 ‘품질 징후 분석’에서 분류 근거를 검토하세요.</p>`;
 if(tab==='signals')return top+`<form id="classification" class="form"><fieldset><legend>품질 유형 · 복수 선택</legend><div class="checks">${categories.map(t=>`<label><input name="types" type="checkbox" value="${t}" ${a.types.includes(t)?'checked':''}>${t}</label>`).join('')}</div></fieldset><div class="pair"><label>표현 성격<select name="expression">${selectOptions(expressions,a.expression)}</select></label><label>점검 구분<select name="decision">${selectOptions(decisions,a.decision)}</select></label></div><label>원문 근거<textarea name="evidence" required>${h(a.evidence)}</textarea></label><p class="hint">근거로 삼은 원문 구절을 그대로 남기세요.</p><div class="tools"><button>분류 검토 저장</button><button type="button" id="draft" class="plain">최초 분류 보기</button></div></form>`;
 const preferred=a.decision==='참고'?'선호 기록':a.decision==='추가 확인'?'고객 추가 문의':a.types.includes('포장')||a.types.includes('구성')?'자체 포장 점검':'제품사양 대조';
 return top+`<div class="quality"><span>${h(a.types.join(' · '))}</span><span>${h(a.decision)}</span></div><p class="hint">검토 근거 · ${h(a.evidence)}</p><form id="action" class="form"><div class="pair"><label>점검 경로<select name="route">${selectOptions(routes,preferred)}</select></label><label>처리 상태<select name="status">${selectOptions(['검토 중','확인 요청','처리 완료'],'검토 중')}</select></label></div><label>조치 메모<textarea required name="note" placeholder="확인할 항목과 다음 조치를 적으세요."></textarea></label><div class="tools"><button type="button" class="plain" id="fill">메모 초안 채우기</button><button>조치 저장</button></div></form><h3 style="margin-top:18px">처리 이력</h3>${ledger(r)}`;
}
function render(){
 document.querySelectorAll('nav button').forEach(b=>{if(b.dataset.tab===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
 $('#lead').innerHTML=`<section class="hero"><div class="hero-copy"><span class="folio">Achimidang / Quality notes</span><h1>${titles[tab][0]}</h1><p>${titles[tab][1]}</p></div><div class="hero-photo" role="img" aria-label="아치미당 잼과 시럽을 담은 크라프트 선물 상자"></div></section>`;
 $('#products').innerHTML=products.map(p=>`<button class="product" data-product="${p.id}" aria-pressed="${product===p.id}"><img alt="" src="assets/${p.id}.jpg"><span>${p.name}<small>리뷰 ${reviews.filter(r=>r.product===p.id).length}건</small></span></button>`).join('');
 const rows=productRows(),visible=rows.filter(r=>filter==='전체'||state(r).decision===filter);
 if(!visible.some(r=>r.id===selected))selected=visible[0]?.id??'';
 const title={library:'리뷰 원문',signals:'분류 검토',actions:'점검과 조치'}[tab];
 const controls=tab==='library'?'<button class="plain" id="sample">연습 CSV 받기</button><button id="import">리뷰 CSV 등록</button>':tab==='signals'?'<button class="plain" id="rules">분류 기준 보기</button>':'<button class="plain" id="export">조치 기록 내려받기</button>';
 $('#work').innerHTML=`<div class="section-head"><div><h2>${pInfo().name} <span style="font-weight:430">${title}</span></h2><p>${rows.length}건 중 점검 ${rows.filter(r=>state(r).decision==='점검').length}건 · 추가 확인 ${rows.filter(r=>state(r).decision==='추가 확인').length}건</p></div><div class="tools">${controls}</div></div><div class="sheet"><article><div class="row"><h3>리뷰 목록</h3><select class="filter" id="filter" aria-label="점검 구분 필터">${selectOptions(['전체',...decisions],filter)}</select></div><div class="list">${visible.map(r=>`<button class="item" data-id="${h(r.id)}" aria-pressed="${r.id===selected}"><div class="meta"><span>${h(r.id)}</span><span>${r.rating}점</span><span class="stamp">${h(state(r).decision)}</span>${tab==='actions'?'조치 '+r.history.length+'건':r.revision?'검토 완료':''}</div><p>${h(r.text)}</p></button>`).join('')||'<p class="empty">이 구분에 해당하는 리뷰가 없습니다.</p>'}</div></article><article aria-label="선택 리뷰 상세">${editor(chosen())}</article></div><p class="note">교육용 가상 리뷰 · 분류 초안과 담당자 검토 결과는 이 브라우저에 보관됩니다.</p>`;
 if(tab==='signals'||tab==='actions')renderTypeSummary(rows);
}
function renderTypeSummary(rows){
 const counts=categories.map(name=>({name,n:rows.filter(r=>state(r).decision==='점검'&&state(r).types.includes(name)).length})).filter(t=>t.n).sort((a,b)=>b.n-a.n);
 const block=document.createElement('div');
 block.className='signal-strip';
 block.innerHTML='<strong>점검 후보의 품질 유형</strong>'+counts.map(t=>'<span>'+t.name+' <b>'+t.n+'</b>건</span>').join('')+(counts.length?'':'<span>점검 후보 없음</span>');
 document.querySelector('.sheet').before(block);
}
function exportActions(){
 const rows=productRows().flatMap(r=>r.history.map(a=>[r.id,pInfo().name,r.text,a.evidence,a.route,a.status,a.note,a.time]));if(!rows.length){toast('이 제품의 조치를 먼저 한 건 저장하세요.');return}
 download(pInfo().name+'_품질조치.csv',[['리뷰번호','상품명','원문','저장 당시 근거','점검 경로','상태','메모','저장시각'],...rows]);
}
function openImport(){
 modal(`<h2>리뷰 CSV 등록</h2><p class="hint">연습 CSV의 열 이름과 제품명을 사용하세요. 같은 번호나 같은 제품·옵션·날짜·별점·원문은 한 번만 등록합니다. 전화번호와 이메일은 가립니다.</p><form id="importForm" class="form"><label>리뷰 파일<input type="file" name="file" accept=".csv,text/csv" required></label><p id="importMsg" role="status"></p><button>자료 등록</button></form>`);
}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.tab){tab=b.dataset.tab;filter='전체';render();return}
 if(b.dataset.product){product=b.dataset.product;filter='전체';selected='';render();return}
 if(b.dataset.id){selected=b.dataset.id;render();return}
 const r=chosen();
 switch(b.id){
 case 'import':openImport();break;
 case 'sample':download('아치미당_연습리뷰.csv',[csvHeads,['NEW01',pInfo().name,'기본',4,'2026-11-18','지난번보다 향이 약하게 느껴져요.'],['NEW02',pInfo().name,'기본',5,'2026-11-19','차분한 향이 제 취향이에요.']].map((row,i)=>i?[product+'-'+row[0],...row.slice(1)]:row));break;
 case 'rules':modal('<h2>분류 기준</h2><p>“묽어서 잘 발려요”는 개인 선호, “지난번보다 묽어졌어요”는 비교 대상이 있는 변화 관찰입니다. 별점이 높아도 변화 근거가 있으면 점검 후보로 둡니다.</p><p class="note">기본 리뷰는 준비된 분류 예시를 사용합니다. 새 CSV는 표현 규칙으로 초안을 만들며, 담당자가 원문을 대조해 수정할 수 있습니다.</p>');break;
 case 'draft':if(r)modal(`<h2>최초 분류</h2><p>${h(r.base.types.join(' · '))} / ${h(r.base.expression)} / ${h(r.base.decision)}</p><blockquote class="quote">“${h(r.base.evidence)}”</blockquote>`);break;
 case 'fill':{const route=$('#action').elements.route.value,notes={'제품사양 대조':'제품 설명과 이전 구매품의 차이를 대조한다.','OEM 공급사 문의':'해당 생산분의 출고 사양과 변경 사항을 공급사에 문의한다.','자체 포장 점검':'같은 구성과 포장 상태를 출고 점검 기록과 대조한다.','고객 추가 문의':'어느 부분이 어떻게 달랐는지 추가 설명을 요청한다.','선호 기록':'다음 제품 기획 회의에 고객 선호 사례로 공유한다.'};$('#action').elements.note.value=notes[route];break}
 case 'export':exportActions();break;
 case 'manage':modal('<h2>자료 관리</h2><p class="hint">모든 제품의 리뷰를 CSV로 저장하거나 연습을 처음부터 시작할 수 있습니다.</p><div class="tools"><button id="allcsv">리뷰 원문 CSV</button><button class="plain" id="reset">기본 자료 복원</button></div><div id="confirm"></div>');break;
 case 'allcsv':download('아치미당_리뷰원문.csv',[csvHeads,...reviews.map(rawRow)]);break;
 case 'reset':$('#confirm').innerHTML='<p>등록한 리뷰, 수정한 분류와 조치 이력을 지우고 기본 리뷰 22건을 복원합니다.</p><button id="resetYes">초기화 확인</button>';break;
 case 'resetYes':reviews=seedReviews();product='berry';filter='전체';selected='R001';$('#dialog').close();render();if(persist())toast('기본 리뷰를 복원했습니다.');break;
 }
});
document.addEventListener('change',e=>{if(e.target.id==='filter'){filter=e.target.value;render()}});
document.addEventListener('submit',async e=>{
 const form=e.target;if(!['classification','action','importForm'].includes(form.id))return;e.preventDefault();
 if(form.id==='importForm'){try{const {add,duplicate}=prepareImport(await form.elements.file.files[0].text());reviews.push(...add);$('#dialog').close();filter='전체';if(add.length){product=add[0].product;selected=add[0].id}render();if(persist())toast('등록 '+add.length+'건 · 중복 제외 '+duplicate+'건')}catch(err){$('#importMsg').textContent=err.message}return}
 const r=chosen(),f=new FormData(form);
 if(form.id==='classification'){const types=f.getAll('types'),evidence=f.get('evidence').trim();if(!types.length||!evidence||!r.text.includes(evidence)){toast('유형을 선택하고 원문에 있는 구절을 근거로 입력하세요.');return}r.revision={types,expression:f.get('expression'),decision:f.get('decision'),evidence}}
 else{const note=f.get('note').trim();if(!note){toast('조치 메모를 입력하세요.');return}r.history.push({time:new Date().toISOString(),route:f.get('route'),status:f.get('status'),evidence:state(r).evidence,note})}
 render();if(persist())toast(form.id==='classification'?'분류 검토를 저장했습니다.':'조치 이력에 추가했습니다.');
});
render();

