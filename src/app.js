(function () {
  'use strict';
  const { PSRShell: Shell, PSRData: Data, PSREngine: Engine } = globalThis;
  const $ = id => document.getElementById(id);
  const escape = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dict = {
    home: ['学習マップ', 'Learning map'], sandbox: ['自由練習', 'Playground'], reference: ['コマンド帳', 'Commands'],
    saveMenu: ['進捗を保存', 'Save progress'], fillExample: ['見本を入力欄に入れる', 'Put example in the input'], jumpTerminal: ['ターミナルで試す ↓', 'Try in the terminal ↓'],
    intro: ['小さな手がかりから、原因へ。', 'Small clues. Clearer answers.'],
    hero: ['集めた情報を、<br><em>使える答えに。</em>', 'Find the signal.<br><em>Work with objects.</em>'],
    lead: ['コマンドの入口から、データの絞り込み・並べ替え・CSV保存へ。ファイルやPC、ネットワークの困りごとを解きながら身につけるPowerShell入門。', 'From your first cmdlet to filtering objects and exporting useful reports. Learn PowerShell through small tasks about files, PCs, and everyday IT troubleshooting.'],
    start: ['最初からはじめる →', 'Start learning →'], continue: ['続きから学ぶ →', 'Continue learning →'],
    offline: ['インストール不要 · オフライン対応 · 登録不要', 'No installation · Works offline · No account'],
    clueTitle: ['必要な行を、必要な項目だけ。', 'The right rows. The useful properties.'],
    clueText: ['CSVから空き容量の少ないPCを抽出。パイプの途中を開くと、オブジェクトの項目や件数の変化も見えます。', 'Find PCs with little free space in a CSV. Inspect the pipeline to see the object properties and counts at each stage.'],
    overviewTitle: ['取得する。絞り込む。確かめて残す。', 'Get it. Filter it. Verify and save it.'],
    overviewText: ['Windows 11上のPowerShell 7系を想定した、一般的なITトラブル対応の教材です。', 'Everyday IT troubleshooting with PowerShell 7 on a simulated Windows 11 PC.'],
    progress: ['学習の進み具合', 'Your progress'], complete: ['完了', 'complete'], courseTitle: ['5つの入口から、順番に。', 'Five tracks. One step at a time.'],
    courseSub: ['どのレッスンからでも始められます。', 'Every lesson is independent. Start anywhere.'], lessons: ['レッスン', 'lessons'],
    playgroundTitle: ['気になるコマンドを、自由に。', 'Follow your curiosity.'],
    playgroundText: ['仮想PCで試す練習室。環境を切り替えて、結果の違いも確かめられます。', 'Explore the virtual PC. Switch scenarios and compare what the commands tell you.'],
    step1: ['01  読んで理解する', '01  Read the context'], step1text: ['短い説明と例で、コマンドの役割を知る。', 'Understand the purpose of a command with a short explanation and example.'],
    step2: ['02  打って確かめる', '02  Try a command'], step2text: ['手を動かして、仮想PCの結果を観察する。', 'Run it yourself and inspect the virtual PC’s output.'],
    step3: ['03  結果から考える', '03  Interpret the result'], step3text: ['調査で分かったことと、まだ分からないことを区別する。', 'Separate what the evidence shows from what still needs checking.'],
    footer: ['学習用シミュレーター · 実際のWindowsやネットワークにはアクセスしません', 'Learning simulator · No access to your operating system or network'],
    saved: ['このブラウザに自動保存', 'Autosaved in this browser'], storageError: ['このブラウザでは自動保存できません。設定メニューの「進捗を書き出す」で保存してください。', 'Autosave is unavailable. Save your work with “Export progress” in Settings.'],
    search: ['レッスンを探す', 'Find a lesson'], noResults: ['一致するレッスンがありません。', 'No matching lessons.'],
    example: ['コマンドの例', 'EXAMPLE'], task: ['やってみよう', 'YOUR TASK'], hint: ['ヒント', 'Hint'], hintsDone: ['ヒントをすべて表示中', 'All hints shown'],
    solution: ['解答例を見る', 'Show solution'], solutionLabel: ['解答例 · 自分で入力して確かめましょう', 'SOLUTION · Type it yourself and inspect the result'],
    interpretation: ['結果を読み取る', 'INTERPRET THE RESULT'], check: ['結果を確認する', 'Check my work'],
    previous: ['← 前へ', '← Previous'], next: ['次へ →', 'Next →'], finish: ['コース一覧へ →', 'Back to courses →'],
    lessonList: ['レッスン一覧', 'Lesson list'], terminal: ['コマンドを試す', 'TRY A COMMAND'], simulated: ['仮想PC', 'SIMULATED'],
    resetLesson: ['この問題をリセット', 'Reset this lesson'], clear: ['表示を消す', 'Clear'], reset: ['この環境をやり直す', 'Reset this environment'],
    welcome: ['Windows 11 / PowerShell 7 の学習用環境です。\nGet-Command と Get-Help で対応する書式を確認できます。', 'Learning environment: Windows 11 / PowerShell 7.\nUse Get-Command and Get-Help to discover supported forms.'],
    input: ['コマンドを入力', 'Enter a command'], run: ['実行', 'Run'], history: ['履歴', 'history'], completion: ['補完', 'complete'],
    keyboardNext: ['完了後・入力欄が空なら次へ', 'next when complete and input is empty'],
    evidencePending: ['コマンドで手がかりを集めよう', 'Gather evidence with commands'], evidenceReady: ['必要な実行結果がそろいました', 'The required evidence is ready'],
    evidenceHint: ['「やってみよう」の条件を確認してください。', 'Follow the task to collect the evidence.'], evidenceQuestion: ['結果を読んで、左の問題に答えましょう。', 'Read the output and answer the lesson question.'],
    completedTitle: ['このレッスンは完了です', 'Lesson completed'], completedText: ['次のレッスンへ進むか、この環境で練習を続けられます。', 'Continue to the next lesson or keep practicing here.'],
    recordTitle: ['完了記録あり · 復習中', 'Previously completed · Practicing again'], recordText: ['完了記録は保存されています。現在の環境で課題を再確認する場合は、条件を満たしてから「結果を確認する」を押してください。', 'Your completion record is saved. To verify this environment again, meet the task requirements and check your work.'],
    notYet: ['もうひとつ確かめましょう', 'One more thing to check'], needCommands: ['「確認項目」の未達になっている操作や結果を確かめましょう。パイプは一続きで、確認と変更は指定された順番で実行します。', 'Review the pending items in Requirements. Connect pipeline stages in one command and perform observations and changes in the required order.'],
    requirements: ['確認項目', 'Requirements'], requirementMet: ['確認済み', 'Met'], requirementPending: ['未達', 'Pending'],
    requirementPipeline: ['パイプでつなぐ', 'Connect in one pipeline'], requirementPipelineNote: ['各段を | でつなぎ、一続きの処理として完了させます。', 'Join the stages with | and complete them as one pipeline.'],
    requirementAlternatives: ['別の書式も使えます', 'Alternative forms are accepted'], requirementOr: ['または', 'or'],
    requirementOrder: ['指定された順番で実行', 'Run in the required order'], requirementOrderNote: ['変更をやり直した場合は、その後にもう一度状態を確認します。', 'If you repeat a change, check the state again afterwards.'],
    requirementStep: ['手順', 'Step'], requirementResult: ['結果', 'Result'], requirementError: ['指定されたエラーを観察', 'Observe the expected error'],
    requirementNoArgs: ['引数なし', 'No arguments'], requirementOutputCount: ['出力件数', 'Output count'],
    requirementFile: ['指定内容をファイルに保存', 'Save the required contents to the file'], requirementLocation: ['現在地', 'Current location'], requirementState: ['課題で指定された状態になっている', 'The environment is in the required state'],
    needAnswer: ['コマンドの条件は満たしています。結果が何を示すか、選択肢を確認してください。', 'The command requirements are met. Revisit what the output actually tells you and choose an answer.'],
    wrongAttempts: ['この環境での誤答回数', 'Incorrect answers in this environment'], choiceFeedback: ['選んだ答えについて', 'About your answer'],
    unreadableProgress: ['保存済みの進捗を読み込めなかったため、自動保存を停止しています。「進捗を保存」から元のデータを書き出せます。有効な進捗を読み込むか、学習データを消すと自動保存を再開します。', 'Saved progress could not be read, so autosave is paused to preserve it. Download the original data from Save progress. Import valid progress or erase learning data to resume autosave.'],
    rescueProgress: ['読み込めなかった元のデータを書き出す', 'Download the unreadable original data'],
    files: ['仮想ファイルを見る', 'Virtual files'], read: ['読む', 'Read'], insert: ['入力', 'Insert'],
    simNote: ['PowerShellの一部を再現した教材です。すべての構文には対応していません。ファイル・PC・IP・ログは架空で、実際の端末や通信には影響しません。', 'This simulator implements a documented subset of PowerShell. Files, PCs, IP addresses and logs are fictional. Commands do not affect your device or make real connections.'],
    trace: ['処理の流れ', 'Trace'], traceInput: ['受け取ったデータ', 'INPUT DATA'], traceOutput: ['出力したデータ', 'OUTPUT DATA'], traceError: ['エラー', 'ERROR'], noInput: ['（入力なし）', '(no input)'],
    settings: ['設定と学習データ', 'Settings & progress'], export: ['進捗を書き出す', 'Export progress'], import: ['進捗を読み込む', 'Import progress'],
    dataInfo: ['レッスンの完了状態、実行履歴、仮想ファイルをJSONで保存します。別のブラウザに移すときにも使えます。', 'Save completed lessons, command history, and virtual files as JSON. You can use the file to move to another browser.'],
    erase: ['学習データをすべて消す', 'Erase all learning data'], eraseConfirm: ['すべての進捗と仮想ファイルを消します。必要なら先に書き出してください。消しますか？', 'Erase all progress and virtual files? Export your data first if you need a backup.'],
    resetConfirm: ['この問題のファイル・操作履歴・回答・ヒントを最初の状態に戻します。ほかの問題の進捗と、これまでの完了記録は残ります。リセットしますか？', 'Reset this lesson’s files, command history, answers and hints? Other lessons and your past completion records will be kept.'],
    imported: ['進捗を読み込みました。', 'Progress imported.'], importFail: ['読み込めませんでした。有効なpowershellroomの進捗JSONか確認してください。現在の進捗は変更していません。', 'Could not import this file. Use a valid powershellroom progress JSON. Your current progress has not changed.'],
    importConfirm: ['現在の学習データを、ファイルの内容で置き換えますか？', 'Replace your current learning data with this file?'],
    exported: ['進捗ファイルを書き出しました。', 'Progress file exported.'], erased: ['学習データを初期化しました。', 'Learning data reset.'],
    refSearch: ['コマンド名・用途で検索', 'Search by command or purpose'], refScope: ['Windows本体ではなく、この教材が対応している書式です。すべてのコマンドやオプションを再現するものではありません。', 'These are the forms supported by this simulator, not a complete Windows command reference.'],
    sandboxGoal: ['課題や採点なしで、コマンドを自由に試せます。', 'Explore commands without a task or grading.'],
    sandboxBody: ['まずは Get-Command で一覧を見てみましょう。仮想ファイルや設定はこの練習室にだけ保存され、各レッスンの環境には影響しません。', 'Start with Get-Command. Files and settings are saved only in this playground and do not affect the lesson environments.'],
    scenario: ['環境を選ぶ', 'Choose a scenario'], scenarioNote: ['切り替えると、練習室の履歴と仮想ファイルを初期化します。', 'Switching resets the playground’s history and virtual files.'],
    ready: ['準備できています', 'Ready to explore'], savedDetail: ['オフラインで利用できます。進捗はこのブラウザだけに保存されます。配布HTMLは変更しません。', 'Works offline. Progress stays in this browser; the distributed HTML file is not modified.'],
    noCandidates: ['補完候補がありません。', 'No completion candidates.'],
    about: ['教材について', 'About this room'], aboutText: ['powershellroom v0.1.1 · 日本語 / English\nWindows 11上のPowerShell 7系を題材に、オブジェクト・パイプ・CSVと日常のIT調査を学ぶ教材です。windowsCLIroomの画面と進め方を引き継いでいます。', 'powershellroom v0.1.1 · 日本語 / English\nLearn PowerShell 7 objects, pipelines, CSV reports and everyday Windows troubleshooting. Built on the layout and learning flow of windowsCLIroom.']
  };
  let state = Engine.empty(), view = 'home', currentId = '', composing = false, historyCursor = -1, historyDraft = '';
  let saveTimer, toastTimer, feedback = null, courseSearch = '', courseOpen = false, unreadableProgress = null;
  const visibleFrom = {};
  const t = key => (dict[key] || [key, key])[state.language === 'en' ? 1 : 0];
  const shortTitle = value => loc(value).replace(/^\d+\s*·\s*/, '');
  // Localize authored lesson text and examples, never user input or terminal output.
  const loc = value => {
    const text = typeof value === 'string' ? value : value?.[state.language] || value?.ja || '';
    return state.language === 'ja' ? text.replace(/\\/g, '¥') : text;
  };
  const lessonById = id => Data.lessons.find(l => l.id === id);
  const trackById = id => Data.tracks.find(tr => tr.id === id);
  const lesson = () => lessonById(currentId);
  const cp = () => state.checkpoints[currentId];
  const progressCount = () => Object.keys(state.completed).length;
  const scenarios = [
    ['base','通常のPC','Healthy PC'], ['service-stopped','印刷サービス停止','Print service stopped'],
    ['dns-wrong','DNSの設定不良','Incorrect DNS configuration'], ['tcp-blocked','WebのTCP接続失敗','Web TCP connection fails'],
    ['web-503','Webサービスの503','Web service returns 503'], ['low-disk','ディスクの空き容量不足','Low disk space']
  ];
  function warning() { $('storage-warning').textContent = t(unreadableProgress !== null ? 'unreadableProgress' : 'storageError'); $('storage-warning').hidden = false; }
  try {
    const stored = localStorage.getItem(Engine.KEY);
    if (stored) { try { state = Engine.parse(stored); } catch { unreadableProgress = stored; warning(); } }
  } catch { warning(); }
  function stashInput() { if (cp() && $('command-input')) cp().input = $('command-input').value; }
  function save() {
    clearTimeout(saveTimer); stashInput();
    if (unreadableProgress !== null) { warning(); return; }
    try { localStorage.setItem(Engine.KEY, JSON.stringify(state)); $('storage-warning').hidden = true; } catch { warning(); }
  }
  function deferSave() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 250); }
  function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3800); }
  function setHeader() {
    document.documentElement.lang = state.language;
    $('home-button').textContent = t('home'); $('sandbox-button').textContent = t('sandbox'); $('reference-button').textContent = t('reference');
    $('menu-button').textContent = t('saveMenu');
    $('home-button').classList.toggle('active', view === 'home'); $('sandbox-button').classList.toggle('active', currentId === 'sandbox' && view === 'workspace');
    $('language-button').textContent = state.language === 'ja' ? 'EN' : '日本語';
    $('language-button').lang = state.language === 'ja' ? 'en' : 'ja';
    $('language-button').setAttribute('aria-label', state.language === 'ja' ? 'Switch to English' : '日本語に切り替える');
    $('footer').textContent = `powershellroom ${Data.version}  ·  ${t('footer')}`;
  }
  function progressBar(count = progressCount(), total = Data.lessons.length) {
    return `<div class="progress-track" role="progressbar" aria-label="${escape(t('progress'))}" aria-valuenow="${count}" aria-valuemin="0" aria-valuemax="${total}"><div class="progress-fill" style="width:${total ? 100 * count / total : 0}%"></div></div>`;
  }
  function showHome() { stashInput(); save(); view = 'home'; currentId = ''; feedback = null; render(); window.scrollTo(0, 0); }
  function openLesson(id, focus = false) {
    if (id !== 'sandbox' && !lessonById(id)) return;
    stashInput(); save(); currentId = id; view = 'workspace'; state.activeId = id;
    if (!cp()) state.checkpoints[id] = Engine.fresh(lesson());
    historyCursor = -1; feedback = null; courseOpen = false; courseSearch = '';
    render(); save(); window.scrollTo(0, 0);
    if (focus) $('command-input').focus({ preventScroll: true });
  }
  function homeHTML() {
    const resume = state.activeId && state.activeId !== 'sandbox' ? state.activeId : Data.lessons.find(l => !state.completed[l.id])?.id || Data.lessons[0].id;
    const cards = Data.tracks.map((tr, i) => {
      const group = Data.lessons.filter(l => l.track === tr.id), done = group.filter(l => state.completed[l.id]).length;
      const target = group.find(l => !state.completed[l.id]) || group[0];
      return `<button class="course-card" data-open="${escape(target.id)}"><span class="course-number">0${i + 1}</span><h3>${escape(loc(tr.title))}</h3><p>${escape(loc(tr.description || tr.subtitle))}</p><span class="course-meta"><span>${group.length} ${t('lessons')} · ${done}/${group.length} ${t('complete')}</span><span class="arrow">↗</span></span></button>`;
    }).join('');
    return `<div class="home"><section class="hero"><div><p class="eyebrow">POWERSHELL · LEARN BY DOING</p><h1>${t('hero')}</h1><p class="lead">${t('lead')}</p><div class="hero-actions"><button class="primary" data-open="${escape(resume)}">${progressCount() || state.activeId ? t('continue') : t('start')}</button><button data-action="sandbox">${t('sandbox')}</button></div><p class="micro">${t('offline')}</p></div><div class="sample-terminal" aria-label="PowerShell object pipeline example"><div class="terminal-top"><span><span class="terminal-dots"><i></i><i></i><i></i></span> PowerShell 7</span><span>PC-014 · SIMULATED</span></div><div class="sample-body"><div class="cmd"><span class="prompt-prefix">PS ${escape(loc('C:\\Lab'))}&gt;</span><br>Import-Csv .${loc('\\')}devices.csv |<br>  Where-Object { [int]$_.FreeGB -lt 10 } |<br>  Select-Object Name,FreeGB</div><pre class="object-sample">Name    FreeGB
----    ------
PC-014  8
PC-032  5</pre></div><div class="sample-note"><strong>${t('clueTitle')}</strong>${t('clueText')}</div></div></section><section class="overview"><div><strong>${t('overviewTitle')}</strong><p>${t('overviewText')}</p></div><div class="progress-inline"><div class="progress-caption"><span>${t('progress')}</span><span>${progressCount()} / ${Data.lessons.length}</span></div>${progressBar()}</div></section><section><div class="section-heading"><div><h2>${t('courseTitle')}</h2><p>${t('courseSub')}</p></div><span class="pill">${Data.lessons.length} ${t('lessons')}</span></div><div class="course-grid">${cards}<button class="course-card practice-card" data-action="sandbox"><span class="course-number">&gt;_</span><h3>${t('playgroundTitle')}</h3><p>${t('playgroundText')}</p><span class="course-meta"><span>${t('sandbox')}</span><span class="arrow">↗</span></span></button></div></section><section class="how-it-works">${[1, 2, 3].map(n => `<div><h3>${t('step' + n)}</h3><p>${t('step' + n + 'text')}</p></div>`).join('')}</section></div>`;
  }
  function navHTML() {
    const q = courseSearch.toLowerCase();
    return `<div class="nav-top"><h2>${t('lessonList')} <span class="subtle">${progressCount()}/${Data.lessons.length}</span></h2>${progressBar()}<div style="height:12px"></div><input id="lesson-search" class="nav-search" type="search" placeholder="${t('search')}" aria-label="${t('search')}" value="${escape(courseSearch)}"></div><div id="lesson-groups">${navGroups(q)}</div>`;
  }
  function navGroups(q) {
    q = q.replace(/[¥￥]/g, '\\');
    let count = 0;
    const html = Data.tracks.map((tr, i) => {
      const group = Data.lessons.filter(l => l.track === tr.id && `${loc(l.title)} ${l.solution.join(' ')}`.toLowerCase().includes(q));
      count += group.length;
      if (!group.length) return '';
      return `<section class="nav-group"><div class="nav-group-title"><span>0${i + 1} · ${escape(loc(tr.title))}</span></div>${group.map(l => `<button class="lesson-item ${currentId === l.id ? 'active' : ''} ${state.completed[l.id] ? 'done' : ''}" data-open="${escape(l.id)}" ${currentId === l.id ? 'aria-current="step"' : ''}><span class="status">${state.completed[l.id] ? '✓' : String(Data.lessons.indexOf(l) + 1).padStart(2, '0')}</span><span>${escape(shortTitle(l.title))}</span></button>`).join('')}</section>`;
    }).join('');
    return count ? html : `<p class="empty-search">${t('noResults')}</p>`;
  }
  function instructionHTML() {
    const l = lesson();
    if (!l) return `<div class="breadcrumb"><span>PLAYGROUND</span><button class="small mobile-course-toggle" data-action="courses">${t('lessonList')}</button></div><h1>${t('sandbox')}</h1><p class="lesson-goal">${t('sandboxGoal')}</p><div class="lesson-explanation"><p>${t('sandboxBody')}</p></div><label class="label" for="scenario-select">${t('scenario')}</label><select id="scenario-select" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px">${scenarios.map(s => `<option value="${s[0]}" ${cp().session.scenario === s[0] ? 'selected' : ''}>${escape(s[state.language === 'ja' ? 1 : 2])}</option>`).join('')}</select><p class="micro">${t('scenarioNote')}</p><section class="sandbox-instructions"><p class="label">${t('example')}</p><div class="sandbox-commands">${['Get-Command','Get-ChildItem C:\\Lab','Get-Process | Select-Object ProcessName,CPU','Get-Service -Name Spooler','Get-NetIPConfiguration','Test-NetConnection intranet.corp.example -Port 443','Import-Csv C:\\Lab\\devices.csv','Get-Process | Get-Member'].map(c => `<button data-insert="${escape(loc(c))}">${escape(loc(c))}</button>`).join('')}</div></section><p class="sim-note">${t('simNote')}</p>`;
    const index = Data.lessons.indexOf(l), tr = trackById(l.track);
    return `<div class="breadcrumb"><span>${escape(loc(tr.title))} · ${String(index + 1).padStart(2, '0')} / ${Data.lessons.length}</span><button class="small mobile-course-toggle" data-action="courses">${t('lessonList')}</button></div><h1>${escape(loc(l.title))}</h1><p class="lesson-goal">${escape(loc(l.goal))}</p><div class="lesson-explanation">${l.explanation.map(p => `<p>${escape(loc(p))}</p>`).join('')}</div><div class="example"><p class="label">${t('example')}</p><pre>${escape(loc(l.example.command))}</pre><p class="example-note">${escape(loc(l.example.note))}</p><button class="small" style="margin-top:9px" data-insert="${escape(loc(l.example.command))}">${t('fillExample')}</button></div><div class="task"><p class="label">${t('task')}</p><p>${escape(loc(l.task))}</p></div><div id="hints"></div>${l.question ? `<section class="question"><p class="label">${t('interpretation')}</p><fieldset><legend>${escape(loc(l.question.prompt))}</legend>${l.question.choices.map(ch => `<label class="choice"><input type="radio" name="answer" value="${escape(ch.id)}" ${cp().answer === ch.id ? 'checked' : ''}><span>${escape(loc(ch.text))}</span></label>`).join('')}</fieldset></section>` : ''}<div class="check-actions"><button id="check-button" class="primary" data-action="check">${t('check')}</button><button id="lesson-reset" data-action="reset">↺ ${t('resetLesson')}</button></div><div id="feedback" aria-live="polite"></div><div class="lesson-controls"><button class="small" data-action="previous" ${index === 0 ? 'disabled' : ''}>${t('previous')}</button><button id="next-button" class="secondary" data-action="next">${index === Data.lessons.length - 1 ? t('finish') : t('next')}</button></div>`;
  }
  function consoleHTML() {
    return `<div class="console-title"><h2>${t('terminal')}</h2><span class="pill"><span class="dot"></span>${t('simulated')}</span></div><div class="console"><div class="terminal-top"><span>PowerShell 7 · PC-014</span><div class="terminal-actions"><button data-action="clear">${t('clear')}</button><button data-action="reset">↺ ${t('reset')}</button></div></div><div id="console-output" class="console-output" role="log" aria-label="${escape(t('terminal'))}" aria-live="polite" aria-relevant="additions"></div><form id="command-form" class="command-form" autocomplete="off"><div id="prompt-path" class="prompt-path"></div><div class="input-row"><span aria-hidden="true">&gt;</span><input id="command-input" type="text" spellcheck="false" autocomplete="off" autocapitalize="off" autocorrect="off" maxlength="4096" aria-label="${t('input')}" placeholder="${t('input')}"><button class="run-button" type="submit">${t('run')} ↵</button></div></form></div><div class="console-tip"><span><kbd>↑ ↓</kbd> ${t('history')}</span><span><kbd>Tab</kbd> ${t('completion')}</span><span><kbd>→</kbd> ${t('keyboardNext')}</span></div><div id="evidence" class="clue-status"></div><details class="file-panel"><summary>${t('files')}</summary><div id="file-list" class="file-list"></div></details><p class="sim-note">${t('simNote')}</p>`;
  }
  function render() {
    setHeader();
    $('main').innerHTML = view === 'home' ? homeHTML() : `<div class="workspace ${courseOpen ? 'course-open' : ''}"><aside class="lesson-nav" aria-label="${t('lessonList')}">${navHTML()}</aside><section class="instruction">${instructionHTML()}</section><section class="console-panel">${consoleHTML()}</section></div>`;
    if (view !== 'home') {
      $('command-input').value = cp().input; const nav = document.querySelector('.lesson-nav'), active = nav.querySelector('.active'); if (active) nav.scrollTop = Math.max(0, active.offsetTop - nav.offsetTop - 140); bindInput(); renderConsole(); renderHints(); renderStatus(); renderFiles();
      $('lesson-search').addEventListener('input', e => { courseSearch = e.target.value; $('lesson-groups').innerHTML = navGroups(courseSearch.toLowerCase()); });
      $('scenario-select')?.addEventListener('change', e => { state.checkpoints.sandbox = Engine.fresh({ session: { scenario: e.target.value } }); visibleFrom.sandbox = 0; render(); save(); });
    }
  }
  function renderHints() {
    if (!lesson() || !$('hints')) return;
    const l = lesson(), current = cp();
    $('hints').innerHTML = `<div class="hint-actions"><button class="small" data-action="hint" ${current.hintLevel >= l.hints.length ? 'disabled' : ''}>${current.hintLevel >= l.hints.length ? t('hintsDone') : `${t('hint')} ${current.hintLevel + 1} / ${l.hints.length}`}</button><button class="small" data-action="solution" ${current.solutionShown ? 'disabled' : ''}>${t('solution')}</button></div>${l.hints.slice(0, current.hintLevel).map((h, i) => `<div class="hint"><strong>${t('hint')} ${i + 1}</strong><br>${escape(loc(h))}</div>`).join('')}${current.solutionShown ? `<div class="solution"><p class="label">${t('solutionLabel')}</p><pre>${escape(loc(l.solution.join('\n')))}</pre></div>` : ''}`;
  }
  function renderConsole() {
    const box = $('console-output'); if (!box) return;
    const history = cp().session.history || [], start = Math.max(visibleFrom[currentId] || 0, history.length - 30);
    box.innerHTML = `<div class="terminal-welcome">${escape(t('welcome')).replace(/\n/g, '<br>')}</div>` + history.slice(start).map((h, i) => `<div class="history-entry"><div class="history-command"><span class="prompt-prefix">&gt;</span> ${escape(h.line)}</div>${h.stdout ? `<pre>${escape(h.stdout)}</pre>` : ''}${h.stderr ? `<pre class="history-error">${escape(h.stderr)}</pre>` : ''}${h.trace?.length ? `<button class="trace-open" data-trace="${start + i}">${t('trace')} · ${h.trace.length}</button>` : ''}</div>`).join('');
    $('prompt-path').textContent = 'PS ' + cp().session.cwd; box.scrollTop = box.scrollHeight;
  }
  function renderFiles() {
    if (!$('file-list')) return;
    $('file-list').innerHTML = Shell.listFiles(cp().session).filter(f => !f.dir).sort((a, b) => a.path.localeCompare(b.path)).map(f => `<div class="file-row"><span class="file-name">${escape(f.path)}</span><button data-read="${escape(f.path)}">${t('read')}</button><button data-path="${escape(f.path)}">${t('insert')}</button></div>`).join('');
  }
  function requirementCommand(check) {
    if (check.anyOf) return check.anyOf.map(requirementCommand).join(`<span class="requirement-or">${t('requirementOr')}</span>`);
    const references = [...(Shell.reference || []), ...(globalThis.PSRNetwork?.reference || [])];
    const name = references.find(ref => ref.name.toLowerCase() === check.name)?.name ||
      String(check.name || '').replace(/^\$psversiontable/i,'$PSVersionTable').replace(/\.psversion$/i,'.PSVersion');
    const values = value => value === undefined ? [] : Array.isArray(value) ? value : [value];
    const fragments = [...new Set([...values(check.paths), ...values(check.argsEqual === undefined ? check.contains : check.argsEqual)].map(String))];
    const notes = [];
    if (check.argsEqual?.length === 0) notes.push(t('requirementNoArgs'));
    if (check.expectCode) notes.push(t('requirementError'));
    if (check.outputCount !== undefined) notes.push(`${t('requirementOutputCount')}: ${check.outputCount}`);
    if (check.outputIncludes?.length) notes.push(`${t('requirementResult')}: ${values(check.outputIncludes).join(' / ')}`);
    if (check.objectIncludes) notes.push(`${t('requirementResult')}: ${values(check.objectIncludes).flatMap(object=>Object.entries(object).map(([key,value])=>`${key} = ${value}`)).join(' / ')}`);
    return `<span class="requirement-command"><code>${escape(name)}</code>${fragments.length ? `<span class="requirement-fragments">${fragments.map(fragment=>`<code>${escape(loc(fragment))}</code>`).join(' ')}</span>` : ''}${notes.length ? `<span class="requirement-note">${escape(loc(notes.join(' · ')))}</span>` : ''}</span>`;
  }
  function renderRequirements(l, result) {
    const checks = l.verify || {}, rows = [];
    const marker = met => `<span class="requirement-state ${met ? 'met' : 'pending'}"><span aria-hidden="true">${met ? '✓' : '○'}</span> ${t(met ? 'requirementMet' : 'requirementPending')}</span>`;
    const row = (kind, index, met, body) => `<li class="requirement" data-kind="${kind}" data-index="${index}" data-met="${met ? 'true' : 'false'}"><div class="requirement-main">${marker(met)}<div class="requirement-description">${body}</div></div></li>`;
    (checks.commands || []).forEach((check,index)=>rows.push(row('command',index,result.commands[index],requirementCommand(check))));
    (checks.pipelines || []).forEach((check,index)=>{
      const alternatives = Array.isArray(check) ? [check] : check.anyOf;
      const progress = result.pipelineStages?.[index];
      const selected = Math.min(alternatives.length-1,Math.max(0,progress?.alternative || 0));
      const pipeline = alternatives[selected];
      const stages = pipeline.map((stage,i)=>{
        const met = result.pipelines[index] || progress?.stages[i] === true;
        return `<li class="pipeline-step" data-stage="${i}" data-met="${met ? 'true' : 'false'}">${marker(met)}${requirementCommand(stage)}</li>`;
      }).join('');
      const otherForms = alternatives.length > 1 ? `<details class="requirement-alternatives"><summary>${t('requirementAlternatives')}</summary><ul>${alternatives.map(alternative=>`<li>${alternative.map(requirementCommand).join('<span class="requirement-pipe">|</span>')}</li>`).join('')}</ul></details>` : '';
      rows.push(row('pipeline',index,result.pipelines[index],`<span>${t('requirementPipeline')}</span><p class="requirement-note">${t('requirementPipelineNote')}</p><ol class="pipeline-steps">${stages}</ol>${otherForms}`));
    });
    if (checks.orderedCommands?.length) {
      const steps = checks.orderedCommands.map((check,index)=>row('ordered',index,index < (result.orderedCount || 0),`<span class="requirement-step">${t('requirementStep')} ${index+1}</span>${requirementCommand(check)}`)).join('');
      rows.push(`<li class="requirement-order"><p>${t('requirementOrder')}</p>${checks.orderedCommands.some(check=>check.restartOnRepeat) ? `<p class="requirement-note">${t('requirementOrderNote')}</p>` : ''}<ol>${steps}</ol></li>`);
    }
    (checks.files || []).forEach((file,index)=>rows.push(row('file',index,result.files[index],`${t('requirementFile')}<code class="requirement-path">${escape(loc(file.path))}</code>`)));
    if (checks.cwd) rows.push(row('location',0,result.cwd,`${t('requirementLocation')}<code class="requirement-path">${escape(loc(checks.cwd))}</code>`));
    if (Object.keys(checks.state || {}).length) rows.push(row('state',0,result.stateOk,t('requirementState')));
    return `<section class="requirement-panel" aria-label="${t('requirements')}"><h3>${t('requirements')}</h3><ul class="requirements">${rows.join('')}</ul></section>`;
  }
  function renderStatus() {
    if (!$('evidence')) return;
    const l = lesson(), result = l ? Engine.grade(l, cp().session, cp().answer, cp().evidence) : null;
    const done = l && !!state.completed[l.id];
    $('evidence').innerHTML = `<div><strong class="${result?.commandOk ? 'ready' : ''}">${!l ? t('ready') : result.ok ? `✓ ${t('completedTitle')}` : done ? t('recordTitle') : result.commandOk ? `✓ ${t('evidenceReady')}` : t('evidencePending')}</strong><span class="subtle">${!l ? t('saved') : result.ok ? t('completedText') : done ? t('recordText') : result.commandOk && l.question ? t('evidenceQuestion') : t('evidenceHint')}</span></div>${l ? renderRequirements(l,result) : ''}`;
    if (!l) return;
    const f = $('feedback');
    if (done && result.ok) f.innerHTML = `<div class="feedback success"><strong>✓ ${t('completedTitle')}</strong><p>${escape(loc(l.success))}</p>${l.question ? `<p style="margin-top:8px">${escape(loc(l.question.explanation))}</p>` : ''}</div>`;
    else if (done && !feedback) f.innerHTML = `<div class="feedback record"><strong>✓ ${t('recordTitle')}</strong><p>${t('recordText')}</p></div>`;
    else if (feedback) {
      const choice = feedback.commandOk && l.question?.choices.find(ch=>ch.id===cp().answer);
      f.innerHTML = `<div class="feedback"><strong>${t('notYet')}</strong>${choice?.feedback ? `<p class="label">${t('choiceFeedback')}</p><p class="choice-feedback">${escape(loc(choice.feedback))}</p>` : `<p>${feedback.commandOk ? t('needAnswer') : t('needCommands')}</p>`}</div>`;
    }
    else f.innerHTML = '';
    if (l.question && cp().attempts.incorrect) f.insertAdjacentHTML('beforeend',`<p class="micro answer-attempts">${t('wrongAttempts')}: ${cp().attempts.incorrect}</p>`);
    const item = document.querySelector(`.lesson-item[data-open="${CSS.escape(l.id)}"]`);
    if (item && done) { item.classList.add('done'); item.querySelector('.status').textContent = '✓'; }
  }
  function check(automatic = false) {
    const l = lesson(); if (!l) return;
    const result = Engine.grade(l, cp().session, cp().answer, cp().evidence);
    if (!automatic && result.commandOk && !result.answerOk && l.question?.choices.some(ch=>ch.id===cp().answer)) {
      cp().attempts.incorrect = Math.min(1000000,cp().attempts.incorrect+1);
      cp().attempts.byChoice[cp().answer] = Math.min(1000000,(cp().attempts.byChoice[cp().answer] || 0)+1);
      save();
    }
    if (result.ok && !state.completed[l.id]) {
      state.completed[l.id] = { at: new Date().toISOString(), hints: cp().hintLevel, solutionUsed: cp().solutionShown };
      feedback = null; save();
      $('lesson-groups').innerHTML = navGroups(courseSearch.toLowerCase());
      const top = document.querySelector('.nav-top');
      if (top) { top.querySelector('h2 .subtle').textContent = `${progressCount()}/${Data.lessons.length}`; const bar = top.querySelector('[role="progressbar"]'); bar.setAttribute('aria-valuenow', progressCount()); bar.firstElementChild.style.width = `${100 * progressCount() / Data.lessons.length}%`; }
    } else if (!automatic) feedback = result;
    renderStatus();
  }
  function runCommand() {
    if (composing) return;
    const input = $('command-input'), line = input.value.trim();
    if (!line) return;
    const historyLength = cp().session.history.length;
    try { const result = Shell.run(cp().session, line, {language:state.language}); if (lesson()) cp().evidence = Engine.observe(lesson(),result,cp().evidence); }
    catch (error) { toast(state.language === 'ja' ? 'この入力は処理できませんでした。入力を確認してください。' : 'Could not process this input. Please check the command.'); console.error(error); return; }
    const dropped = Math.max(0, historyLength + 1 - cp().session.history.length);
    visibleFrom[currentId] = Math.max(0, (visibleFrom[currentId] || 0) - dropped);
    if (/^(cls|clear|Clear-Host)\s*$/i.test(line)) visibleFrom[currentId] = cp().session.history.length;
    input.value = ''; cp().input = ''; historyCursor = -1; historyDraft = ''; feedback = null;
    renderConsole(); renderFiles(); check(true); renderStatus(); save(); input.focus({ preventScroll: true });
  }
  function bindInput() {
    const input = $('command-input');
    $('command-form').addEventListener('submit', e => { e.preventDefault(); if (!composing) runCommand(); });
    input.addEventListener('input', () => { cp().input = input.value; historyCursor = -1; deferSave(); });
    input.addEventListener('compositionstart', () => { composing = true; });
    input.addEventListener('compositionend', () => { composing = false; });
    input.addEventListener('keydown', e => {
      if (e.isComposing || composing || e.keyCode === 229) return;
      if (e.key === 'Enter') { e.preventDefault(); runCommand(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') { e.preventDefault(); visibleFrom[currentId] = cp().session.history.length; renderConsole(); return; }
      if (e.ctrlKey && e.key.toLowerCase() === 'c' && input.selectionStart === input.selectionEnd) { e.preventDefault(); input.value = ''; cp().input = ''; save(); return; }
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault(); const commands = cp().session.history.map(h => h.line);
        if (!commands.length) return;
        if (historyCursor < 0) { historyCursor = commands.length; historyDraft = input.value; }
        historyCursor = Math.max(0, Math.min(commands.length, historyCursor + (e.key === 'ArrowUp' ? -1 : 1)));
        input.value = historyCursor === commands.length ? historyDraft : commands[historyCursor];
        input.setSelectionRange(input.value.length, input.value.length); cp().input = input.value; deferSave();
      } else if (e.key === 'Tab' && !e.shiftKey && input.value) {
        const candidates = Shell.complete ? Shell.complete(cp().session, input.value) : [];
        if (candidates.length) { e.preventDefault(); input.value = candidates[0]; cp().input = input.value; deferSave(); if (candidates.length > 1) toast(candidates.slice(0, 4).join(' · ')); }
      } else if (e.key === 'ArrowRight' && !e.repeat && !e.shiftKey && !input.value && lesson() && state.completed[currentId] && !window.getSelection()?.toString()) { e.preventDefault(); nextLesson(); }
    });
  }
  function nextLesson() { const i = Data.lessons.indexOf(lesson()); if (i < Data.lessons.length - 1 && i >= 0) openLesson(Data.lessons[i + 1].id, true); else showHome(); }
  function insert(text, append = false) { const input = $('command-input'); input.value = append ? `${input.value}${input.value && !input.value.endsWith(' ') ? ' ' : ''}${text}` : text; cp().input = input.value; input.focus(); input.setSelectionRange(input.value.length, input.value.length); save(); }
  function openDialog(title, html) { $('dialog-title').textContent = title; $('dialog-body').innerHTML = html; if (!$('dialog').open) $('dialog').showModal(); }
  function showSettings() {
    openDialog(t('settings'), `<section class="settings-section"><h3>${t('progress')}</h3><p>${t('dataInfo')}</p><div class="settings-actions"><button data-action="export">${t('export')}</button><button data-action="import">${t('import')}</button>${unreadableProgress !== null ? `<button data-action="rescue">${t('rescueProgress')}</button>` : ''}</div><p>${t('savedDetail')}</p></section><section class="settings-section"><h3>${t('about')}</h3><p>${escape(t('aboutText')).replace(/\n/g, '<br>')}</p><p>${t('simNote')}</p></section><button class="small danger" data-action="erase">${t('erase')}</button>`);
  }
  function showMap() {
    openDialog(t('home'), `<p class="subtle">${t('courseSub')}</p>${Data.tracks.map((tr,i)=>`<section class="map-group"><h3>0${i+1} · ${escape(loc(tr.title))}</h3>${Data.lessons.filter(l=>l.track===tr.id).map(l=>`<button class="map-lesson ${state.completed[l.id]?'done':''}" data-open="${escape(l.id)}"><span>${state.completed[l.id]?'✓':String(Data.lessons.indexOf(l)+1).padStart(2,'0')}</span>${escape(shortTitle(l.title))}</button>`).join('')}</section>`).join('')}`);
  }
  function showReference() {
    const all = new Map();
    for (const ref of [...(Shell.reference || []), ...(globalThis.PSRNetwork?.reference || [])]) if (!all.has(ref.name)) all.set(ref.name, ref);
    const refs = [...all.values()].sort((a, b) => a.name.localeCompare(b.name));
    openDialog(t('reference'), `<p class="subtle">${t('refScope')}</p><input class="reference-search" id="reference-search" type="search" placeholder="${t('refSearch')}" aria-label="${t('refSearch')}"><div id="reference-results"></div>`);
    const draw = q => { $('reference-results').innerHTML = refs.filter(r => `${r.name} ${r.summaryJa} ${r.summaryEn} ${r.syntax}`.toLowerCase().includes(q.toLowerCase())).map(r => `<article class="reference-item"><h3>${escape(r.name)}</h3><p>${escape(state.language === 'en' ? r.summaryEn : r.summaryJa)}</p><pre>${escape(loc(r.syntax))}</pre></article>`).join('') || `<p>${t('noResults')}</p>`; };
    draw(''); $('reference-search').addEventListener('input', e => draw(e.target.value));
  }
  function showTrace(index) {
    const entry = cp().session.history[index]; if (!entry) return;
    const ja = state.language === 'ja';
    openDialog(t('trace'), '<pre>'+escape(entry.line)+'</pre>'+entry.trace.map((tr,i) => `<section class="trace-stage"><h3>${i+1}. ${escape(tr.command||tr.name)}</h3><div class="object-flow"><span>${escape(tr.inputType || '—')} · ${tr.inputCount ?? 0}</span><b>→</b><span>${escape(tr.outputType || '—')} · ${tr.outputCount ?? 0}</span></div><p class="micro">${ja ? '型と件数。画面用の文字列になる前のデータも確認できます。' : 'Type and count. Inspect the data before it is rendered as text.'}</p><p class="label">${t('traceInput')}</p><pre>${escape(tr.input||t('noInput'))}</pre><p class="label">${t('traceOutput')}</p><pre>${escape(tr.output||'—')}</pre>${Array.isArray(tr.objects)&&tr.objects.length ? `<details class="object-details"><summary>${ja ? 'オブジェクトの項目を見る' : 'Inspect object properties'}</summary><pre>${escape(JSON.stringify(tr.objects,null,2))}</pre></details>` : ''}${tr.error ? `<p class="label">${t('traceError')}</p><pre>${escape(tr.error)}</pre>` : ''}</section>`).join(''));
  }
  function exportData(rescue = false) {
    save(); const blob = new Blob([rescue ? unreadableProgress : JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `powershellroom-${rescue ? 'unreadable-original' : 'progress'}-${new Date().toISOString().slice(0, 10)}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); toast(t('exported'));
  }
  async function importData(file) {
    if (!file) return;
    try {
      if (file.size > Engine.MAX_IMPORT) throw new Error('Too large');
      const candidate = Engine.parse(await file.text());
      if (!confirm(t('importConfirm'))) return;
      clearTimeout(saveTimer); state = candidate; unreadableProgress = null; currentId = ''; view = 'home'; feedback = null;
      for (const key of Object.keys(visibleFrom)) delete visibleFrom[key];
      $('dialog').close(); save(); render(); toast(t('imported'));
    } catch { toast(t('importFail')); }
    finally { $('import-file').value = ''; }
  }
  function action(name) {
    if (name === 'sandbox') openLesson('sandbox');
    else if (name === 'courses') { courseOpen = !courseOpen; document.querySelector('.workspace').classList.toggle('course-open', courseOpen); }
    else if (name === 'hint') { cp().hintLevel = Math.min(lesson().hints.length, cp().hintLevel + 1); renderHints(); save(); }
    else if (name === 'solution') { cp().solutionShown = true; renderHints(); save(); }
    else if (name === 'check') check();
    else if (name === 'previous') { const i = Data.lessons.indexOf(lesson()); if (i > 0) openLesson(Data.lessons[i - 1].id); }
    else if (name === 'next') nextLesson();
    else if (name === 'clear') { visibleFrom[currentId] = cp().session.history.length; renderConsole(); }
    else if (name === 'reset' && confirm(t('resetConfirm'))) { state.checkpoints[currentId] = Engine.fresh(lesson() || { session: { scenario: cp().session.scenario } }); visibleFrom[currentId] = 0; historyCursor = -1; historyDraft = ''; feedback = null; render(); save(); }
    else if (name === 'export') exportData();
    else if (name === 'rescue' && unreadableProgress !== null) exportData(true);
    else if (name === 'import') $('import-file').click();
    else if (name === 'erase' && confirm(t('eraseConfirm'))) { clearTimeout(saveTimer); unreadableProgress = null; const language = state.language; state = Engine.empty(); state.language = language; currentId = ''; view = 'home'; feedback = null; for (const key of Object.keys(visibleFrom)) delete visibleFrom[key]; $('dialog').close(); save(); render(); toast(t('erased')); }
  }
  document.addEventListener('click', e => {
    const button = e.target.closest('button'); if (!button || button.disabled) return;
    if (button.dataset.open) { if ($('dialog').open) $('dialog').close(); openLesson(button.dataset.open); }
    else if (button.dataset.action) action(button.dataset.action);
    else if (button.dataset.insert !== undefined) insert(button.dataset.insert);
    else if (button.dataset.path) insert(`"${button.dataset.path}"`, true);
    else if (button.dataset.read) { const f = Shell.listFiles(cp().session).find(f => f.path === button.dataset.read); if (f) openDialog(f.path, `<pre>${escape(f.content)}</pre>`); }
    else if (button.dataset.trace !== undefined) showTrace(Number(button.dataset.trace));
  });
  document.addEventListener('change', e => { if (e.target.matches('input[name="answer"]')) { cp().answer = e.target.value; feedback = null; renderStatus(); save(); } });
  $('brand').addEventListener('click', showHome); $('home-button').addEventListener('click', showMap);
  $('sandbox-button').addEventListener('click', () => openLesson('sandbox')); $('reference-button').addEventListener('click', showReference);
  $('menu-button').addEventListener('click', showSettings); $('dialog-close').addEventListener('click', () => $('dialog').close());
  $('dialog').addEventListener('click', e => { if (e.target === $('dialog')) { const r = $('dialog').getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) $('dialog').close(); } });
  $('language-button').addEventListener('click', () => { stashInput(); state.language = state.language === 'ja' ? 'en' : 'ja'; render(); save(); });
  $('import-file').addEventListener('change', e => importData(e.target.files[0]));
  window.addEventListener('beforeunload', save);
  render();
})();
