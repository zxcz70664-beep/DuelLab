const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { WebSocketServer, WebSocket } = require("ws");

const root = path.resolve(__dirname, "../public");
const port = Number(process.env.PORT || 8080);
const types = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"text/javascript; charset=utf-8" };
const rooms = new Map();
const PHASES = ["主要阶段1", "战斗阶段", "主要阶段2", "结束阶段"];

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do { code = Array.from({length:6}, () => chars[crypto.randomInt(chars.length)]).join(""); } while (rooms.has(code));
  return code;
}
function publicState(room) {
  return { roomId:room.id, status:room.players[1] ? "ready" : "waiting",
    players:room.players.map((p,i)=>p ? {seat:i,name:p.name,connected:!!p.socket} : null),
    lp:[...room.state.lp], turn:room.state.turn, phase:room.state.phase,
    phaseName:PHASES[room.state.phase], handCounts:[...room.state.handCounts],
    log:room.state.log.slice(-30) };
}
function broadcast(room) {
  const data = JSON.stringify({type:"state",state:publicState(room)});
  for (const p of room.players) if (p?.socket?.readyState === WebSocket.OPEN) p.socket.send(data);
}
function reply(res,status,data) {
  res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store"});
  res.end(JSON.stringify(data));
}
const server = http.createServer((req,res) => {
  const url = new URL(req.url,"http://localhost");
  if (req.method === "GET" && url.pathname === "/api/health") return reply(res,200,{ok:true,version:"0.2.0",rooms:rooms.size});
  if (req.method === "POST" && url.pathname === "/api/rooms") {
    const id=makeCode(), token=crypto.randomBytes(24).toString("hex");
    const room={id,createdAt:Date.now(),players:[{token,name:"玩家1",socket:null},null],
      state:{lp:[8000,8000],turn:0,phase:0,handCounts:[5,5],log:["房间已创建，等待玩家2加入"]}};
    rooms.set(id,room); return reply(res,201,{roomId:id,token,seat:0,state:publicState(room)});
  }
  const joinMatch=url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{6})\/join$/);
  if (req.method === "POST" && joinMatch) {
    const room=rooms.get(joinMatch[1]);
    if (!room) return reply(res,404,{error:"房间不存在或已过期"});
    if (room.players[1]) return reply(res,409,{error:"房间已满"});
    const token=crypto.randomBytes(24).toString("hex");
    room.players[1]={token,name:"玩家2",socket:null};
    room.state.log.push("玩家2已加入房间"); broadcast(room);
    return reply(res,200,{roomId:room.id,token,seat:1,state:publicState(room)});
  }
  const filePath=path.resolve(root,"."+ (url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname)));
  if (!filePath.startsWith(root + path.sep) && filePath !== path.join(root,"index.html")) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(filePath,(err,data)=>{ if(err){res.writeHead(404);return res.end("Not found");}
    res.writeHead(200,{"content-type":types[path.extname(filePath)]||"application/octet-stream","x-content-type-options":"nosniff"});res.end(data); });
});
const wss = new WebSocketServer({noServer:true});
server.on("upgrade",(req,socket,head)=>{
  const url=new URL(req.url,"http://localhost");
  if(url.pathname!=="/ws"){socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,ws=>wss.emit("connection",ws,req));
});
wss.on("connection",(ws,req)=>{
  const url=new URL(req.url,"http://localhost"), room=rooms.get((url.searchParams.get("room")||"").toUpperCase()), token=url.searchParams.get("token");
  const seat=room?.players.findIndex(p=>p?.token===token) ?? -1;
  if(!room || seat<0){ws.close(1008,"Invalid room token");return;}
  const player=room.players[seat];
  if(player.socket && player.socket.readyState===WebSocket.OPEN) player.socket.close(4001,"Reconnected elsewhere");
  player.socket=ws; room.state.log.push(player.name+"已连接"); broadcast(room);
  ws.send(JSON.stringify({type:"welcome",seat,state:publicState(room)}));
  ws.on("message",raw=>{
    let msg; try{msg=JSON.parse(raw.toString())}catch{return;}
    if(!msg || msg.type!=="action")return;
    const s=room.state, action=msg.action;
    if(action==="draw"){s.handCounts[seat]=Math.min(20,s.handCounts[seat]+1);s.log.push(player.name+"抽1张牌（在线同步测试）");}
    else if(action==="lp" && Number.isInteger(msg.delta) && Math.abs(msg.delta)<=8000){s.lp[seat]=Math.max(0,Math.min(99999,s.lp[seat]+msg.delta));s.log.push(player.name+"生命值 "+(msg.delta>0?"+":"")+msg.delta);}
    else if(action==="phase"){s.phase=(s.phase+1)%4;s.log.push(player.name+"切换至"+PHASES[s.phase]);}
    else if(action==="endTurn"){s.turn=1-s.turn;s.phase=0;s.log.push(player.name+"结束回合");}
    else return;
    broadcast(room);
  });
  ws.on("close",()=>{if(player.socket===ws){player.socket=null;room.state.log.push(player.name+"断开连接");broadcast(room);}});
});
setInterval(()=>{const now=Date.now();for(const [id,r] of rooms){if(now-r.createdAt>2*60*60*1000)rooms.delete(id);}},10*60*1000).unref();
server.listen(port,"0.0.0.0",()=>console.log("DuelLab V0.2 listening on "+port));
