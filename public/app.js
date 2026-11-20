const $=id=>document.getElementById(id);let decks=read(),current=null;function read(){try{return JSON.parse(localStorage.getItem("duellab.decks")||"[]")}catch{return []}}function save(){localStorage.setItem("duellab.decks",JSON.stringify(decks));$("saveStatus").textContent="已保存 "+new Date().toLocaleTimeString("zh-CN")}function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}function toast(s){let t=$("toast");t.textContent=s;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2100)}function page(p){document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.id===p));document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===p))}document.querySelectorAll(".nav").forEach(x=>x.onclick=()=>page(x.dataset.page));document.querySelectorAll("[data-go]").forEach(x=>x.onclick=()=>page(x.dataset.go));$("goDecks").onclick=()=>page("decks");function list(){ $("deckCount").textContent=decks.length+" 个卡组";$("deckList").innerHTML=decks.map(d=>'<button class="deckItem '+(d.id===current?'active':'')+'" data-id="'+d.id+'">'+esc(d.name)+'　<small>'+d.cards.length+'张</small></button>').join("")||'<p class="hint">暂无卡组</p>';document.querySelectorAll("[data-id]").forEach(x=>x.onclick=()=>select(x.dataset.id))}function select(id){current=id;let d=decks.find(x=>x.id===id);$("empty").hidden=true;$("edit").hidden=false;$("deckName").value=d.name;list();cards()}function validateDeck(d){return window.DuelLabDeckValidation.validateDeck(d)}
function cards(){let d=decks.find(x=>x.id===current);if(!d)return;const check=validateDeck(d);$("mainCount").textContent=check.main;$("extraCount").textContent=check.extra;$("legality").textContent=check.ok?"基础结构通过":"需调整";$("legality").className=check.ok?"valid":"invalid";$("validation").textContent=check.ok?"基础结构检查通过。注意：这不代表符合日本 OCG 禁限卡表或全部卡牌构筑限制。":"基础结构问题："+check.errors.join("；")+"。注意：禁限卡表与特殊构筑限制尚未检查。";$("cardRows").innerHTML=d.cards.map((c,i)=>'<div class="cardrow">'+esc(c.name)+'<small>'+(c.zone==="extra"?"额外卡组":"主卡组")+'</small><button class="remove" data-remove="'+i+'">−</button></div>').join("")||'<p class="hint">卡组为空</p>';document.querySelectorAll("[data-remove]").forEach(x=>x.onclick=()=>{d.cards.splice(+x.dataset.remove,1);save();cards();list()})}$("newDeck").onclick=()=>{let d={id:crypto.randomUUID(),name:"新建卡组 "+(decks.length+1),cards:[]};decks.push(d);save();select(d.id);toast("已创建卡组")};$("deckName").oninput=()=>{let d=decks.find(x=>x.id===current);if(d){d.name=$("deckName").value;save();list()}};$("addCard").onclick=()=>{let name=$("cardName").value.trim(),d=decks.find(x=>x.id===current);if(!name)return toast("请输入卡牌名称");if(!d)return;d.cards.push({name,zone:$("cardType").value});$("cardName").value="";save();cards();list();toast("已添加条目")};$("cardName").onkeydown=e=>{if(e.key==="Enter")$("addCard").click()};$("deleteDeck").onclick=()=>{if(!current||!confirm("确定删除这个卡组？"))return;decks=decks.filter(x=>x.id!==current);current=null;save();list();$("edit").hidden=true;$("empty").hidden=false};$("exportDeck").onclick=()=>{let d=decks.find(x=>x.id===current);if(!d)return;let a=document.createElement("a"),u=URL.createObjectURL(new Blob([JSON.stringify({format:"DuelLabDeck",version:1,deck:d},null,2)],{type:"application/json"}));a.href=u;a.download=d.name+".json";a.click();URL.revokeObjectURL(u);toast("JSON 已导出")};$("importDeck").onclick=()=>$("fileInput").click();$("fileInput").onchange=async e=>{try{let v=JSON.parse(await e.target.files[0].text()),d=v.deck;if(v.format!=="DuelLabDeck"||!Array.isArray(d.cards))throw Error("格式不匹配");let n={id:crypto.randomUUID(),name:String(d.name||"导入卡组"),cards:d.cards.map(c=>({name:String(c.name||"未命名"),zone:c.zone==="extra"?"extra":"main"}))};decks.push(n);save();select(n.id);toast("导入成功")}catch(err){toast("导入失败："+err.message)}e.target.value=""};list();if(decks.length)select(decks[0].id);

let cardCatalog=[];
async function loadCardCatalog(){
  const count=$("libraryCount"),results=$("libraryResults");
  try{
    const response=await fetch("/cards.json");
    if(!response.ok)throw new Error("HTTP "+response.status);
    const payload=await response.json();
    cardCatalog=payload.cards||[];
    count.textContent="已载入 "+cardCatalog.length.toLocaleString("zh-CN")+" 张卡牌 · 日文原文";
    renderCardSearch("");
  }catch(error){
    count.textContent="卡牌数据载入失败";
    results.innerHTML='<p class="hint">数据库暂时不可用：'+esc(error.message)+'</p>';
  }
}
function renderCardSearch(query){
  const results=$("libraryResults");
  if(!results)return;
  const q=query.trim().toLocaleLowerCase();
  if(!cardCatalog.length){results.innerHTML='<p class="hint">卡牌数据尚未载入。</p>';return}
  if(!q){results.innerHTML='<p class="hint">输入日文卡名或效果关键词开始搜索。</p>';return}
  const found=cardCatalog.filter(c=>(c.name||"").toLocaleLowerCase().includes(q)||(c.desc||"").toLocaleLowerCase().includes(q)).slice(0,60);
  results.innerHTML=found.map(c=>'<article class="library-card"><div class="library-card-head"><b>'+esc(c.name)+'</b><small>ID '+c.id+'</small></div><p>'+esc((c.desc||"暂无效果文本").slice(0,260))+(c.desc&&c.desc.length>260?"…":"")+'</p><div class="library-card-meta"><span>'+esc(cardTypeLabel(c.type))+'</span><span>ATK '+c.atk+' / DEF '+c.def+'</span><span>资料已导入 · 脚本未验证</span><button data-add-catalog="'+c.id+'">加入当前卡组</button></div></article>').join("")||'<p class="hint">没有找到匹配卡牌。</p>';
}
function cardTypeLabel(type){
  const t=Number(type)||0, labels=[];
  if(t&1)labels.push("怪兽"); if(t&2)labels.push("魔法"); if(t&4)labels.push("陷阱");
  if(t&0x2000)labels.push("融合"); if(t&0x400000)labels.push("同调"); if(t&0x800000)labels.push("超量");
  if(t&0x1000000)labels.push("灵摆"); if(t&0x10000000)labels.push("连接");
  return labels.join(" / ")||"卡牌";
}
$("librarySearch").addEventListener("input",e=>renderCardSearch(e.target.value));
$("libraryResults").addEventListener("click",e=>{
  const button=e.target.closest("[data-add-catalog]");
  if(!button)return;
  const card=cardCatalog.find(c=>String(c.id)===button.dataset.addCatalog);
  const deck=decks.find(d=>d.id===current);
  if(!card)return;
  if(!deck){toast("请先创建并选择一个卡组");page("decks");return}
  if(deck.cards.some(c=>c.id===card.id)){toast("这张卡已在当前卡组中");return}
  deck.cards.push({id:card.id,name:card.name,zone:"main",source:"BabelCDB"});
  save();cards();list();toast("已加入卡组："+card.name);
});
loadCardCatalog();
