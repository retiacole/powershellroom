(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PSRNetwork = api;
})(globalThis, function () {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const scenarios = ['base', 'service-stopped', 'dns-wrong', 'tcp-blocked', 'web-503', 'low-disk'];
  const records = { 'intranet.corp.example': '10.20.0.20', 'files.corp.example': '10.20.0.30', 'example.com': '93.184.216.34' };
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const success = (items = [], type = 'System.Object', extra = {}) => ({ items: clone(items), type, error: '', code: 0, effects: [], ...extra });
  const failure = message => ({ items: [], type: 'System.Object', error: message, code: 1, effects: [] });
  function unsupported(message) { throw new Error('[Simulator] ' + message); }
  function options(args, values = [], switches = [], positional) {
    const result = Object.create(null), valueSet = new Set(values), switchSet = new Set(switches);
    for (let i = 0; i < args.length; i++) {
      const token = args[i], name = token.toLowerCase().replace(/^-/, '');
      if (token.startsWith('-')) {
        if (!valueSet.has(name) && !switchSet.has(name)) unsupported('Unsupported parameter: ' + token + '. See Get-Help for the supported form.');
        if (own(result, name)) unsupported('Parameter specified more than once: ' + token);
        if (switchSet.has(name)) result[name] = true;
        else {
          const value = args[++i];
          if (value === undefined || value === '' || value.startsWith('-')) unsupported('A value is required after ' + token + '.');
          result[name] = value;
        }
      } else {
        if (!positional || own(result, positional)) unsupported('Unexpected argument: ' + token);
        result[positional] = token;
      }
    }
    return result;
  }
  function integer(value, min, max, parameter) {
    if (!/^\d+$/.test(String(value)) || Number(value) < min || Number(value) > max) unsupported(parameter + ' must be an integer from ' + min + ' to ' + max + '.');
    return Number(value);
  }
  function wildcard(value, pattern) {
    const escaped = String(pattern).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
    return new RegExp('^' + escaped + '$', 'i').test(value);
  }
  function createState(scenario = 'base') {
    return {
      processes: [
        { Id: 4320, ProcessName: 'NotesApp', CPU: 125, WorkingSet64: 314572800 },
        { Id: 2080, ProcessName: 'explorer', CPU: 8, WorkingSet64: 157286400 },
        { Id: 6040, ProcessName: 'pwsh', CPU: 2, WorkingSet64: 83886080 }
      ],
      services: [
        { Status: scenario === 'service-stopped' ? 'Stopped' : 'Running', Name: 'Spooler', DisplayName: 'Print Spooler', StartType: 'Automatic' },
        { Status: 'Running', Name: 'Dnscache', DisplayName: 'DNS Client', StartType: 'Automatic' },
        { Status: 'Stopped', Name: 'RemoteRegistry', DisplayName: 'Remote Registry', StartType: 'Disabled' }
      ]
    };
  }
  function addressFor(host, scenario, server) {
    const name = String(host).toLowerCase().replace(/\.$/, '');
    if (server && server !== '10.20.0.10') unsupported('Only DNS server 10.20.0.10 is available for explicit queries.');
    const numeric = [...Object.values(records), '10.20.0.1', '10.20.0.10', '10.20.0.14'].includes(name);
    if (numeric) return { name, address: name };
    if (!own(records, name)) unsupported('This destination is not registered in the practice environment: ' + host);
    if (scenario === 'dns-wrong' && !server) throw new Error('DNS name resolution failed: ' + host + '. DNS server 192.0.2.53 did not respond.');
    return { name, address: records[name] };
  }
  function dnsAddress(scenario) { return scenario === 'dns-wrong' ? '192.0.2.53' : '10.20.0.10'; }
  const ref = (name, syntax, summaryJa, summaryEn) => ({ name, syntax, summaryJa, summaryEn });
  const reference = [
    ref('Get-Process', 'Get-Process [[-Name] pattern]\nGet-Process -Id id', '実行中プロセスの名前・PID・累積 CPU 時間・メモリを取得。', 'Get process names, IDs, cumulative CPU time, and memory.'),
    ref('Stop-Process', 'Stop-Process [-Id] 4320 [-WhatIf]\nGet-Process -Id 4320 | Stop-Process [-WhatIf]', '演習用 NotesApp の停止。-WhatIf は操作の予告だけです。', 'Stop the practice NotesApp. -WhatIf previews without stopping it.'),
    ref('Get-Service', 'Get-Service [[-Name] pattern]', 'サービスの現在状態と起動設定を取得。', 'Read service state and startup settings.'),
    ...['Start-Service', 'Stop-Service', 'Restart-Service'].map(name => ref(name, name + ' [-Name] Spooler [-WhatIf]', '演習用 Spooler の状態変更。実機では権限と影響の確認が必要です。', 'Change the practice Spooler state. Real use requires permission and impact checks.')),
    ref('Get-CimInstance', 'Get-CimInstance [-ClassName] Win32_OperatingSystem|Win32_LogicalDisk|Win32_ComputerSystem', 'OS・ディスク容量・PC とドメインの情報を取得。', 'Read operating system, disk capacity, and computer/domain information.'),
    ref('Get-WinEvent', 'Get-WinEvent -LogName System [-MaxEvents count]', 'System ログを新しい順に取得。ログの時刻と現在状態を区別します。', 'Read System events newest first. Distinguish past events from current state.'),
    ref('Get-NetIPConfiguration', 'Get-NetIPConfiguration', 'IP アドレス・ゲートウェイ・DNS を取得。Windows の NetTCPIP を想定。', 'Read IP, gateway, and DNS configuration using the Windows NetTCPIP module.'),
    ref('Get-NetAdapter', 'Get-NetAdapter', '仮想 Ethernet アダプターの接続状態を取得。', 'Read the simulated Ethernet adapter state.'),
    ref('Get-DnsClientServerAddress', 'Get-DnsClientServerAddress', 'アダプターの DNS サーバー設定を取得。', 'Read adapter DNS server settings.'),
    ref('Resolve-DnsName', 'Resolve-DnsName [-Name] host [-Server 10.20.0.10]', '登録済みホストの IPv4 アドレスを照会。', 'Query the IPv4 address of a registered host.'),
    ref('Test-Connection', 'Test-Connection [-TargetName] host [-Count 1..10] [-Quiet]', 'ICMP による疎通。-Quiet は真偽値を返します。PowerShell 7 の書式です。', 'Check ICMP reachability. -Quiet returns a Boolean. Uses PowerShell 7 syntax.'),
    ref('Test-NetConnection', 'Test-NetConnection [-ComputerName] host [-Port 1..65535]', '指定 TCP ポートまたは ICMP の疎通を確認。アプリの正常動作は別の確認です。', 'Check a TCP port or ICMP reachability. Application health is a separate check.'),
    ref('Get-NetTCPConnection', 'Get-NetTCPConnection [-State Listen|Established]', '接続状態・ポート・所有プロセスを取得。', 'Read TCP state, ports, and owning process IDs.'),
    ref('Get-NetRoute', 'Get-NetRoute [-DestinationPrefix prefix]', '仮想 PC の経路を表示。', 'Read routes on the virtual PC.'),
    ref('Invoke-WebRequest', 'Invoke-WebRequest [-Uri] https://intranet.corp.example [-Method Get|Head] [-SkipHttpErrorCheck]', 'HTTP 応答の状態・ヘッダー・本文。503 は既定でエラーです。', 'Read HTTP status, headers, and content. A 503 is an error by default.'),
    ref('Invoke-RestMethod', 'Invoke-RestMethod [-Uri] https://intranet.corp.example/api/status [-SkipHttpErrorCheck]', 'JSON 応答をプロパティのあるオブジェクトとして取得。', 'Read a JSON response as an object with properties.')
  ];
  const names = new Set(reference.map(item => item.name.toLowerCase()));
  function execute(name, args, stream, session, executionOptions = {}) {
    name = String(name).toLowerCase();
    if (!names.has(name)) return null;
    try {
      if (!Array.isArray(args) || args.some(arg => typeof arg !== 'string')) unsupported('Arguments must be strings.');
      const pc = session.pc, scenario = session.scenario, incoming = stream?.items || [];
      if (name === 'get-process') {
        const p = options(args, ['name', 'id'], [], 'name');
        if (p.name && p.id) unsupported('Use either -Name or -Id.');
        const id = p.id === undefined ? null : integer(p.id, 1, 2147483647, '-Id');
        const found = pc.processes.filter(item => id !== null ? item.Id === id : p.name ? wildcard(item.ProcessName, p.name) : true);
        if (!found.length && (p.id || (p.name && !/[?*]/.test(p.name)))) return failure('Cannot find a process matching ' + (p.id || p.name) + '.');
        const details = {
          4320: { Path: 'C:\\Program Files\\NotesApp\\NotesApp.exe', StartTime: '2026-10-28T08:45:00+09:00', Responding: true },
          2080: { Path: 'C:\\Windows\\explorer.exe', StartTime: '2026-10-28T08:31:00+09:00', Responding: true },
          6040: { Path: 'C:\\Program Files\\PowerShell\\7\\pwsh.exe', StartTime: '2026-10-28T09:00:00+09:00', Responding: true }
        };
        // Derived properties keep existing saved PC-state snapshots compatible.
        return success(found.map(item => ({ ...item, ...details[item.Id] })), 'System.Diagnostics.Process');
      }
      if (name === 'stop-process') {
        const p = options(args, ['id'], ['whatif'], 'id');
        const ids = p.id === undefined ? incoming.map(item => item?.Id) : [integer(p.id, 1, 2147483647, '-Id')];
        if (!ids.length || ids.some(id => !Number.isInteger(id))) unsupported('Specify -Id 4320 or pipe a process object.');
        if (ids.some(id => id !== 4320)) unsupported('Only the practice NotesApp (PID 4320) can be stopped.');
        const target = pc.processes.find(item => item.Id === 4320);
        if (!target) return failure('Cannot find a process with the process identifier 4320.');
        if (p.whatif) return success([], 'System.Object', { output: 'What if: Performing the operation "Stop-Process" on target "NotesApp (4320)".' });
        pc.processes = pc.processes.filter(item => item.Id !== 4320);
        return success([], 'System.Object', { effects: ['process:4320:stopped'] });
      }
      if (name === 'get-service') {
        const p = options(args, ['name'], [], 'name');
        const found = pc.services.filter(item => !p.name || wildcard(item.Name, p.name));
        if (!found.length && p.name && !/[?*]/.test(p.name)) return failure('Cannot find any service with service name ' + p.name + '.');
        return success(found, 'System.ServiceProcess.ServiceController');
      }
      if (['start-service', 'stop-service', 'restart-service'].includes(name)) {
        const p = options(args, ['name'], ['whatif'], 'name');
        const targets = p.name === undefined ? incoming.map(item => item?.Name) : [p.name];
        if (!targets.length || targets.some(target => typeof target !== 'string')) unsupported('Specify -Name Spooler or pipe a service object.');
        if (targets.some(target => target.toLowerCase() !== 'spooler')) unsupported('Only the practice Spooler service can be changed.');
        if (p.whatif) return success([], 'System.Object', { output: 'What if: Performing the operation "' + reference.find(r => r.name.toLowerCase() === name).name + '" on target "Print Spooler (Spooler)".' });
        const target = pc.services.find(item => item.Name === 'Spooler');
        target.Status = name === 'stop-service' ? 'Stopped' : 'Running';
        return success([], 'System.Object', { effects: ['service:Spooler:' + target.Status] });
      }
      if (name === 'get-ciminstance') {
        const p = options(args, ['classname'], [], 'classname');
        if (!p.classname) unsupported('-ClassName is required.');
        const type = 'Microsoft.Management.Infrastructure.CimInstance#root/cimv2/' + p.classname;
        switch (p.classname.toLowerCase()) {
          case 'win32_operatingsystem': return success([{ Caption: 'Microsoft Windows 11 Pro', Version: '10.0.26100', BuildNumber: '26100', LastBootUpTime: '2026-10-28T08:30:00+09:00', TotalVisibleMemorySize: 16777216, FreePhysicalMemory: 6291456 }], type);
          case 'win32_logicaldisk': return success([{ DeviceID: 'C:', DriveType: 3, VolumeName: 'Windows', FreeSpace: (scenario === 'low-disk' ? 2 : 8) * 1073741824, Size: 256 * 1073741824 }, { DeviceID: 'D:', DriveType: 3, VolumeName: 'Support', FreeSpace: 60 * 1073741824, Size: 100 * 1073741824 }], type);
          case 'win32_computersystem': return success([{ Name: 'PC-014', Domain: 'corp.example', PartOfDomain: true, Manufacturer: 'Contoso', Model: 'Practice PC', TotalPhysicalMemory: 17179869184 }], type);
          default: unsupported('Only Win32_OperatingSystem, Win32_LogicalDisk, and Win32_ComputerSystem are implemented.');
        }
      }
      if (name === 'get-winevent') {
        const p = options(args, ['logname', 'maxevents']);
        if (String(p.logname).toLowerCase() !== 'system') unsupported('Use -LogName System. Other logs are not simulated.');
        const limit = p.maxevents === undefined ? 3 : integer(p.maxevents, 1, 100, '-MaxEvents');
        const events = [
          { TimeCreated: scenario === 'service-stopped' ? '2026-10-28T09:08:00+09:00' : '2026-10-28T09:10:00+09:00', Id: 7036, LevelDisplayName: 'Information', ProviderName: 'Service Control Manager', Message: 'The Print Spooler service entered the ' + (scenario === 'service-stopped' ? 'stopped' : 'running') + ' state.' },
          { TimeCreated: '2026-10-28T09:08:00+09:00', Id: 7031, LevelDisplayName: 'Error', ProviderName: 'Service Control Manager', Message: 'The Print Spooler service terminated unexpectedly. It has done this 1 time(s). [Fictional excerpt; recovery action details omitted.]' },
          { TimeCreated: '2026-10-28T09:00:00+09:00', Id: 6005, LevelDisplayName: 'Information', ProviderName: 'EventLog', Message: 'The Event log service was started.' }
        ];
        return success(events.slice(0, limit), 'System.Diagnostics.Eventing.Reader.EventLogRecord');
      }
      if (name === 'get-netipconfiguration') {
        options(args);
        return success([{ InterfaceAlias: 'Ethernet', InterfaceIndex: 12, NetProfile: { Name: 'corp.example' }, IPv4Address: { IPAddress: '10.20.0.14', PrefixLength: 24 }, IPv4DefaultGateway: { NextHop: '10.20.0.1' }, DNSServer: { ServerAddresses: [dnsAddress(scenario)] } }], 'Microsoft.Management.Infrastructure.CimInstance');
      }
      if (name === 'get-netadapter') {
        options(args);
        return success([{ Name: 'Ethernet', InterfaceDescription: 'Practice Ethernet Adapter', ifIndex: 12, Status: 'Up', MacAddress: '02-00-00-00-00-14', LinkSpeed: '1 Gbps' }], 'Microsoft.Management.Infrastructure.CimInstance#MSFT_NetAdapter');
      }
      if (name === 'get-dnsclientserveraddress') {
        options(args);
        return success([{ InterfaceAlias: 'Ethernet', InterfaceIndex: 12, AddressFamily: 2, ServerAddresses: [dnsAddress(scenario)] }], 'Microsoft.Management.Infrastructure.CimInstance#MSFT_DNSClientServerAddress');
      }
      if (name === 'resolve-dnsname') {
        const p = options(args, ['name', 'server'], [], 'name');
        if (!p.name) unsupported('A host name is required.');
        if (/^[\d.]+$/.test(p.name)) unsupported('Reverse DNS lookups are outside this simulator. Use a registered host name.');
        const target = addressFor(p.name, scenario, p.server);
        return success([{ Name: target.name, Type: 'A', TTL: 300, Section: 'Answer', IPAddress: target.address }], 'Microsoft.DnsClient.Commands.DnsRecord_A');
      }
      if (name === 'test-connection') {
        const p = options(args, ['targetname', 'count'], ['quiet'], 'targetname');
        if (!p.targetname) unsupported('A target name is required.');
        const count = p.count === undefined ? 4 : integer(p.count, 1, 10, '-Count');
        const target = addressFor(p.targetname, scenario);
        if (p.quiet) return success([true], 'System.Boolean');
        return success(Array.from({ length: count }, (_, i) => ({ Ping: i + 1, Source: 'PC-014', Destination: target.name, Address: target.address, Latency: 1, Status: 'Success', BufferSize: 32 })), 'Microsoft.PowerShell.Commands.TestConnectionCommand+PingStatus');
      }
      if (name === 'test-netconnection') {
        const p = options(args, ['computername', 'port'], [], 'computername');
        if (!p.computername) unsupported('A computer name is required.');
        const port = p.port === undefined ? null : integer(p.port, 1, 65535, '-Port');
        let target;
        try { target = addressFor(p.computername, scenario); } catch (error) {
          if (error.message.startsWith('[Simulator]')) throw error;
          return success([{ ComputerName: p.computername, RemoteAddress: null, ...(port === null ? { PingSucceeded: false } : { RemotePort: port, TcpTestSucceeded: false }) }], 'NetTCPIP.TestNetConnectionResult');
        }
        const result = { ComputerName: p.computername, RemoteAddress: target.address, InterfaceAlias: 'Ethernet', SourceAddress: '10.20.0.14' };
        if (port === null) result.PingSucceeded = true;
        else {
          result.RemotePort = port;
          const webTarget = ['10.20.0.20', '93.184.216.34'].includes(target.address);
          result.TcpTestSucceeded = (port === 443 && webTarget || port === 445 && target.address === '10.20.0.30') && !(scenario === 'tcp-blocked' && port === 443);
        }
        return success([result], 'NetTCPIP.TestNetConnectionResult');
      }
      if (name === 'get-nettcpconnection') {
        const p = options(args, ['state']);
        if (p.state && !['listen', 'established'].includes(p.state.toLowerCase())) unsupported('Supported states are Listen and Established.');
        const rows = [
          ...(pc.processes.some(item => item.Id === 4320) ? [{ LocalAddress: '127.0.0.1', LocalPort: 8080, RemoteAddress: '0.0.0.0', RemotePort: 0, State: 'Listen', OwningProcess: 4320 }] : []),
          ...(scenario !== 'tcp-blocked' && scenario !== 'dns-wrong' ? [{ LocalAddress: '10.20.0.14', LocalPort: 51024, RemoteAddress: '10.20.0.20', RemotePort: 443, State: 'Established', OwningProcess: 6040 }] : [])
        ];
        return success(rows.filter(item => !p.state || item.State.toLowerCase() === p.state.toLowerCase()), 'Microsoft.Management.Infrastructure.CimInstance#MSFT_NetTCPConnection');
      }
      if (name === 'get-netroute') {
        const p = options(args, ['destinationprefix']);
        const routes = [{ ifIndex: 12, DestinationPrefix: '0.0.0.0/0', NextHop: '10.20.0.1', RouteMetric: 25, InterfaceAlias: 'Ethernet' }, { ifIndex: 12, DestinationPrefix: '10.20.0.0/24', NextHop: '0.0.0.0', RouteMetric: 256, InterfaceAlias: 'Ethernet' }];
        return success(routes.filter(item => !p.destinationprefix || item.DestinationPrefix === p.destinationprefix), 'Microsoft.Management.Infrastructure.CimInstance#MSFT_NetRoute');
      }
      if (name === 'invoke-webrequest' || name === 'invoke-restmethod') {
        const rest = name === 'invoke-restmethod';
        const p = options(args, rest ? ['uri'] : ['uri', 'method'], ['skiphttperrorcheck'], 'uri');
        if (!p.uri) unsupported('-Uri is required.');
        let url;
        try { url = new URL(p.uri); } catch { return failure('Invalid URI: ' + p.uri); }
        if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search) unsupported('Use a registered HTTPS URL with no custom port, credentials, or query.');
        const method = (p.method || 'Get').toLowerCase();
        if (!['get', 'head'].includes(method)) unsupported('Supported methods are Get and Head.');
        if (rest && (url.hostname !== 'intranet.corp.example' || url.pathname !== '/api/status')) unsupported('The REST endpoint is https://intranet.corp.example/api/status.');
        if (!rest && !['/', '/api/status'].includes(url.pathname)) unsupported('Only the home page and /api/status are registered.');
        const target = addressFor(url.hostname, scenario);
        if (target.name === 'files.corp.example') return failure('Unable to connect to the remote server on TCP port 443.');
        if (scenario === 'tcp-blocked') return failure('Unable to connect to the remote server on TCP port 443.');
        const unavailable = scenario === 'web-503' && target.name === 'intranet.corp.example';
        if (unavailable && !p.skiphttperrorcheck) return failure('Response status code does not indicate success: 503 (Service Unavailable).');
        const api = url.pathname === '/api/status';
        const payload = unavailable ? { service: 'Helpdesk', status: 'unavailable', queue: 3 } : { service: 'Helpdesk', status: 'ok', queue: 3 };
        if (rest) return success([payload], 'System.Management.Automation.PSCustomObject');
        const content = api ? JSON.stringify(payload) : unavailable ? '<html><body>Service temporarily unavailable.</body></html>' : '<html><body>Welcome to the practice portal.</body></html>';
        return success([{ StatusCode: unavailable ? 503 : 200, StatusDescription: unavailable ? 'Service Unavailable' : 'OK', Content: method === 'head' ? '' : content, Headers: { 'Content-Type': [api ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8'], ...(unavailable ? { 'Retry-After': ['120'] } : {}) }, RawContentLength: method === 'head' ? 0 : content.length }], 'Microsoft.PowerShell.Commands.BasicHtmlWebResponseObject');
      }
      return null;
    } catch (error) { return failure(error.message || '[Simulator] The command could not be completed.'); }
  }
  return { createState, execute, reference, scenarios };
});
