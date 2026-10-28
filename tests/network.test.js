'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Network = require('../src/network.js');
const fresh = (scenario = 'base') => ({ scenario, pc: Network.createState(scenario) });
const run = (session, name, args = [], items = [], type = 'System.Object') => Network.execute(name, args, { items, type }, session, { language: 'ja' });
const ok = (session, name, args = [], items = [], type) => {
  const result = run(session, name, args, items, type);
  assert.equal(result?.code, 0, name + ': ' + JSON.stringify(result));
  return result;
};

test('network API uses independent scenario state and returns null only for unknown commands', () => {
  const a = fresh('service-stopped'), b = fresh();
  assert.equal(a.pc.services[0].Status, 'Stopped');
  assert.equal(b.pc.services[0].Status, 'Running');
  ok(a, 'start-service', ['Spooler']);
  assert.equal(b.pc.services[0].Status, 'Running');
  assert.equal(run(a, 'nonexistent-cmdlet'), null);
  assert.equal(Network.scenarios.length, 6);
  assert.ok(Network.reference.every(ref => ref.syntax && ref.summaryJa && ref.summaryEn));
});

test('process output retains numeric properties, matching is exact or explicitly wildcarded', () => {
  const s = fresh();
  const result = ok(s, 'get-process');
  assert.equal(result.type, 'System.Diagnostics.Process');
  assert.deepEqual(result.items.map(row => row.Id), [4320, 2080, 6040]);
  assert.equal(result.items[0].CPU, 125);
  assert.equal(typeof result.items[0].WorkingSet64, 'number');
  result.items[0].CPU = 999;
  assert.equal(s.pc.processes[0].CPU, 125, 'returned objects must not mutate the session');
  assert.equal(ok(s, 'get-process', ['-Name', 'notes*']).items.length, 1);
  assert.equal(ok(s, 'get-process', ['-Id', '4320']).items[0].ProcessName, 'NotesApp');
  assert.notEqual(run(s, 'get-process', ['-Id', '432']).code, 0);
  assert.notEqual(run(s, 'get-process', ['-Name', 'NotesApp', '-Id', '4320']).code, 0);
});

test('Stop-Process WhatIf does not stop a process and supported object pipeline does', () => {
  const s = fresh(), before = JSON.stringify(s.pc);
  const preview = ok(s, 'stop-process', ['-Id', '4320', '-WhatIf']);
  assert.match(preview.output, /What if.*4320/);
  assert.deepEqual(preview.items, []);
  assert.deepEqual(preview.effects, []);
  assert.equal(JSON.stringify(s.pc), before);
  assert.notEqual(run(s, 'stop-process', ['-Id', '2080']).code, 0);
  const processes = ok(s, 'get-process', ['-Id', '4320']);
  ok(s, 'stop-process', [], processes.items, processes.type);
  assert.notEqual(run(s, 'get-process', ['-Id', '4320']).code, 0);
  assert.deepEqual(ok(s, 'get-nettcpconnection', ['-State', 'Listen']).items, [], 'stopped app no longer owns a listener');
  assert.notEqual(run(s, 'stop-process', ['-Id', '4320']).code, 0);
});

test('service queries distinguish state and startup type; mutation is constrained to Spooler', () => {
  const s = fresh('service-stopped');
  const service = ok(s, 'get-service', ['-Name', 'Spooler']).items[0];
  assert.equal(service.Status, 'Stopped');
  assert.equal(service.StartType, 'Automatic');
  assert.equal(ok(s, 'get-service', ['-Name', 'Sp*']).items.length, 1);
  assert.notEqual(run(s, 'get-service', ['Spool']).code, 0);
  for (const command of ['start-service', 'stop-service', 'restart-service']) {
    const before = JSON.stringify(s.pc);
    assert.deepEqual(ok(s, command, ['-Name', 'Spooler', '-WhatIf']).effects, []);
    assert.equal(JSON.stringify(s.pc), before);
    assert.notEqual(run(s, command, ['Dnscache']).code, 0);
    assert.notEqual(run(s, command, ['Spooler', '-Force']).code, 0);
    assert.equal(JSON.stringify(s.pc), before);
  }
  const services = ok(s, 'get-service', ['Spooler']);
  ok(s, 'start-service', [], services.items, services.type);
  assert.equal(ok(s, 'get-service', ['Spooler']).items[0].Status, 'Running');
  ok(s, 'stop-service', ['Spooler']);
  assert.equal(s.pc.services[0].Status, 'Stopped');
  ok(s, 'restart-service', ['Spooler']);
  assert.equal(s.pc.services[0].Status, 'Running');
});

test('CIM returns independently inspectable OS, computer, and disk information', () => {
  const s = fresh();
  const os = ok(s, 'get-ciminstance', ['-ClassName', 'Win32_OperatingSystem']).items[0];
  assert.match(os.Caption, /Windows 11/);
  assert.ok(os.LastBootUpTime.startsWith('2026-10-28'));
  const pc = ok(s, 'get-ciminstance', ['Win32_ComputerSystem']).items[0];
  assert.equal(pc.Name, 'PC-014'); assert.equal(pc.Domain, 'corp.example');
  const disk = ok(s, 'get-ciminstance', ['Win32_LogicalDisk']).items[0];
  assert.equal(disk.FreeSpace, 8 * 1073741824);
  assert.equal(disk.Size, 256 * 1073741824);
  assert.equal(ok(fresh('low-disk'), 'get-ciminstance', ['Win32_LogicalDisk']).items[0].FreeSpace, 2 * 1073741824);
  assert.notEqual(run(s, 'get-ciminstance', ['Win32_UserAccount']).code, 0);
  assert.notEqual(run(s, 'get-ciminstance', ['Win32_LogicalDisk', '-ComputerName', 'real.example']).code, 0);
});

test('event log is newest first and is not rewritten when the current service state changes', () => {
  const s = fresh('service-stopped');
  const events = ok(s, 'get-winevent', ['-LogName', 'System', '-MaxEvents', '2']).items;
  assert.equal(events.length, 2);
  assert.match(events[0].Message, /Spooler.*stopped/);
  assert.ok(events[0].TimeCreated >= events[1].TimeCreated);
  assert.equal(events[0].TimeCreated, events[1].TimeCreated, 'stop state and abnormal termination belong to the same incident');
  assert.equal(events[1].Id, 7031);
  assert.match(events[1].Message, /terminated unexpectedly.*1 time\(s\).*Fictional excerpt/);
  ok(s, 'start-service', ['Spooler']);
  assert.deepEqual(ok(s, 'get-winevent', ['-LogName', 'System', '-MaxEvents', '2']).items, events);
  assert.notEqual(run(s, 'get-winevent', ['-LogName', 'Application']).code, 0);
});

test('IP, DNS, adapter and route commands represent one consistent network', () => {
  const s = fresh();
  const configuration = ok(s, 'get-netipconfiguration').items[0];
  assert.equal(configuration.IPv4Address.IPAddress, '10.20.0.14');
  assert.equal(configuration.IPv4DefaultGateway.NextHop, '10.20.0.1');
  assert.deepEqual(configuration.DNSServer.ServerAddresses, ['10.20.0.10']);
  assert.equal(ok(s, 'get-netadapter').items[0].Status, 'Up');
  assert.deepEqual(ok(s, 'get-dnsclientserveraddress').items[0].ServerAddresses, ['10.20.0.10']);
  assert.equal(ok(s, 'get-netroute', ['-DestinationPrefix', '0.0.0.0/0']).items[0].NextHop, '10.20.0.1');
  assert.deepEqual(ok(s, 'get-netroute', ['-DestinationPrefix', '0.0.0.0/1']).items, []);
  assert.equal(ok(s, 'get-nettcpconnection', ['-State', 'Listen']).items[0].OwningProcess, 4320);
});

test('DNS configuration failure is isolated from explicit server queries and IP reachability', () => {
  const s = fresh('dns-wrong');
  assert.deepEqual(ok(s, 'get-dnsclientserveraddress').items[0].ServerAddresses, ['192.0.2.53']);
  const failed = run(s, 'resolve-dnsname', ['intranet.corp.example']);
  assert.equal(failed.code, 1); assert.match(failed.error, /192\.0\.2\.53/);
  assert.equal(ok(s, 'resolve-dnsname', ['intranet.corp.example', '-Server', '10.20.0.10']).items[0].IPAddress, '10.20.0.20');
  assert.equal(ok(s, 'test-connection', ['10.20.0.1', '-Quiet']).items[0], true);
  assert.notEqual(run(s, 'test-connection', ['intranet.corp.example']).code, 0);
  assert.equal(ok(s, 'test-netconnection', ['intranet.corp.example', '-Port', '443']).items[0].TcpTestSucceeded, false);
  assert.notEqual(run(s, 'resolve-dnsname', ['unregistered.example']).code, 0);
});

test('ICMP, TCP and HTTP results are independently modeled', () => {
  const s = fresh('tcp-blocked');
  assert.equal(ok(s, 'resolve-dnsname', ['intranet.corp.example']).items[0].IPAddress, '10.20.0.20');
  assert.equal(ok(s, 'test-connection', ['-TargetName', 'intranet.corp.example', '-Count', '2']).items.length, 2);
  assert.equal(ok(s, 'test-connection', ['intranet.corp.example', '-Quiet']).items[0], true);
  assert.equal(ok(s, 'test-netconnection', ['-ComputerName', 'intranet.corp.example', '-Port', '443']).items[0].TcpTestSucceeded, false);
  assert.notEqual(run(s, 'invoke-webrequest', ['https://intranet.corp.example']).code, 0);
  assert.equal(ok(fresh(), 'test-netconnection', ['intranet.corp.example', '-Port', '443']).items[0].TcpTestSucceeded, true);
  assert.equal(ok(fresh(), 'test-netconnection', ['intranet.corp.example', '-Port', '4443']).items[0].TcpTestSucceeded, false);
  assert.equal(ok(fresh(), 'test-netconnection', ['10.20.0.30', '-Port', '443']).items[0].TcpTestSucceeded, false);
  assert.equal(ok(fresh(), 'test-netconnection', ['10.20.0.30', '-Port', '445']).items[0].TcpTestSucceeded, true);
  assert.equal(ok(fresh(), 'test-netconnection', ['10.20.0.1', '-Port', '443']).items[0].TcpTestSucceeded, false);
});

test('HTTP 503 fails by default but SkipHttpErrorCheck exposes response headers and status', () => {
  const s = fresh('web-503');
  assert.equal(ok(s, 'test-netconnection', ['intranet.corp.example', '-Port', '443']).items[0].TcpTestSucceeded, true);
  const failed = run(s, 'invoke-webrequest', ['-Uri', 'https://intranet.corp.example']);
  assert.equal(failed.code, 1); assert.match(failed.error, /503/);
  const response = ok(s, 'invoke-webrequest', ['https://intranet.corp.example', '-SkipHttpErrorCheck']).items[0];
  assert.equal(response.StatusCode, 503);
  assert.deepEqual(response.Headers['Retry-After'], ['120']);
  assert.match(response.Content, /unavailable/);
  const head = ok(s, 'invoke-webrequest', ['https://intranet.corp.example', '-Method', 'Head', '-SkipHttpErrorCheck']).items[0];
  assert.equal(head.Content, '');
  assert.equal(head.StatusCode, 503);
  assert.equal(ok(s, 'invoke-webrequest', ['https://example.com']).items[0].StatusCode, 200);
});

test('REST JSON returns data properties rather than a WebResponse wrapper', () => {
  const s = fresh();
  const result = ok(s, 'invoke-restmethod', ['-Uri', 'https://intranet.corp.example/api/status']);
  assert.equal(result.type, 'System.Management.Automation.PSCustomObject');
  assert.deepEqual(result.items, [{ service: 'Helpdesk', status: 'ok', queue: 3 }]);
  assert.equal(ok(s, 'invoke-webrequest', ['https://intranet.corp.example/api/status']).items[0].StatusCode, 200);
  assert.notEqual(run(s, 'invoke-restmethod', ['https://intranet.corp.example']).code, 0);
  assert.notEqual(run(fresh('web-503'), 'invoke-restmethod', ['https://intranet.corp.example/api/status']).code, 0);
});

test('unsupported parameters and malformed values never produce success or mutate state', () => {
  const s = fresh(), before = JSON.stringify(s.pc);
  const invalid = [
    ['stop-process', ['-Id']], ['stop-process', ['-Id', '-1']], ['stop-process', ['-Id', '4320', '-Unknown']],
    ['stop-service', ['Spooler', 'extra']], ['start-service', ['-Name', 'Spooler', '-Name', 'Spooler']],
    ['get-netadapter', ['-Name', 'Ethernet']], ['get-netipconfiguration', ['nonsense']],
    ['get-process', ['-Id', 'NaN']], ['get-winevent', ['-LogName', 'System', '-MaxEvents', '0']],
    ['test-connection', ['intranet.corp.example', '-Count', '0']], ['test-connection', ['intranet.corp.example', '-Count', '1.5']],
    ['test-netconnection', ['intranet.corp.example', '-Port', '65536']], ['test-netconnection', ['unregistered.example', '-Port', '443']],
    ['get-nettcpconnection', ['-State', 'Unknown']], ['resolve-dnsname', ['intranet.corp.example', '-Server', '10.20.0.100']],
    ['invoke-webrequest', ['file:///tmp/data']], ['invoke-webrequest', ['https://intranet.corp.example', '-Method', 'Post']],
    ['invoke-webrequest', ['https://intranet.corp.example/not-registered']], ['invoke-webrequest', ['https://intranet.corp.example:8443']],
    ['invoke-webrequest', ['https://intranet.corp.example', '-OutFile', 'C:\\Lab\\response.txt']]
  ];
  for (const [name, args] of invalid) {
    const result = run(s, name, args);
    assert.notEqual(result.code, 0, name + ' ' + args.join(' '));
    assert.deepEqual(result.effects, []);
    assert.equal(JSON.stringify(s.pc), before);
  }
});
