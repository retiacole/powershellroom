(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./network.js') : root.PSRNetwork);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PSRShell = api;
})(globalThis, function (Network) {
  'use strict';
  const MAX_LINE = 4096, MAX_FILE = 65536, MAX_FILES = 256, MAX_OUTPUT = 65536;
  const badKeys = new Set(['__proto__', 'prototype', 'constructor']);
  const own = (v,k) => Object.prototype.hasOwnProperty.call(v,k);
  const plain = v => v && typeof v === 'object' && !Array.isArray(v);
  const clone = v => JSON.parse(JSON.stringify(v));
  const byteLength = s => new TextEncoder().encode(s).length;
  const aliases = {gcm:'Get-Command',help:'Get-Help',gci:'Get-ChildItem',ls:'Get-ChildItem',dir:'Get-ChildItem',cd:'Set-Location',pwd:'Get-Location',cat:'Get-Content',type:'Get-Content',gc:'Get-Content',select:'Select-Object',where:'Where-Object',sort:'Sort-Object',measure:'Measure-Object',foreach:'ForEach-Object',echo:'Write-Output',gm:'Get-Member',ft:'Format-Table',fl:'Format-List',gps:'Get-Process',ps:'Get-Process',gsv:'Get-Service',sls:'Select-String',ni:'New-Item',cp:'Copy-Item',copy:'Copy-Item',mv:'Move-Item',move:'Move-Item',ren:'Rename-Item',rm:'Remove-Item',del:'Remove-Item',cls:'Clear-Host',clear:'Clear-Host'};
  const specs = [
    ['Get-Command','コマンドを探す','Find commands','Get-Command [-Name pattern]'],
    ['Get-Help','書式と使い方を見る','Read supported syntax','Get-Help command [-Examples | -Full]'],
    ['Get-Alias','別名の対応を見る','Inspect aliases','Get-Alias [-Name alias]'],
    ['Get-Location','現在地を表示','Show current location','Get-Location'],
    ['Set-Location','フォルダーを移動','Change directory','Set-Location [-Path] path'],
    ['Get-ChildItem','ファイル一覧','List files and directories','Get-ChildItem [-Path path] [-File | -Directory] [-Recurse] [-Filter pattern] [-Force]'],
    ['Get-Item','指定したファイルの情報','Inspect an exact item','Get-Item [-Path | -LiteralPath] path'],
    ['Test-Path','パスがあるか調べる','Check whether a path exists','Test-Path [-Path | -LiteralPath] path'],
    ['Get-Content','テキストを読む','Read text','Get-Content [-Path | -LiteralPath] path [-Tail n | -TotalCount n | -Raw]'],
    ['Set-Content','テキストを書き込む','Replace text content','Set-Content -Path path -Value text [-Encoding utf8] [-WhatIf]'],
    ['Add-Content','テキストを追記','Append text content','Add-Content -Path path -Value text [-Encoding utf8] [-WhatIf]'],
    ['New-Item','ファイルやフォルダーを作る','Create a file or directory','New-Item -Path path -ItemType File|Directory [-Value text] [-WhatIf]'],
    ['Copy-Item','ファイルをコピー','Copy a file','Copy-Item -Path source -Destination target [-WhatIf]'],
    ['Move-Item','ファイルを移動','Move a file','Move-Item -Path source -Destination target [-WhatIf]'],
    ['Rename-Item','同じフォルダーで名前を変更','Rename in the same directory','Rename-Item -Path path -NewName name [-WhatIf]'],
    ['Remove-Item','ファイルを削除','Remove a file','Remove-Item -Path path [-WhatIf]'],
    ['Get-Member','オブジェクトの型と項目','Inspect types and properties','command | Get-Member'],
    ['Select-Object','必要な項目や先頭・末尾を選ぶ','Select properties, first or last items','command | Select-Object [-Property] Name,Length [-First n] [-Last n] [-ExpandProperty name]'],
    ['Where-Object','条件で絞り込む','Filter by a condition','command | Where-Object { $_.Property -eq value }'],
    ['Sort-Object','項目の値で並べ替える','Sort by property values','command | Sort-Object [-Property] property [-Descending]'],
    ['Measure-Object','件数や合計を調べる','Count or aggregate objects','command | Measure-Object [-Property property] [-Sum] [-Average]'],
    ['Group-Object','項目の値でまとめる','Group by a property','command | Group-Object [-Property] property'],
    ['ForEach-Object','各オブジェクトの項目を取り出す','Project one property from each object','command | ForEach-Object { $_.Name }'],
    ['Format-Table','表として表示','Format a display table','command | Format-Table [-Property Name,Length] [-AutoSize]'],
    ['Format-List','縦に項目を表示','Format a display list','command | Format-List [-Property Name,Length]\ncommand | Format-List *'],
    ['Out-File','表示用テキストを保存','Save formatted text','command | Out-File -FilePath path [-Encoding utf8] [-Append] [-WhatIf]'],
    ['Export-Csv','オブジェクトをCSVへ保存','Save objects as CSV','command | Export-Csv -Path path -NoTypeInformation [-Encoding utf8] [-WhatIf]'],
    ['Import-Csv','CSVをオブジェクトとして読む','Read CSV as objects','Import-Csv [-Path] path'],
    ['ConvertTo-Json','JSON文字列に変換','Convert objects to JSON','command | ConvertTo-Json [-Depth n]'],
    ['ConvertFrom-Json','JSONからオブジェクトへ','Parse JSON into objects','Get-Content path -Raw | ConvertFrom-Json'],
    ['Select-String','テキストから文字列を探す','Find literal text in lines','Select-String [-Pattern] text [-Path] path [-SimpleMatch]'],
    ['Write-Output','値をパイプラインに送る','Send values to the pipeline','Write-Output value'],
    ['Clear-Host','端末の表示を消す','Clear the terminal display','Clear-Host']
  ];
  const reference = specs.map(([name,summaryJa,summaryEn,syntax])=>({name,summaryJa,summaryEn,syntax}));
  const allReferences = () => [...reference,...(Network.reference||[])];
  const canonical = name => (aliases[name.toLowerCase()] || name).toLowerCase();
  const scenarios = ['base','service-stopped','dns-wrong','tcp-blocked','web-503','low-disk'];
  function fail(message) { throw new Error(message); }
  function unsupported(message) { fail('[Simulator] '+message); }
  function safeKey(key) { if (badKeys.has(String(key).toLowerCase())) fail('Unsupported property name.'); return key; }
  function property(obj,key) {
    safeKey(key);
    if (obj === null || obj === undefined) return undefined;
    if ((typeof obj === 'string' || Array.isArray(obj)) && /^(length|count)$/i.test(key)) return obj.length;
    if (typeof obj !== 'object') return undefined;
    const actual = Object.keys(obj).find(k=>k.toLowerCase()===key.toLowerCase());
    return actual === undefined ? undefined : obj[actual];
  }
  function scalar(v) {
    if (v === true) return 'True'; if (v === false) return 'False';
    if (v === undefined || v === null) return '';
    if (Array.isArray(v)) return '{'+v.map(scalar).join(', ')+'}';
    if (typeof v === 'object') return '@{'+Object.entries(v).map(([k,x])=>k+'='+scalar(x)).join('; ')+'}';
    return String(v);
  }
  function format(stream,style='default',columns) {
    const items = stream.items || [];
    if (stream.type === 'PSR.FormatData') return items.map(x=>x.Text).join('\n');
    if (!items.length) return '';
    if (!items.every(plain)) return items.map(scalar).join('\n');
    if (columns?.includes('*')) columns=[...new Set(columns.flatMap(k=>k==='*'?items.flatMap(x=>Object.keys(x)):[k]))];
    if (!columns && style==='list' && stream.type==='System.Diagnostics.Process') columns=['Id','Handles','CPU','SI','Name'];
    if (!columns && (style==='default'||style==='table')) {
      if (stream.type==='System.ServiceProcess.ServiceController') columns=['Status','Name','DisplayName'];
      if (stream.type==='System.Diagnostics.Process') columns=['Id','ProcessName','CPU','WorkingSet64'];
      if (/^System\.IO\.(?:FileInfo|DirectoryInfo|FileSystemInfo)$/.test(stream.type)) columns=['Mode','LastWriteTime','Length','Name'];
    }
    if (style==='default') {
      if (stream.type==='NetTCPIP.TestNetConnectionResult') style='list';
      if (stream.type==='Microsoft.Management.Infrastructure.CimInstance') {
        // Get-NetIPConfiguration has a list view with display expressions.
        // Keep the nested source objects intact for the pipeline and inspector.
        return format({items:items.map(x=>({...x,NetProfile:x.NetProfile?.Name,
          IPv4Address:x.IPv4Address?.IPAddress,IPv4DefaultGateway:x.IPv4DefaultGateway?.NextHop,
          DNSServer:x.DNSServer?.ServerAddresses}))},'list');
      }
    }
    const cols = columns || [...new Set(items.flatMap(x=>Object.keys(x)))].slice(0,16);
    if (style==='list') return items.map(x=>cols.map(k=>`${k} : ${scalar(property(x,k))}`).join('\n')).join('\n\n');
    const widths = cols.map(k=>Math.min(70,Math.max(k.length,...items.map(x=>scalar(property(x,k)).length))));
    const line = vals => vals.map((v,i)=>String(v).slice(0,70).padEnd(widths[i])).join('  ').trimEnd();
    return [line(cols),line(cols.map((k,i)=>'-'.repeat(widths[i]))),...items.map(x=>line(cols.map(k=>scalar(property(x,k)))))].join('\n');
  }
  const result = (items=[],type='System.Object',extra={}) => ({items,type,error:'',code:0,effects:[],...extra});
  function resolve(session,value,fromInput=true) {
    let raw=String(value ?? '').trim();
    if (fromInput) raw=raw.replace(/[\/¥￥]/g,'\\');
    if (!raw) raw=session.cwd;
    if (/^\\\\/.test(raw)) unsupported('UNC paths are not implemented. Use the virtual C: or D: drive.');
    if (/^[A-Za-z]:/.test(raw) && !/^[CD]:\\/i.test(raw)) unsupported('Use an absolute C:\\ or D:\\ path; drive-relative paths are not implemented.');
    if (/^[CD]:\\/i.test(raw)) raw=raw[0].toUpperCase()+raw.slice(1);
    else raw=raw.startsWith('\\') ? session.cwd.slice(0,2)+raw : session.cwd.replace(/\\$/,'')+'\\'+raw;
    const drive=raw.slice(0,2),parts=[];
    for (const part of raw.slice(3).split('\\')) {
      if (!part || part==='.') continue;
      if (part==='..') { parts.pop(); continue; }
      if (/[<>:"|?*\x00-\x1f]/.test(part)) fail('Invalid path. Wildcards are supported only in Get-ChildItem -Path/-Filter.');
      if (part.endsWith('.') || part.endsWith(' ')) fail('Path names ending in a dot or space are not implemented.');
      parts.push(part);
    }
    const path=drive+'\\'+parts.join('\\');
    if (path.length>512) fail('Path is too long.');
    return path;
  }
  const get=(s,p)=>s.files[p.toLowerCase()];
  const parentPath=p=>p.lastIndexOf('\\') <= 2 ? p.slice(0,3) : p.slice(0,p.lastIndexOf('\\'));
  const basename=p=>p.slice(p.lastIndexOf('\\')+1);
  function ensureParents(s,path) {
    const par=parentPath(path); if (par===path) return;
    if (!get(s,par)) { ensureParents(s,par); s.files[par.toLowerCase()]={path:par,dir:true,content:''}; }
  }
  const seedTime = path => /archive\.log$/i.test(path)?'2026-10-21T00:00:00.000Z':/app\.log$/i.test(path)?'2026-10-28T00:10:00.000Z':/notes\.txt$/i.test(path)?'2026-10-28T00:05:00.000Z':'2026-10-28T00:00:00.000Z';
  function fileObject(f) { return {Mode:f.dir?'d----':'-a---',LastWriteTime:f.lastWriteTime||seedTime(f.path),Name:basename(f.path),...(!f.dir?{Length:byteLength(f.content)}:{}),FullName:f.path,Extension:f.dir?'':(basename(f.path).match(/\.[^.]+$/)||[''])[0],PSIsContainer:f.dir}; }
  function write(s,path,content,dir=false) {
    if (typeof content!=='string' || content.length>MAX_FILE) fail('Virtual file exceeds the 65,536 character limit.');
    const parent=get(s,parentPath(path)); if (!parent || !parent.dir) fail('Could not find the destination directory: '+parentPath(path));
    const existing=get(s,path); if(existing && existing.dir!==dir) fail('A file and a directory cannot share this path.');
    if(!existing && Object.keys(s.files).length>=MAX_FILES) fail('Virtual file limit reached.');
    const size=Object.values(s.files).reduce((n,f)=>n+f.content.length,0)-(existing?.content.length||0)+content.length;
    if(size>1048576) fail('Virtual storage limit reached.');
    const latest=Math.max(Date.parse('2026-10-28T00:15:00.000Z'),...Object.values(s.files).map(f=>Date.parse(f.lastWriteTime||seedTime(f.path))));
    s.files[path.toLowerCase()]={path:existing?.path||path,dir,content,lastWriteTime:new Date(latest+60000).toISOString()}; return get(s,path);
  }
  function createSession(config={}) {
    const scenario=config.scenario||'base'; if(!scenarios.includes(scenario)) fail('Unknown scenario.');
    const s={cwd:'C:\\Users\\student',files:{},history:[],scenario,variables:{},pc:Network.createState(scenario)};
    for(const path of ['C:\\','D:\\','C:\\Lab','C:\\Lab\\Logs','C:\\Lab\\Reports','C:\\Lab\\Shared Files','C:\\Lab\\Archive','C:\\Users\\student\\Documents','C:\\Users\\student\\AppData\\Local\\Temp','D:\\Support']) {ensureParents(s,path);s.files[path.toLowerCase()]={path,dir:true,content:''};}
    const files=[['C:\\Lab\\readme.txt','PowerShell practice lab.\nRead, filter, and verify.\n'],['C:\\Lab\\Shared Files\\guide.txt','Quote paths containing spaces.\nUse -LiteralPath for exact names.\n'],['C:\\Lab\\Logs\\app.log','09:00 INFO App started\n09:05 ERROR Print service unavailable\n09:08 ERROR Job failed\n09:10 INFO Retry scheduled\n'],['C:\\Lab\\notes.txt','Ticket 1042\nInvestigate before changing settings.\n'],['C:\\Lab\\devices.csv','Name,Department,FreeGB\nPC-014,Sales,8\nPC-021,Support,42\nPC-032,Sales,5\n'],['C:\\Lab\\settings.json','{"Name":"PC-014","Department":"Sales","FreeGB":8}'],['C:\\Lab\\Logs\\archive.log','Archived log.\n'.repeat(100)]];
    for(const [path,content] of files) write(s,path,content);
    for(const f of Object.values(s.files))f.lastWriteTime=seedTime(f.path);
    if(config.files!==undefined) {
      if(!Array.isArray(config.files)||config.files.length>100) fail('Invalid seed files.');
      for(const f of config.files) {const p=resolve(s,f.path);ensureParents(s,p);write(s,p,f.content||'',f.dir===true);}
    }
    if(config.cwd) {const f=get(s,resolve(s,config.cwd));if(!f?.dir)fail('Invalid initial directory.');s.cwd=f.path;}
    return s;
  }
  function splitPipeline(line) {
    const out=[];let start=0,quote='',depth=0,escape=false;
    for(let i=0;i<line.length;i++) {
      const c=line[i];
      if(escape){escape=false;continue;}
      if(c==='`'&&quote!=="'"){escape=true;continue;}
      if(quote){if(c===quote){if(line[i+1]===quote){i++;continue;}quote='';}continue;}
      if(c==='"'||c==="'"){quote=c;continue;}
      if(c==='{'){depth++;continue;} if(c==='}'){if(--depth<0)fail('Unexpected closing brace.');continue;}
      if(!depth&&c==='|'){out.push(line.slice(start,i).trim());start=i+1;}
      if(!depth&&/[;&<]/.test(c))unsupported('Command chaining, loops, and input/error redirection are not implemented. Run one command or pipeline at a time.');
    }
    if(quote||depth||escape)fail('Unclosed quote, script block, or escape character.');
    out.push(line.slice(start).trim());if(out.some(x=>!x))fail('A command is required on each side of a pipe.');
    if(out.length>16)fail('Pipelines are limited to 16 stages.');return out;
  }
  function interpolate(session,text,index) {
    if(text[index+1]==='(')unsupported('Subexpression interpolation $(...) is not implemented. Store a scalar value in a variable first.');
    let name,end;
    if(text[index+1]==='{') {
      end=text.indexOf('}',index+2);if(end<0)fail('Unclosed braced variable.');
      const raw=text.slice(index+2,end);
      if(!/^(?:env:)?[A-Za-z_][\w]*$/i.test(raw))unsupported('Use ${name} or ${env:NAME} for a simple variable.');
      name='$'+raw;
    } else {
      const match=text.slice(index).match(/^\$(?:env:[A-Za-z_][\w]*|[A-Za-z_][\w]*)/i);
      if(!match)return {value:'$',end:index};name=match[0];end=index+name.length-1;
    }
    if(!session)unsupported('Variable expansion is not available in this context.');
    const stream=expressionValue(session,name);
    if(stream.items.some(x=>x!==null&&typeof x==='object'))unsupported('Only scalar values can be expanded inside a string. Select a property into a variable first.');
    return {value:stream.items.map(scalar).join(' '),end};
  }
  function tokenize(text,session) {
    const tokens=[];let word='',started=false,quoted=false,quote='',depth=0;
    const flush=()=>{if(started){tokens.push({text:word,quoted});word='';started=false;quoted=false;}};
    for(let i=0;i<text.length;i++) {
      const c=text[i];
      if(depth){word+=c;if(quote){if(c===quote){if(text[i+1]===quote){word+=text[++i];}else quote='';}}else if(c==='"'||c==="'")quote=c;else if(c==='{')depth++;else if(c==='}')depth--;continue;}
      if(quote){if(c===quote){if(text[i+1]===quote){word+=text[++i];}else quote='';}else if(c==='`'&&quote==='"'){const next=text[++i];word+=({n:'\n',r:'\r',t:'\t'}[next]??next);}else if(c==='$'&&quote==='"'){const expanded=interpolate(session,text,i);word+=expanded.value;i=expanded.end;if(word.length>MAX_FILE)fail('Expanded string is too large.');}else word+=c;continue;}
      if(c==='"'||c==="'"){quote=c;started=true;quoted=true;continue;}
      if(c==='{'){if(started)fail('Separate a script block from the preceding argument.');depth=1;word=c;started=true;continue;}
      if(c==='`'){const next=text[++i];if(next===undefined)fail('Incomplete escape.');word+=next;started=true;continue;}
      if(/\s/.test(c)){flush();continue;}
      if(c==='>'){flush();tokens.push({text:text[i+1]==='>'?(i++,'>>'):'>',quoted:false});continue;}
      word+=c;started=true;
    }
    if(quote||depth)fail('Unclosed quote or script block.');flush();return tokens;
  }
  function parameterKey(token,names) {
    const key=token.slice(1).toLowerCase();if(names.includes(key))return key;
    const candidates=names.filter(name=>name.startsWith(key));
    if(candidates.length>1)fail('Ambiguous parameter '+token+'. Possible matches: '+candidates.map(name=>'-'+name).join(', ')+'.');
    return candidates[0]||key;
  }
  function parseParams(args,values=[],flags=[],posNames=[]) {
    const valueSet=new Set(values.map(x=>x.toLowerCase())),flagSet=new Set(flags.map(x=>x.toLowerCase()));
    const p={};let pos=0;
    for(let i=0;i<args.length;i++) {
      const a=args[i];
      if(/^-[A-Za-z]/.test(a)) {
        const k=parameterKey(a,[...valueSet,...flagSet]);if(valueSet.has(k)||flagSet.has(k))args[i]='-'+k;if(own(p,k))fail('A parameter was specified more than once: '+a);
        if(flagSet.has(k))p[k]=true;
        else if(valueSet.has(k)){if(i+1>=args.length||/^-[A-Za-z]/.test(args[i+1]))fail('Missing value for '+a);p[k]=args[++i];}
        else unsupported('Unsupported parameter '+a+'. See Get-Help for the implemented syntax.');
      } else {
        while(pos<posNames.length&&own(p,posNames[pos]))pos++;
        if(pos>=posNames.length)fail("A positional parameter cannot be found that accepts argument '"+a+"'.");
        p[posNames[pos++]]=a;
      }
    }
    return p;
  }
  function requireParam(p,key) {if(p[key]===undefined||p[key]==='')fail('Missing required parameter -'+key);return p[key];}
  function integer(value,min=0,max=10000){if(!/^\d+$/.test(String(value))||+value<min||+value>max)fail('Expected a whole number from '+min+' to '+max+'.');return +value;}
  function wildcard(pattern) {return new RegExp('^'+String(pattern).replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*').replace(/\?/g,'.')+'$','i');}
  function columns(value){const cols=String(value).split(',').map(x=>x.trim());if(cols.some(x=>!x))fail('Supply a property name before and after each comma.');cols.forEach(safeKey);return cols;}
  // Spaces around property-list commas are optional in PowerShell. Join only
  // the -Property value (or its positional equivalent), never arbitrary text.
  function propertyListArgs(args) {
    for(let i=0;i<args.length;i++)if(/^-[A-Za-z]/.test(args[i])){const key=parameterKey(args[i],['property','first','last','expandproperty','autosize']);if(['property','first','last','expandproperty','autosize'].includes(key))args[i]='-'+key;}
    const joined=[];let positional=true;
    function consume(start){let value=args[start],end=start;if(value===undefined)return {value,end};while(value.endsWith(',')||args[end+1]?.startsWith(',')){if(end+1>=args.length||/^-[A-Za-z]/.test(args[end+1]))fail('Supply a property name after the comma.');value+=args[++end];}return {value,end};}
    for(let i=0;i<args.length;i++) {
      const token=args[i],key=token.toLowerCase();
      if(key==='-property'){joined.push(token);const list=consume(i+1);if(list.value!==undefined)joined.push(list.value);i=list.end;positional=false;}
      else if(key==='-first'||key==='-last'||key==='-expandproperty'){joined.push(token);if(i+1<args.length)joined.push(args[++i]);}
      else if(!token.startsWith('-')&&positional){const list=consume(i);joined.push(list.value);i=list.end;positional=false;}
      else joined.push(token);
    }
    args.splice(0,args.length,...joined);return args;
  }
  function expressionValue(s,text) {
    const input=text.trim();
    if(/^\$env:/i.test(input)){const key=input.slice(5).toLowerCase();const env={computername:'PC-014',userprofile:'C:\\Users\\student',temp:'C:\\Users\\student\\AppData\\Local\\Temp',username:'student'};if(!own(env,key))unsupported('Unknown environment variable.');return result([env[key]],'System.String');}
    if(/^\$PSVersionTable(?:\.\w+)?$/i.test(input)){const table={PSVersion:'7.5.0',PSEdition:'Core',OS:'Microsoft Windows 11',Platform:'Win32NT'};const prop=input.split('.')[1];return prop?result([property(table,prop)],'System.String'):result([table],'System.Collections.Hashtable');}
    if(/^\$(true|false)$/i.test(input))return result([input.toLowerCase()==='$true'],'System.Boolean');
    const m=input.match(/^\$([A-Za-z][\w]*)(?:\.([A-Za-z][\w]*))?$/);if(m){const key=m[1].toLowerCase();safeKey(key);if(!own(s.variables,key))fail('Variable is not defined: $'+m[1]);const val=clone(s.variables[key]);if(m[2]){if(/^(count|length)$/i.test(m[2])&&val.items.length!==1)return result([val.items.length],'System.Int32');return result(val.items.map(x=>property(x,m[2])),'System.Object');}return val;}
    if(/^-?\d+(?:\.\d+)?(?:KB|MB|GB)?$/i.test(input)){const m=input.match(/^(-?\d+(?:\.\d+)?)(KB|MB|GB)?$/i);return result([+m[1]*({KB:1024,MB:1048576,GB:1073741824}[m[2]?.toUpperCase()]||1)],'System.Double');}
    unsupported('Only simple variable/property references are implemented here.');
  }
  function literal(text,session) {
    const t=text.trim();if((t.startsWith("'")&&t.endsWith("'"))||(t.startsWith('"')&&t.endsWith('"')))return tokenize(t,session)[0].text;
    if(/^\$(true|false)$/i.test(t))return /^\$true$/i.test(t);
    const n=t.match(/^(-?\d+(?:\.\d+)?)(KB|MB|GB)?$/i);if(n)return +n[1]*({KB:1024,MB:1048576,GB:1073741824}[n[2]?.toUpperCase()]||1);
    if(/^[\w .:\\/-]+$/.test(t))return t;
    unsupported('Use one literal value in this condition.');
  }
  function condition(args,session) {
    let prop,op,value,cast=false;
    if(args[0]&&/^-[A-Za-z]/.test(args[0])&&parameterKey(args[0],['property'])==='property')args[0]='-property';
    const propertyArgument=args[args[0]==='-property'?1:0];
    if(propertyArgument?.startsWith('$_.'))fail('Where-Object received $_.Property without a script block. Use Where-Object { $_.Status -eq Stopped } or Where-Object Status -eq Stopped.');
    if(args.length===1&&args[0].startsWith('{')){const m=args[0].match(/^\{\s*(\[int\]|\[double\])?\s*\$_\.([A-Za-z][\w]*)\s+-(eq|ne|gt|ge|lt|le|like)\s+(.+?)\s*\}$/i);if(!m)unsupported('Where-Object supports { $_.Property -operator value }, optionally [int] or [double].');[,cast,prop,op,value]=m;value=literal(value,session);}
    else {const a=args[0]?.toLowerCase()==='-property'?args.slice(1):args;if(a.length!==3||!/^-(eq|ne|gt|ge|lt|le|like)$/i.test(a[1]))unsupported('Use Where-Object Property -eq value or a simple script block.');[prop,op,value]=a;op=op.slice(1);value=literal(value,session);}
    safeKey(prop);
    return obj=>{let left=property(obj,prop),right=value;if(cast){left=Number(left);if(!Number.isFinite(left))fail('Cannot convert the selected value to a number.');}else if(typeof left==='string')right=String(right);else if(typeof left==='number')right=Number(right);
      if(typeof left==='string'&&typeof right==='string'){left=left.toLowerCase();right=right.toLowerCase();}
      switch(op.toLowerCase()){case'eq':return left===right;case'ne':return left!==right;case'gt':return left>right;case'ge':return left>=right;case'lt':return left<right;case'le':return left<=right;case'like':return wildcard(right).test(scalar(left));default:return false;}};
  }
  function csvParse(text) {
    const rows=[];let row=[],field='',quote=false,closed=false;
    for(let i=0;i<text.length;i++){const c=text[i];if(quote){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quote=false;closed=true;}}else field+=c;}else if(c==='"'){if(field||closed)fail('Invalid CSV quoting.');quote=true;}else if(c===','){row.push(field);field='';closed=false;}else if(c==='\r'||c==='\n'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(x=>x!==''))rows.push(row);row=[];field='';closed=false;}else{if(closed)fail('Invalid CSV after closing quote.');field+=c;}}
    if(quote)fail('Unclosed CSV quote.');if(field||row.length){row.push(field);rows.push(row);}if(!rows.length)return [];
    const headers=rows.shift();if(new Set(headers.map(x=>x.toLowerCase())).size!==headers.length||headers.some(x=>!x))fail('CSV needs distinct nonempty headers.');headers.forEach(safeKey);
    return rows.map(row=>{if(row.length!==headers.length)fail('CSV row has the wrong number of fields.');return Object.fromEntries(headers.map((h,i)=>[h,row[i]]));});
  }
  function safeData(value,depth=0){if(depth>12)fail('Data is nested too deeply.');if(value===null||typeof value==='boolean'||typeof value==='number')return;if(typeof value==='string'){if(value.length>MAX_OUTPUT)fail('Data string is too large.');return;}if(Array.isArray(value)){if(value.length>2000)fail('Too many data items.');value.forEach(v=>safeData(v,depth+1));return;}if(!plain(value))fail('Invalid data value.');if(Object.keys(value).length>256)fail('Too many properties.');for(const [k,v]of Object.entries(value)){safeKey(k);safeData(v,depth+1);}}
  function execute(s,name,args,stream,paths,options) {
    const pathOf=value=>{const p=resolve(s,value);paths.push(p);return p;};
    const pathParams=p=>{if(p.path!==undefined&&p.literalpath!==undefined)fail('Use either -Path or -LiteralPath.');return p.literalpath??p.path;};
    const pathFile=p=>{const path=pathOf(p),f=get(s,path);if(!f)fail('Cannot find path: '+path);return f;};
    const textFile=p=>{const f=pathFile(p);if(f.dir)fail('The path is a directory, not a text file.');return f;};
    const whatIf=(p,operation,path)=>{
      const actions={'remove-item':'Remove File','copy-item':'Copy File','move-item':'Move File','rename-item':'Rename File',
        'new-item':/^directory$/i.test(p.itemtype)?'Create Directory':'Create File','set-content':'Set Content','add-content':'Add Content',
        'out-file':'Output to File','export-csv':'Export-Csv'};
      return p.whatif?result([],'System.Object',{output:'What if: Performing the operation "'+(actions[operation]||operation)+'" on target "'+path+'".'}):null;
    };
    const encoding=p=>{if(p.encoding&&!/^utf8(?:nobom|bom)?$/i.test(p.encoding))unsupported('This simulator supports UTF-8 text only.');};
    if(name==='get-location'){parseParams(args);return result([{Path:s.cwd}],'System.Management.Automation.PathInfo');}
    if(name==='set-location'){const p=parseParams(args,['path','literalpath'],[],['path']);const f=pathFile(requireParam({path:pathParams(p)},'path'));if(!f.dir)fail('The path is not a directory.');s.cwd=f.path;return result([],'System.Object',{effects:['cwd:'+f.path]});}
    if(name==='clear-host'){parseParams(args);return result([],'System.Object',{effects:['clear']});}
    if(name==='get-command'){const p=parseParams(args,['name'],[],['name']);const matcher=wildcard(p.name||'*');return result(allReferences().filter(x=>matcher.test(x.name)).map(x=>({CommandType:'Cmdlet',Name:x.name,Source:'PowerShell / Windows'})),'System.Management.Automation.CmdletInfo');}
    if(name==='get-help'){const p=parseParams(args,['name'],['examples','full'],['name']);if(!p.name)return result([], 'System.String',{output:options.language==='en'?'Use Get-Command to find commands. Get-Help <command> shows the supported syntax.':'Get-Command で一覧を、Get-Help コマンド名 で対応する書式を確認できます。'});const r=allReferences().find(x=>x.name.toLowerCase()===canonical(p.name));if(!r)fail('No supported help topic: '+p.name);const examples={'get-process':'Get-Process -Name NotesApp\n    Get-Process | Sort-Object CPU -Descending','get-service':'Get-Service -Name Spooler','get-childitem':'Get-ChildItem -Path C:\\Lab -File','get-content':'Get-Content -Path C:\\Lab\\readme.txt','set-location':'Set-Location -Path C:\\Lab','select-object':'Get-Process | Select-Object ProcessName,CPU','where-object':'Get-Process | Where-Object { $_.CPU -gt 10 }','export-csv':'Get-Process | Select-Object ProcessName,CPU | Export-Csv C:\\Lab\\Reports\\processes.csv -NoTypeInformation'};let example=examples[r.name.toLowerCase()];if(p.examples&&!example)unsupported('Examples for this command are not included; use Get-Help without -Examples for syntax.');return result([], 'System.String',{output:`NAME\n    ${r.name}\nSYNOPSIS\n    ${options.language==='en'?r.summaryEn:r.summaryJa}\nSYNTAX\n    ${r.syntax}${(p.examples||p.full)&&example?'\nEXAMPLES\n    '+example:''}\n\n[Simulator] This is the supported subset; additional real PowerShell parameters may exist.`});}
    if(name==='get-alias'){const p=parseParams(args,['name'],[],['name']);const entries=Object.entries(aliases).filter(([k])=>wildcard(p.name||'*').test(k));if(!entries.length)fail('Alias not found.');return result(entries.map(([Name,Definition])=>({CommandType:'Alias',Name,Definition})),'System.Management.Automation.AliasInfo');}
    if(name==='get-childitem'){
      const p=parseParams(args,['path','literalpath','filter'],['file','directory','recurse','force'],['path']);if(p.file&&p.directory)fail('Use -File or -Directory, not both.');let raw=pathParams(p)??s.cwd,mask=null;
      if(p.literalpath===undefined&&/[*?]/.test(raw)){raw=raw.replace(/[\/¥￥]/g,'\\');const i=raw.lastIndexOf('\\');mask=raw.slice(i+1);raw=i<0?s.cwd:raw.slice(0,i)||'\\';}
      const f=pathFile(raw);let found=f.dir?Object.values(s.files).filter(x=>x.path.toLowerCase()!==f.path.toLowerCase()&&x.path.toLowerCase().startsWith(f.path.toLowerCase().replace(/\\$/,'')+'\\')&&(p.recurse||parentPath(x.path).toLowerCase()===f.path.toLowerCase())):[f];
      if(mask)found=found.filter(x=>wildcard(mask).test(basename(x.path)));if(p.filter)found=found.filter(x=>wildcard(p.filter).test(basename(x.path)));if(p.file)found=found.filter(x=>!x.dir);if(p.directory)found=found.filter(x=>x.dir);
      found.sort((a,b)=>a.path.localeCompare(b.path));return result(found.map(fileObject),found.every(x=>!x.dir)?'System.IO.FileInfo':'System.IO.FileSystemInfo');
    }
    if(name==='get-item'||name==='test-path'){const p=parseParams(args,['path','literalpath'],[],['path']);const path=pathOf(requireParam({path:pathParams(p)},'path')),f=get(s,path);if(name==='test-path')return result([!!f],'System.Boolean');if(!f)fail('Cannot find path: '+path);return result([fileObject(f)],f.dir?'System.IO.DirectoryInfo':'System.IO.FileInfo');}
    if(name==='get-content'){const p=parseParams(args,['path','literalpath','tail','totalcount'],['raw'],['path']);if([p.raw,p.tail!==undefined,p.totalcount!==undefined].filter(Boolean).length>1)fail('Use only one of -Raw, -Tail or -TotalCount.');const f=textFile(requireParam({path:pathParams(p)},'path'));if(p.raw)return result([f.content],'System.String');let rows=f.content.replace(/\r\n/g,'\n').split('\n');if(rows.at(-1)==='')rows.pop();if(p.tail!==undefined){const n=integer(p.tail);rows=n?rows.slice(-n):[];}if(p.totalcount!==undefined)rows=rows.slice(0,integer(p.totalcount));return result(rows,'System.String');}
    if(name==='set-content'||name==='add-content'){const p=parseParams(args,['path','literalpath','value','encoding'],['whatif'],['path','value']);encoding(p);const path=pathOf(requireParam({path:pathParams(p)},'path'));const content=p.value!==undefined?p.value:stream.items.length?stream.items.map(scalar).join('\n'):requireParam(p,'value');const old=get(s,path);if(old?.dir)fail('Cannot write text to a directory.');const preview=whatIf(p,name,path);if(preview)return preview;write(s,path,(name==='add-content'?(old?.content||''):'')+content+'\n');return result([],'System.Object',{effects:[name+':'+path]});}
    if(name==='new-item'){const p=parseParams(args,['path','itemtype','value'],['whatif'],['path']);const path=pathOf(requireParam(p,'path')),kind=requireParam(p,'itemtype');if(!/^(file|directory)$/i.test(kind))unsupported('Use -ItemType File or Directory.');if(get(s,path))fail('An item already exists at this path.');const preview=whatIf(p,name,path);if(preview)return preview;const f=write(s,path,p.value||'',/^directory$/i.test(kind));return result([fileObject(f)],f.dir?'System.IO.DirectoryInfo':'System.IO.FileInfo',{effects:[name+':'+path]});}
    if(name==='copy-item'||name==='move-item'||name==='rename-item'){
      const destKey=name==='rename-item'?'newname':'destination';const p=parseParams(args,['path','literalpath',destKey],['whatif'],['path',destKey]);const source=textFile(requireParam({path:pathParams(p)},'path'));let dest=requireParam(p,destKey);
      if(name==='rename-item'){if(/[\\/¥￥:]/.test(dest)||dest==='.'||dest==='..')fail('Rename-Item changes a name in the same directory. Use Move-Item to change directories.');dest=parentPath(source.path)+'\\'+dest;}
      let target=pathOf(dest);if(get(s,target)?.dir){if(name==='rename-item')fail('An item with that name already exists.');target=pathOf(target+'\\'+basename(source.path));}
      if(target.toLowerCase()===source.path.toLowerCase())fail('Source and destination are the same.');if(get(s,target))fail('The destination already exists.');
      const preview=whatIf(p,name,source.path+' -> '+target);if(preview)return preview;write(s,target,source.content).lastWriteTime=source.lastWriteTime||seedTime(source.path);if(name!=='copy-item')delete s.files[source.path.toLowerCase()];return result([],'System.Object',{effects:[name+':'+source.path+' -> '+target]});
    }
    if(name==='remove-item'){const p=parseParams(args,['path','literalpath'],['whatif'],['path']);const f=textFile(requireParam({path:pathParams(p)},'path'));const preview=whatIf(p,name,f.path);if(preview)return preview;delete s.files[f.path.toLowerCase()];return result([],'System.Object',{effects:['remove-item:'+f.path]});}
    if(name==='write-output'){if(!args.length)return result([],'System.String');if(args.some(a=>/^-[A-Za-z]/.test(a)))unsupported('Write-Output parameters are not implemented.');return result(args,'System.String');}
    if(name==='get-member'){
      parseParams(args);if(!stream.items.length)fail('Supply an object through the pipeline to Get-Member.');
      const first=stream.items[0],process=stream.type==='System.Diagnostics.Process';
      const props=plain(first)?Object.keys(first):typeof first==='string'?['Length']:[];
      const items=props.map(Name=>{
        const alias=process && {Name:'ProcessName',Handles:'HandleCount',SI:'SessionId',WS:'WorkingSet64'}[Name];
        if(alias)return {Name,MemberType:'AliasProperty',Definition:Name+' = '+alias};
        if(process && Name==='CPU')return {Name,MemberType:'ScriptProperty',Definition:'System.Object CPU {get=$this.TotalProcessorTime.TotalSeconds;}'};
        if(process && Name==='Path')return {Name,MemberType:'ScriptProperty',Definition:'System.Object Path {get=$this.MainModule.FileName;}'};
        const v=property(first,Name);
        const type=(process && Name==='StartTime')||Name==='LastWriteTime'?'datetime':typeof v==='string'?'string':typeof v==='boolean'?'bool':typeof v==='number'?(/^(CPU|Average)$/i.test(Name)?'double':/^(Length|WorkingSet64)$/i.test(Name)?'long':'int'):Array.isArray(v)?'System.Object[]':'System.Object';
        return {Name,MemberType:'Property',Definition:type+' '+Name+' {get;}'};
      });
      if(process)for(const [Name,Definition]of [['GetType','type GetType()'],['Refresh','void Refresh()'],['ToString','string ToString()']])items.push({Name,MemberType:'Method',Definition});
      items.sort((a,b)=>a.MemberType.localeCompare(b.MemberType)||a.Name.localeCompare(b.Name));
      return result(items,'Microsoft.PowerShell.Commands.MemberDefinition',{output:'TypeName: '+stream.type+'\n\n'+format({items})});
    }
    if(name==='where-object')return result(stream.items.filter(condition(args,s)),stream.type);
    if(name==='select-object'){
      const p=parseParams(propertyListArgs(args),['property','first','last','expandproperty'],[],['property']);if(p.property&&p.expandproperty)fail('Use -Property or -ExpandProperty.');let items=stream.items;
      if(p.first!==undefined||p.last!==undefined){const first=p.first===undefined?0:integer(p.first),last=p.last===undefined?0:integer(p.last);items=items.filter((_,i)=>i<first||i>=items.length-last);}
      if(p.expandproperty){safeKey(p.expandproperty);const out=items.flatMap(x=>{const v=property(x,p.expandproperty);if(v===undefined)fail('Property not found: '+p.expandproperty);return Array.isArray(v)?v:[v];});return result(out,out.every(x=>typeof x==='string')?'System.String':'System.Object');}
      if(p.property){const cols=columns(p.property);items=items.map(x=>Object.fromEntries(cols.map(k=>[k,property(x,k)??null])));return result(items,'Selected.'+stream.type);}return result(items,stream.type);
    }
    if(name==='sort-object'){if(args.some(x=>x.includes(',')))unsupported('Sort-Object supports one property in this simulator; multiple sort keys are not implemented.');const p=parseParams(args,['property'],['descending'],['property']);const prop=requireParam(p,'property');safeKey(prop);const items=[...stream.items].sort((a,b)=>{const av=property(a,prop),bv=property(b,prop);let n=typeof av==='number'&&typeof bv==='number'?av-bv:String(av??'').toLowerCase().localeCompare(String(bv??'').toLowerCase());return p.descending?-n:n;});return result(items,stream.type);}
    if(name==='measure-object'){const p=parseParams(args,['property'],['sum','average'],['property']);if((p.sum||p.average)&&!p.property)fail('Specify -Property for a numeric aggregate.');const row={Count:stream.items.length};if(p.property){safeKey(p.property);row.Property=p.property;const raw=stream.items.map(x=>property(x,p.property)).filter(value=>value!==undefined);row.Count=raw.length;if(p.sum||p.average){const values=raw.map(Number);if(values.some(v=>!Number.isFinite(v)))fail('The selected property is not numeric.');const sum=values.reduce((a,b)=>a+b,0);if(p.sum)row.Sum=sum;if(p.average)row.Average=values.length?sum/values.length:null;}}return result([row],'Microsoft.PowerShell.Commands.GenericMeasureInfo');}
    if(name==='group-object'){if(args.some(x=>x.includes(',')))unsupported('Group-Object supports one property in this simulator; multiple group keys are not implemented.');const p=parseParams(args,['property'],[],['property']);const prop=requireParam(p,'property');safeKey(prop);const groups=new Map();for(const item of stream.items){const value=scalar(property(item,prop)),key=value.toLowerCase();if(!groups.has(key))groups.set(key,{Count:0,Name:value,Group:[]});const g=groups.get(key);g.Count++;g.Group.push(item);}return result([...groups.values()],'Microsoft.PowerShell.Commands.GroupInfo');}
    if(name==='foreach-object'){if(args.length!==1)unsupported('ForEach-Object supports one simple property script block.');const m=args[0].match(/^\{\s*\$_\.([A-Za-z][\w]*)\s*\}$/);if(!m)unsupported('This lesson supports ForEach-Object { $_.Name }. General scripts and loops are not implemented.');safeKey(m[1]);return result(stream.items.map(x=>property(x,m[1])??null),'System.Object');}
    if(name==='format-table'||name==='format-list'){const p=parseParams(propertyListArgs(args),['property'],name==='format-table'?['autosize']:[],['property']);const cols=p.property?columns(p.property):undefined;return result([{Text:format(stream,name==='format-list'?'list':'table',cols)}],'PSR.FormatData');}
    if(name==='out-file'||name==='export-csv'){
      const p=parseParams(args,['path','literalpath','filepath','encoding'],['append','notypeinformation','whatif'],[name==='out-file'?'filepath':'path']);encoding(p);const path=pathOf(requireParam({path:p.filepath??pathParams(p)},'path'));let text;
      if(name==='export-csv'){if(stream.type==='PSR.FormatData')unsupported('Format-* emits display instructions, not the original objects. Use Select-Object before Export-Csv.');if(!stream.items.every(plain))unsupported('Export-Csv in this simulator requires objects with named properties.');if(p.append)unsupported('CSV append is not implemented.');const cols=stream.items.length?Object.keys(stream.items[0]):[];const quote=x=>'"'+scalar(x).replace(/"/g,'""')+'"';text=cols.length?[cols.map(quote).join(','),...stream.items.map(x=>cols.map(k=>quote(property(x,k))).join(','))].join('\n')+'\n':'';}
      else text=format(stream)+'\n';
      const preview=whatIf(p,name,path);if(preview)return preview;write(s,path,(p.append?(get(s,path)?.content||''):'')+text);return result([],'System.Object',{effects:[name+':'+path]});
    }
    if(name==='import-csv'){const p=parseParams(args,['path','literalpath'],[],['path']);return result(csvParse(textFile(requireParam({path:pathParams(p)},'path')).content),'System.Management.Automation.PSCustomObject');}
    if(name==='convertto-json'){const p=parseParams(args,['depth']);if(p.depth!==undefined)integer(p.depth,1,10);const value=stream.items.length===1?stream.items[0]:stream.items;safeData(value);return result([JSON.stringify(value,null,2)],'System.String');}
    if(name==='convertfrom-json'){parseParams(args);const value=JSON.parse(stream.items.map(scalar).join('\n'));safeData(value);return result(Array.isArray(value)?value:[value],'System.Management.Automation.PSCustomObject');}
    if(name==='select-string'){const p=parseParams(args,['path','literalpath','pattern'],['simplematch'],['pattern','path']);const pattern=requireParam(p,'pattern');if(!p.simplematch&&/[\[\]().*+?^$\\{}|]/.test(pattern))unsupported('Regular expressions are not implemented. Use -SimpleMatch for literal text.');let entries;if(pathParams(p)!==undefined){const f=textFile(pathParams(p));entries=f.content.split(/\r?\n/).map((Line,i)=>({LineNumber:i+1,Line,Path:f.path,Pattern:pattern}));}else entries=stream.items.map((x,i)=>({LineNumber:i+1,Line:scalar(x),Path:'InputStream',Pattern:pattern}));return result(entries.filter(x=>x.Line.toLowerCase().includes(pattern.toLowerCase())),'Microsoft.PowerShell.Commands.MatchInfo');}
    const net=Network.execute(name,args,stream,s,options);if(net)return {...result(),...net};
    unsupported('Command not implemented: '+name+'. Use Get-Command to see the supported commands.');
  }
  function checkWideSyntax(line,language) {
    let quote='',masked='';
    for(let i=0;i<line.length;i++){
      const c=line[i];
      if(c==='`'&&quote!=="'"){masked+='  ';i++;continue;}
      if(quote){if(c===quote){if(line[i+1]===quote){i++;masked+=' ';}else quote='';}masked+=' ';continue;}
      if(c==='"'||c==="'"){quote=c;masked+=' ';continue;}
      masked+=c;
    }
    let bad=masked.includes('｜')?'｜':masked.includes('　')?'　':null;
    if(!bad&&/(?:^|[\s|])[^\s|]*－/.test(masked)){
      // A full-width dash is suspicious in a command or parameter, not a filename.
      const token=masked.match(/(?:^|[\s|])([^\s|]*－[^\s|]*)/)?.[1]||'';
      if(token.startsWith('－')||/^\w+－\w+$/.test(token))bad='－';
    }
    if(!bad)for(const stage of masked.split(/[|]/)){
      if(/^\s*(?:(?:select-object|select|format-table|ft|format-list|fl|sort-object|sort|group-object|measure-object|measure)\b)/i.test(stage)&&/[、，]/.test(stage)){bad=stage.includes('、')?'、':'，';break;}
    }
    if(!bad)return;
    const replacement={'｜':'|','－':'-','、':',','，':',','　':'ASCII space (U+0020)'}[bad];
    fail(language==='en'?'Full-width syntax character '+JSON.stringify(bad)+' detected. Replace it with '+JSON.stringify(replacement)+'. Quote filenames or text that intentionally contain it.':'構文に全角文字 '+JSON.stringify(bad)+' が含まれています。半角の '+JSON.stringify(bad==='　'?'空白 (U+0020)':replacement)+' に置き換えてください。ファイル名や本文として使う場合は引用符で囲んでください。');
  }
  function explainError(message,language) {
    const english=language==='en';
    if(message.startsWith('A positional parameter cannot be found'))return message+'\n'+(english?'Spaces split arguments. Put a path or text containing spaces in quotes, for example "C:\\Lab\\Shared Files\\guide.txt" or "Ticket 1042".':'空白で引数が分かれています。空白を含むパスや本文を引用符で囲んでください。例: "C:\\Lab\\Shared Files\\guide.txt" / "Ticket 1042"');
    if(message.startsWith('Where-Object received'))return message+'\n'+(english?'Use braces around an expression containing $_, or omit $_. in the simplified form.':'$_ を使う式は { } で囲みます。簡易形式では $_. を付けずにプロパティ名を書きます。');
    if(message.startsWith('Ambiguous parameter'))return message+'\n'+(english?'Type more of the parameter name until only one candidate matches.':'候補が一つになるまでパラメーター名を長く入力してください。');
    const command=message.match(/Command not implemented: ([\w.-]+)\./)?.[1]?.replace(/\.exe$/i,'').toLowerCase();
    const replacements={ping:'Test-Connection intranet.corp.example',ipconfig:'Get-NetIPConfiguration',nslookup:'Resolve-DnsName intranet.corp.example',findstr:'Select-String -Path C:\\Lab\\Logs\\app.log -Pattern ERROR -SimpleMatch',mkdir:'New-Item -Path C:\\Lab\\Reports\\NewFolder -ItemType Directory',md:'New-Item -Path C:\\Lab\\Reports\\NewFolder -ItemType Directory',systeminfo:'Get-CimInstance Win32_OperatingSystem',wevtutil:'Get-WinEvent -LogName System -MaxEvents 3'};
    if(command&&replacements[command])return message+'\n'+(english?'In this simulator, use: ':'この教材では次の PowerShell コマンドを使います: ')+replacements[command];
    return message;
  }
  function run(session,line,options={}) {
    options={language:'ja',...options};const entry={line:String(line),stdout:'',stderr:'',code:0,trace:[],effects:[]};
    try{
      if(typeof line!=='string'||line.length>MAX_LINE)fail('Command line exceeds the 4,096 character limit.');if(!line.trim())return entry;
      checkWideSyntax(line,options.language);
      let source=line.trim(),assignment=null;const match=source.match(/^\$([A-Za-z][\w]*)\s*=\s*(.+)$/s);if(match){assignment=match[1].toLowerCase();safeKey(assignment);if(/^(env|psversiontable)$/i.test(assignment))fail('This built-in variable is read-only in the simulator.');source=match[2];}
      let stream=result();const stages=splitPipeline(source);
      for(let index=0;index<stages.length;index++){
        const command=stages[index],tokens=tokenize(command,session);let redir=null;const redirectIndex=tokens.findIndex(t=>!t.quoted&&(t.text==='>'||t.text==='>>'));
        if(redirectIndex>=0){if(index!==stages.length-1||redirectIndex!==tokens.length-2)unsupported('Place one output redirection and its path at the end of the pipeline.');redir={append:tokens[redirectIndex].text==='>>',path:tokens[redirectIndex+1].text};tokens.splice(redirectIndex);}
        if(!tokens.length)fail('A command is required.');
        if(redir){const target=resolve(session,redir.path),parent=get(session,parentPath(target));if(!parent?.dir||get(session,target)?.dir)fail('The redirection destination must be a file in an existing directory.');if(!get(session,target)&&Object.keys(session.files).length>=MAX_FILES)fail('Virtual file limit reached.');}
        const commandToken=tokens.shift(),name=canonical(commandToken.text),paths=[];
        let args=tokens.map(t=>{if(!t.quoted&&/^\$(?!_)/.test(t.text)){const val=expressionValue(session,t.text);if(val.items.length!==1||typeof val.items[0]==='object')unsupported('Only scalar variables are supported as command arguments.');return scalar(val.items[0]);}return t.text;});
        const trace={name,args,command,cwd:session.cwd,resolvedPaths:paths,input:format(stream).slice(0,MAX_OUTPUT),inputObjects:clone(stream.items),output:'',error:'',code:0,inputType:stream.type,inputCount:stream.items.length,outputType:'System.Object',outputCount:0,objects:[]};entry.trace.push(trace);
        let out;
        try{
          if(commandToken.quoted){if(args.length)fail('Unexpected argument after a string expression.');out=result([commandToken.text],'System.String');trace.name='write-output';trace.args=[commandToken.text];}
          else if(commandToken.text.startsWith('$')){if(args.length)fail('Unexpected argument after a variable expression.');out=expressionValue(session,commandToken.text);trace.name=commandToken.text.toLowerCase();}
          else out=execute(session,name,args,stream,paths,options);
          if(out.items.length>2000)fail('Pipeline exceeds the 2,000 object limit.');safeData(out.items);trace.outputType=out.type;trace.outputCount=out.items.length;trace.objects=clone(out.items);if(out.targetObjects!==undefined)trace.targetObjects=clone(out.targetObjects);trace.output=(out.output??format(out)).slice(0,MAX_OUTPUT);trace.error=out.error||'';trace.code=out.code||0;entry.effects.push(...(out.effects||[]));
          if(trace.code){entry.code=trace.code;entry.stderr=trace.error;break;}
          stream=out;
          if(redir){const target=resolve(session,redir.path);trace.redirectionPath=target;write(session,target,(redir.append?(get(session,target)?.content||''):'')+trace.output+'\n');entry.effects.push('redirect:'+target);stream=result();}
          entry.stdout=stream.output??format(stream);
        }catch(error){trace.error=error.message;trace.code=1;entry.stderr=error.message;entry.code=1;entry.stdout='';break;}
      }
      if(!entry.code&&assignment){if(!own(session.variables,assignment)&&Object.keys(session.variables).length>=50)fail('Variable limit reached.');if(JSON.stringify(stream.items).length>262144)fail('Variable is too large.');session.variables[assignment]={items:clone(stream.items),type:stream.type};entry.stdout='';entry.effects.push('variable:'+assignment);}
    }catch(error){entry.code=1;entry.stderr=error.message;entry.stdout='';}
    if(entry.stderr){entry.stderr=explainError(entry.stderr,options.language);for(const trace of entry.trace)if(trace.error)trace.error=explainError(trace.error,options.language);}
    entry.stdout=entry.stdout.slice(0,MAX_OUTPUT);entry.stderr=entry.stderr.slice(0,MAX_OUTPUT);session.history.push(entry);if(session.history.length>80)session.history.splice(0,session.history.length-80);return entry;
  }
  function listFiles(session){return Object.values(session.files);}
  function complete(session,input) {
    if(typeof input!=='string'||input.length>MAX_LINE)return [];
    if(!/\s/.test(input)){const prefix=input.toLowerCase();return [...new Set([...allReferences().map(r=>r.name),...Object.keys(aliases)])].filter(n=>n.toLowerCase().startsWith(prefix)).sort().map(n=>n+' ');}
    const m=input.match(/^(.*?)("[^"]*|'[^']*|[^\s]*)$/);if(!m)return [];const prefix=m[1],fragment=m[2].replace(/^["']/,'').replace(/["']$/,'');
    try{const full=resolve(session,fragment),items=Object.values(session.files).filter(f=>f.path.toLowerCase().startsWith(full.toLowerCase())).sort((a,b)=>a.path.localeCompare(b.path));return items.slice(0,30).map(f=>prefix+(/\s/.test(f.path)?'"'+f.path+'"':f.path));}catch{return [];}
  }
  function restoreSession(raw) {
    if(!plain(raw)||!scenarios.includes(raw.scenario)||!plain(raw.files)||!Array.isArray(raw.history)||!plain(raw.variables)||!plain(raw.pc))fail('Invalid session.');
    if(JSON.stringify(raw).length>10*1024*1024)fail('Session is too large.');safeData(raw.pc);safeData(raw.variables);
    const s=createSession({scenario:raw.scenario});s.files={};
    const entries=Object.entries(raw.files);if(entries.length>MAX_FILES)fail('Too many files.');let size=0;
    for(const [key,f]of entries){if(!plain(f)||typeof f.path!=='string'||typeof f.dir!=='boolean'||typeof f.content!=='string'||f.content.length>MAX_FILE||!/^([CD]):\\/.test(f.path)||resolve(s,f.path,false)!==f.path||key!==f.path.toLowerCase())fail('Invalid virtual file.');if(f.lastWriteTime!==undefined&&(typeof f.lastWriteTime!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(f.lastWriteTime)||!Number.isFinite(Date.parse(f.lastWriteTime))))fail('Invalid file timestamp.');size+=f.content.length;s.files[key]={path:f.path,dir:f.dir,content:f.dir?'':f.content,lastWriteTime:f.lastWriteTime||seedTime(f.path)};}
    if(size>1048576||!get(s,'C:\\')?.dir||!get(s,'D:\\')?.dir)fail('Invalid file tree.');for(const f of Object.values(s.files))if(!/^.[\\:]?\\$/.test(f.path)&&f.path.length>3&&!get(s,parentPath(f.path))?.dir)fail('Missing parent directory.');
    if(typeof raw.cwd!=='string'||!get(s,raw.cwd)?.dir)fail('Invalid current location.');s.cwd=get(s,raw.cwd).path;
    if(Object.keys(raw.variables).length>50)fail('Too many variables.');s.variables={};for(const [k,v]of Object.entries(raw.variables)){if(!/^[a-z][\w]*$/.test(k)||badKeys.has(k)||!plain(v)||!Array.isArray(v.items)||typeof v.type!=='string')fail('Invalid variable.');safeData(v.items);s.variables[k]=clone(v);if(v.type==='System.Diagnostics.Process')s.variables[k].items=s.variables[k].items.map(item=>plain(item)?Network.enrichProcess(item):item);}
    // Network state is restricted to the shape and value kinds seeded for this scenario.
    function checkShape(value,seed,depth=0){if(depth>8)fail('State too deep.');if(Array.isArray(seed)){if(!Array.isArray(value)||value.length>200)fail('Invalid state array.');if(seed.length)value.forEach(v=>checkShape(v,seed[0],depth+1));return;}if(plain(seed)){if(!plain(value)||Object.keys(value).some(k=>!own(seed,k)))fail('Invalid state fields.');for(const [k,v]of Object.entries(seed)){if(!own(value,k))fail('Missing state field.');checkShape(value[k],v,depth+1);}return;}if(typeof value!==typeof seed||typeof value==='number'&&!Number.isFinite(value)||typeof value==='string'&&value.length>4096)fail('Invalid state value.');}
    checkShape(raw.pc,s.pc);s.pc=clone(raw.pc);
    if(raw.history.length>80)fail('Too much history.');s.history=raw.history.map(h=>{if(!plain(h)||typeof h.line!=='string'||h.line.length>MAX_LINE||typeof h.stdout!=='string'||h.stdout.length>MAX_OUTPUT||typeof h.stderr!=='string'||h.stderr.length>MAX_OUTPUT||!Number.isInteger(h.code)||!Array.isArray(h.trace)||h.trace.length>16||!Array.isArray(h.effects)||h.effects.length>32)fail('Invalid history.');const copy=clone(h);for(const t of copy.trace){if(!plain(t)||typeof t.name!=='string'||t.name.length>64||!Array.isArray(t.args)||t.args.length>256||t.args.some(a=>typeof a!=='string'||a.length>MAX_LINE)||!Number.isInteger(t.code)||typeof t.command!=='string'||typeof t.input!=='string'||typeof t.output!=='string'||typeof t.error!=='string'||[t.input,t.output,t.error].some(x=>x.length>MAX_OUTPUT))fail('Invalid trace.');if(t.resolvedPaths!==undefined&&(!Array.isArray(t.resolvedPaths)||t.resolvedPaths.some(p=>typeof p!=='string'||!/^([CD]):\\/.test(p)||resolve(s,p,false)!==p)))fail('Invalid trace path.');if(t.objects!==undefined)safeData(t.objects);if(t.inputObjects!==undefined){if(!Array.isArray(t.inputObjects))fail('Invalid trace input.');safeData(t.inputObjects);}if(t.targetObjects!==undefined){if(!Array.isArray(t.targetObjects)||t.targetObjects.some(x=>!plain(x)||!Number.isInteger(x.Id)||x.Id<1||typeof x.ProcessName!=='string'))fail('Invalid trace targets.');safeData(t.targetObjects);}}return copy;});return s;
  }
  return {createSession,run,restoreSession,listFiles,complete,reference};
});
