/* Local visual preview only: real stock xterm renderer, simulated PTY output. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const file = process.env.PREVIEW_HTML || path.join(__dirname, '..', '.generated', 'index.html');
const mock = `<script>
(function () {
  class PreviewSocket extends EventTarget {
    static CONNECTING=0; static OPEN=1; static CLOSING=2; static CLOSED=3;
    constructor(url, protocols) {
      super(); this.url=String(url); this.protocol='tty'; this.readyState=0; this.binaryType='arraybuffer';
      setTimeout(() => { this.readyState=1; this.dispatchEvent(new Event('open')); }, 30);
    }
    emit(text) { const bytes=new TextEncoder().encode(text); this.dispatchEvent(new MessageEvent('message',{data:bytes.buffer})); }
    send(data) {
      const text=typeof data==='string'?data:new TextDecoder().decode(data);
      if (text.startsWith('{')) setTimeout(() => {
        this.emit('2'+JSON.stringify({fontSize:15,theme:{background:'#101418',foreground:'#e6edf3'}}));
        this.emit('1NAS WebTerm');
        this.emit('0\\x1b[1;36mNAS WebTerm\\x1b[0m  /  your terminal, anywhere\\r\\n\\r\\nSSH, files and tools. One familiar workspace.\\r\\n\\r\\n\\x1b[1;32mroot@webterm\\x1b[0m:~# ');
      }, 10);
      else if (text.startsWith('0')) {
        const input=text.slice(1);
        if(input==='\\r') this.emit('0\\r\\n\\x1b[1;32mroot@webterm\\x1b[0m:~# ');
        else if(input==='\\x03') this.emit('0^C\\r\\n\\x1b[1;32mroot@webterm\\x1b[0m:~# ');
        else if(!/[\\x00-\\x1f\\x7f]/.test(input)) this.emit('0'+input);
      }
    }
    close() { this.readyState=3; this.dispatchEvent(new CloseEvent('close',{code:1000})); }
  }
  window.WebSocket=PreviewSocket;
})();
</script>`;
const stock = fs.readFileSync(file, 'utf8');
const html = stock.replace(/<head\b[^>]*>/i, match => match + mock);
const server=http.createServer((req,res)=>{
  if(req.url.split('?')[0]==='/token') { res.writeHead(200,{'Content-Type':'application/json'}); res.end('{"token":"preview"}'); }
  else if(req.url.split('?')[0]==='/') { res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}); res.end(html); }
  else {res.writeHead(404);res.end();}
});
server.listen(Number(process.env.PREVIEW_PORT||17683),'127.0.0.1',()=>console.log('Visual preview: http://127.0.0.1:'+server.address().port));
