(() => {
  const sections = window.SURVEY_SECTIONS || [];
  const draftKey = 'jaa-survey-draft-v1';
  const memberKey = 'jaa-member-status-v1';
  const form = document.getElementById('survey-form');
  const list = document.getElementById('question-list');
  const intro = document.getElementById('intro');
  const survey = document.getElementById('survey');
  const success = document.getElementById('success-panel');
  let step = 0;
  let answers = {};
  let memberStatus = localStorage.getItem(memberKey) || '';
  try { answers = JSON.parse(localStorage.getItem(draftKey) || '{}'); } catch (_) { answers = {}; }

  const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const getValue = id => answers[id];
  const visibleSectionIndexes = () => sections.map((_, index) => index).filter(index => memberStatus !== 'outside' || index !== 1);
  const visibleQuestions = sectionIndex => sections[sectionIndex].questions
    .map((q, localIndex) => ({q, localIndex}))
    .filter(({q}) => memberStatus !== 'outside' || !(sectionIndex === 0 && q[0] === 'داخل في النادي بأي اسم أو لقب؟'));
  const questionCount = () => visibleSectionIndexes().flatMap(index => visibleQuestions(index).map(entry => entry.q)).filter(q => q[0] !== 'كم لمة حضرت؟').length;
  function store() {
    answers.public = !!document.getElementById('public-answer').checked;
    try { localStorage.setItem(draftKey, JSON.stringify(answers)); } catch (_) {}
  }
  function clearGroupAnswersForOutside() {
    // Remove private responses retained from a previous member selection.
    delete answers.s0q1;
    for (let i = 0; i < sections[1].questions.length; i++) {
      delete answers[`s1q${i}`];
      delete answers[`s1q${i}-other`];
    }
    try { localStorage.setItem(draftKey, JSON.stringify(answers)); } catch (_) {}
  }
  function fieldMarkup(q, id) {
    const [, type, options = []] = q;
    if (type === 'short' || type === 'number') {
      const val = getValue(id) || '';
      return `<input class="text-control" id="${id}" name="${id}" type="${type === 'number' ? 'number' : 'text'}" ${type === 'number' ? 'min="0" inputmode="numeric"' : 'maxlength="90"'} placeholder="اكتب إجابتك هنا…" value="${escapeHtml(val)}">`;
    }
    if (type === 'long') return `<textarea class="text-control" id="${id}" name="${id}" maxlength="1200" placeholder="خذ راحتك في الحكي…">${escapeHtml(getValue(id) || '')}</textarea>`;
    const selected = new Set(Array.isArray(getValue(id)) ? getValue(id) : getValue(id) ? [getValue(id)] : []);
    const inputType = type === 'multi' ? 'checkbox' : 'radio';
    const choices = options.map(option => `<label class="choice"><input type="${inputType}" name="${id}" value="${escapeHtml(option)}" ${selected.has(option) ? 'checked' : ''}><span>${escapeHtml(option)}</span></label>`).join('');
    let markup = `<div class="choice-list">${choices}</div>`;
    const hasOther = options.some(o => /أخرى|تاني|تانية|آخر/.test(o));
    if (hasOther) markup += `<input class="text-control conditional-input" id="${id}-other" type="text" maxlength="180" placeholder="اكتب إجابتك الأخرى…" value="${escapeHtml(getValue(id + '-other') || '')}" aria-label="اكتب إجابة أخرى">`;
    return markup;
  }
  function render() {
    const sectionIndexes = visibleSectionIndexes();
    const sectionIndex = sectionIndexes[step];
    const section = sections[sectionIndex];
    document.getElementById('section-title').textContent = section.title;
    document.getElementById('step-number').innerHTML = `${String(step + 1).padStart(2,'0')} <small>/ ${String(sectionIndexes.length).padStart(2,'0')}</small>`;
    const percent = Math.round(((step + 1) / sectionIndexes.length) * 100);
    document.getElementById('progress-fill').style.width = `${percent}%`;
    document.getElementById('progress-label').textContent = `المحور ${step + 1} من ${sectionIndexes.length}`;
    document.getElementById('progress-percent').textContent = `${percent}%`;
    const previous = document.getElementById('previous-button');
    previous.disabled = step === 0;
    previous.style.opacity = step === 0 ? '.45' : '1';
    document.getElementById('next-button').hidden = step === sectionIndexes.length - 1;
    document.getElementById('submit-button').hidden = step !== sectionIndexes.length - 1;
    list.innerHTML = '';
    let questionNum = sectionIndexes.slice(0, step)
      .flatMap(index => visibleQuestions(index).map(entry => entry.q))
      .filter(q => q[0] !== 'كم لمة حضرت؟').length;
    visibleQuestions(sectionIndex).forEach(({q, localIndex}) => {
      const [label, type] = q;
      if (label === 'كم لمة حضرت؟' && answers['s0q2'] !== 'حضرت قبل كدا') return;
      if (label !== 'كم لمة حضرت؟') questionNum++;
      const id = `s${sectionIndex}q${localIndex}`;
      const required = label === 'إسم الفنان';
      const card = document.createElement('article');
      card.className = 'question-card';
      const numberLabel = label === 'كم لمة حضرت؟' ? 'متابعة' : String(questionNum).padStart(2,'0');
      card.innerHTML = `<label class="question-label" for="${type === 'single' || type === 'multi' ? '' : id}"><span class="question-index">${numberLabel}</span><span>${escapeHtml(label)} ${required ? '<b aria-label="مطلوب">*</b>' : '<small class="optional-tag">اختياري</small>'}</span></label>${fieldMarkup(q,id)}`;
      list.appendChild(card);
      if (required) { const control = card.querySelector('input'); if (control) control.required = true; }
    });
    document.getElementById('public-answer').checked = !!answers.public;
    document.getElementById('form-hint').textContent = `هناك ${questionCount()} سؤالاً؛ يمكنك تخطي ما لا ترغب بالإجابة عنه. إسم الفنان مطلوب، وتُحفظ المسودة على هذا الجهاز.`;
  }

  function collect() {
    const sectionIndex = visibleSectionIndexes()[step];
    visibleQuestions(sectionIndex).forEach(({q, localIndex}) => {
      const id = `s${sectionIndex}q${localIndex}`;
      const nodes = form.querySelectorAll(`[name="${id}"]`);
      if (!nodes.length) return;
      if (nodes[0].type === 'checkbox') answers[id] = [...nodes].filter(n => n.checked).map(n => n.value);
      else if (nodes[0].type === 'radio') { const checked = [...nodes].find(n => n.checked); if (checked) answers[id] = checked.value; else delete answers[id]; }
      else answers[id] = nodes[0].value;
      const other = document.getElementById(`${id}-other`);
      if (other) answers[`${id}-other`] = other.value;
    });
    store();
  }

  document.querySelectorAll('input[name="membership"]').forEach(input => input.addEventListener('change', () => {
    const wasOutside = memberStatus === 'outside';
    memberStatus = input.value;
    try { localStorage.setItem(memberKey, memberStatus); } catch (_) {}
    if (memberStatus === 'outside') clearGroupAnswersForOutside();
    document.getElementById('start-button').disabled = false;
    document.getElementById('question-count').textContent = memberStatus === 'outside' ? '٤٨' : '٥٤';
    document.getElementById('start-button').textContent = wasOutside && memberStatus === 'member' ? 'ابدأ الاستبيان ←' : 'ابدأ الاستبيان ←';
  }));
  if (memberStatus) {
    const selected = document.querySelector(`input[name="membership"][value="${memberStatus}"]`);
    if (selected) selected.checked = true;
    document.getElementById('start-button').disabled = false;
    document.getElementById('question-count').textContent = memberStatus === 'outside' ? '٤٨' : '٥٤';
  }

  document.getElementById('start-button').addEventListener('click', () => {
    if (!memberStatus) return;
    intro.hidden = true; success.hidden = true; survey.hidden = false; step = 0; render(); survey.scrollIntoView({behavior:'smooth'});
  });
  document.getElementById('exit-survey').addEventListener('click', e => { e.preventDefault(); collect(); survey.hidden = true; intro.hidden = false; intro.scrollIntoView({behavior:'smooth'}); });
  document.getElementById('previous-button').addEventListener('click', () => { collect(); if (step > 0) { step--; render(); window.scrollTo({top:0,behavior:'smooth'}); } });
  document.getElementById('next-button').addEventListener('click', () => { collect(); if (step < visibleSectionIndexes().length - 1) { step++; render(); window.scrollTo({top:0,behavior:'smooth'}); } });
  document.getElementById('public-answer').addEventListener('change', store);
  form.addEventListener('input', e => { if (e.target.matches('input,textarea')) collect(); });
  form.addEventListener('change', e => { collect(); if (e.target.name === 's0q2') render(); });

  form.addEventListener('submit', async e => {
    e.preventDefault(); collect();
    const name = answers.s0q0;
    if (!String(name || '').trim()) {
      step = 0; render();
      const field = document.getElementById('s0q0');
      if (field) { field.focus(); field.setCustomValidity('أدخل إسم الفنان للمتابعة.'); field.reportValidity(); field.addEventListener('input', () => field.setCustomValidity(''), {once:true}); }
      window.scrollTo({top:0,behavior:'smooth'}); return;
    }
    const button = document.getElementById('submit-button');
    button.disabled = true; button.textContent = 'جارٍ رفع الاستبيان…';
    const config = window.JAA_SUPABASE_CONFIG || {};
    const configured = !!(config.url && config.anonKey && window.supabase?.createClient);
    try {
      if (configured) {
        const client = window.supabase.createClient(config.url, config.anonKey);
        const {error} = await client.from('survey_submissions').insert({public_name:String(name).trim(),answers,is_public:!!answers.public,schema_version:1});
        if (error) throw error;
        document.querySelector('#success-panel p').textContent = 'تم حفظ إجابتك في أرشيف الاستبيان. سيُعرض ملفك الفردي فقط إذا فعّلت خيار المشاركة.';
      } else {
        document.querySelector('#success-panel p').textContent = 'لم تُضف إعدادات قاعدة البيانات بعد؛ إجابتك محفوظة على هذا الجهاز فقط ولم تُرسل إلى الإنترنت.';
      }
      const record = {id:crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),name:String(name).trim(),submittedAt:new Date().toISOString(),public:!!answers.public,answers,synced:configured,memberStatus};
      try { localStorage.setItem('jaa-survey-last-submission',JSON.stringify(record)); } catch (_) {}
      try { localStorage.removeItem(draftKey); } catch (_) {}
      survey.hidden = true; success.hidden = false; success.scrollIntoView({behavior:'smooth'});
    } catch (error) {
      document.getElementById('form-hint').textContent = 'تعذر حفظ الإجابات في قاعدة البيانات. بقيت المسودة محفوظة على جهازك؛ تحقق من إعدادات Supabase وحاول مجدداً.';
      console.error('Supabase submission failed:',error);
      button.disabled = false; button.innerHTML = 'رفع الاستبيان <span aria-hidden="true">✦</span>';
    }
  });
  document.getElementById('restart-button').addEventListener('click', () => { success.hidden = true; intro.hidden = false; survey.hidden = true; window.scrollTo({top:0,behavior:'smooth'}); });
})();
