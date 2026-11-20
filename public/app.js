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


let duelState=null;
function refreshDuelDecks(){
 const sel=$("duelDeck"); if(!sel)return;
 sel.innerHTML=decks.map(d=>'<option value="'+d.id+'">'+esc(d.name)+' ('+d.cards.filter(c=>c.zone!=="extra").length+'张主卡组)</option>').join("");
}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function startDuel(){
 const d=decks.find(x=>x.id===$("duelDeck").value);
 if(!d)return toast("请先创建卡组");
 const main=d.cards.filter(c=>c.zone!=="extra");
 if(main.length<40)return toast("主卡组至少需要 40 张");
 const pool=main.map(c=>cardCatalog.find(x=>String(x.id)===String(c.id))).filter(Boolean);
 if(pool.length<40)return toast("当前卡组中有未关联资料库的卡牌，请从资料库添加至少 40 张卡");
 const makeDeck=()=>shuffle(pool.map(c=>({...c})));
 duelState={player:{lp:8000,deck:makeDeck(),hand:[],field:[],grave:[],drawn:false,summoned:false,attacked:false},ai:{lp:8000,deck:makeDeck(),hand:[],field:[],grave:[]},turn:1,phase:"player",over:false,log:["决斗开始！双方 LP：8000。"]};
 for(let i=0;i<5;i++){duelState.player.hand.push(duelState.player.deck.pop());duelState.ai.hand.push(duelState.ai.deck.pop())}
 $("duelControls").hidden=false;renderDuel();$("duelStatus").textContent="你的回合 · 第 1 回合";
}
function renderDuel(){
 const s=duelState;if(!s)return;
 const side=(p,label)=>'<div class="duel-side"><div class="duel-side-head"><b>'+label+'</b><strong>LP '+p.lp+'</strong></div><div class="duel-zone"><small>怪兽区域</small><div class="duel-monsters">'+p.field.map((c,i)=>'<div class="duel-monster"><b>'+esc(c.name)+'</b><span>ATK '+c.atk+' / DEF '+c.def+'</span>'+(label==="你"&&!s.over?'<button data-duel-select="'+i+'">选择</button>':"")+'</div>').join("")||'<span class="hint">空场</span>'+'</div></div><div class="duel-counts">手牌 '+p.hand.length+' · 卡组 '+p.deck.length+' · 墓地 '+p.grave.length+'</div></div>';
 $("duelBoard").innerHTML='<div class="duel-statusbar"><b>'+(s.over?"决斗结束":(s.phase==="player"?"你的回合":"AI 回合"))+' · 第 '+s.turn+' 回合</b><span>双方 LP 变化会实时显示</span></div>'+side(s.ai,"AI")+'<div class="duel-mid">VS</div>'+side(s.player,"你")+'<div class="duel-hand"><b>你的手牌（选择一张）</b><div>'+s.player.hand.map((c,i)=>'<button data-hand="'+i+'" class="'+(s.selected===i?"selected":"")+'">'+esc(c.name)+'<small>ATK '+c.atk+'</small></button>').join("")+'</div></div><div class="duel-log">'+s.log.slice(-5).map(x=>'<p>'+esc(x)+'</p>').join("")+'</div>';
 $("handSelect").innerHTML=s.player.hand.map((c,i)=>'<option value="'+i+'">'+esc(c.name)+'</option>').join("");
}
function playerDraw(){
 const p=duelState?.player;if(!p||duelState.over||duelState.phase!=="player"||p.drawn)return;
 if(!p.deck.length){finishDuel("你因卡组耗尽而输掉决斗");return}
 p.hand.push(p.deck.pop());p.drawn=true;duelState.log.push("你抽了 1 张卡。");renderDuel();
}
function playerSummon(){
 const s=duelState,p=s?.player;if(!p||s.over||s.phase!=="player"||p.summoned)return;
 const i=Number($("handSelect").value),c=p.hand[i];if(!c)return;
 if(!(Number(c.type)&1))return toast("简化测试模式目前只允许通常召唤怪兽");
 if(p.field.length>=5)return toast("怪兽区域已满");
 p.hand.splice(i,1);p.field.push(c);p.summoned=true;s.log.push("你通常召唤了「"+c.name+"」。");renderDuel();
}
function playerAttack(){
 const s=duelState,p=s?.player,a=s?.ai;if(!p||s.over||s.phase!=="player"||p.attacked)return;
 const i=s.selectedField??(p.field.length-1),att=p.field[i];if(!att)return toast("请先在场上选择攻击怪兽");
 const target=a.field[0];
 if(target){
  if(att.atk>target.atk){a.grave.push(a.field.shift());a.lp-=att.atk-target.atk;s.log.push(att.name+" 击破 "+target.name+"，AI 受到 "+(att.atk-target.atk)+" 伤害。")}
  else if(att.atk<target.atk){p.grave.push(p.field.splice(i,1)[0]);p.lp-=target.atk-att.atk;s.log.push(att.name+" 被 "+target.name+" 击破，你受到 "+(target.atk-att.atk)+" 伤害。")}
  else{s.log.push("双方怪兽攻击力相同，均未被破坏。")}
 }else{a.lp-=Number(att.atk)||0;s.log.push(att.name+" 直接攻击，AI 受到 "+att.atk+" 伤害。")}
 p.attacked=true;if(a.lp<=0)finishDuel("你赢得了决斗！");else if(p.lp<=0)finishDuel("AI 赢得了决斗。");else renderDuel();
}
function finishDuel(message){duelState.over=true;duelState.log.push(message);$("duelStatus").textContent=message;renderDuel()}
function endPlayerTurn(){
 const s=duelState;if(!s||s.over||s.phase!=="player")return;
 s.phase="ai";s.log.push("你结束了回合。");
 const a=s.ai,p=s.player;
 if(a.deck.length)a.hand.push(a.deck.pop());
 const monsters=a.hand.filter(c=>(Number(c.type)&1)).sort((x,y)=>(Number(y.atk)||0)-(Number(x.atk)||0));
 if(monsters.length&&a.field.length<5){const c=monsters[0],i=a.hand.indexOf(c);a.hand.splice(i,1);a.field.push(c);s.log.push("AI 通常召唤了「"+c.name+"」。")}
 if(a.field.length){
  const attacker=a.field.slice().sort((x,y)=>(Number(y.atk)||0)-(Number(x.atk)||0))[0],target=p.field[0];
  if(target){
   if(attacker.atk>target.atk){p.grave.push(p.field.shift());p.lp-=attacker.atk-target.atk;s.log.push("AI 击破 "+target.name+"，你受到 "+(attacker.atk-target.atk)+" 伤害。")}
   else if(attacker.atk<target.atk){a.grave.push(a.field.splice(a.field.indexOf(attacker),1)[0]);a.lp-=target.atk-attacker.atk;s.log.push("你的 "+target.name+" 击破 AI 怪兽。")}
  }else{p.lp-=Number(attacker.atk)||0;s.log.push("AI 直接攻击，你受到 "+attacker.atk+" 伤害。")}
 }
 if(p.lp<=0){finishDuel("AI 赢得了决斗。");return}
 s.turn++;s.phase="player";p.drawn=false;p.summoned=false;p.attacked=false;s.selectedField=undefined;
 $("duelStatus").textContent="你的回合 · 第 "+s.turn+" 回合";renderDuel();
}
$("startDuel").onclick=startDuel;
$("drawCard").onclick=playerDraw;
$("summonCard").onclick=playerSummon;
$("attackCard").onclick=playerAttack;
$("endTurn").onclick=endPlayerTurn;
$("duelBoard").addEventListener("click",e=>{
 const h=e.target.closest("[data-hand]");if(h){duelState.selected=Number(h.dataset.hand);$("handSelect").value=h.dataset.hand;renderDuel();return}
 const m=e.target.closest("[data-duel-select]");if(m){duelState.selectedField=Number(m.dataset.duelSelect);toast("已选择场上怪兽");}
});

refreshDuelDecks();
