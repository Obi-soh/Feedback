(() => {
  const sections = window.SURVEY_SECTIONS || [];
  const key = 'jaa-survey-draft-v1';
  const form = document.getElementById('survey-form');
  const list = document.getElementById('question-list');
  const intro = document.getElementById('intro');
  const survey = document.getElementById('survey');
  const success = document.getElementById('success-panel');
  const totalQuestions = sections.flatMap(s => s.questions).filter(q => q[0] !== 'كم لمة حضرت؟').length;
  let step = 0;
  let answers = {};
  try { answers = JSON.parse(localStorage.getItem(key) || '{}'); } catch (_) { answers = {}; }
  const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const getValue = id => answers[id];
  const store = () => {
    answers.public = !!document.getElementById('public-answer').checked;
    try { localStorage.setItem(key, JSON.stringify(answers)); } catch (_) {}
  };
  function fieldMarkup(q, id) {
    const [label, type, options = []] = q;
    if (type === 'short' || type === 'number') {
      const val = getValue(id) || '';
      return `<input class="text-control" id="${id}" name="${id}" type="${type === 'number' ? 'number' : 'text'}" ${type === 'number' ? 'min="0" inputmode="numeric"' : 'maxlength="90"'} placeholder="اكتب إجابتك هنا…" value="${escapeHtml(val)}">`;
    }
    if (type === 'long') return `<textarea class="text-control" id="${id}" name="${id}" maxlength="1200" placeholder="خذ راحتك في الحكي…">${escapeHtml(getValue(id) || '')}</textarea>`;
    const selected = new Set(Array.isArray(getValue(id)) ? getValue(id) : getValue(id) ? [getValue(id)] : []);
    const inputType = type === 'multi' ? 'checkbox' : 'radio';
    const choices = options.map((option, i) => `<label class="choice"><input type="${inputType}" name="${id}" value="${escapeHtml(option)}" ${selected.has(option) ? 'checked' : ''}><span>${escapeHtml(option)}</span></label>`).join('');
    let markup = `<div class="choice-list">${choices}</div>`;
    const hasOther = options.some(o => /أخرى|أخرى|تاني|تانية|آخر|أخرى/.test(o));
    if (hasOther) markup += `<input class="text-control conditional-input" id="${id}-other" type="text" maxlength="180" placeholder="اكتب إجابتك الأخرى…" value="${escapeHtml(getValue(id + '-other') || '')}" aria-label="اكتب إجابة أخرى">`;
    return markup;
  }
  function render() {
    const section = sections[step];
    document.getElementById('section-title').textContent = section.title;
    document.getElementById('step-number').innerHTML = `${String(step + 1).padStart(2,'0')} <small>/ ${String(sections.length).padStart(2,'0')}</small>`;
    const percent = Math.round(((step + 1) / sections.length) * 100);
    document.getElementById('progress-fill').style.width = `${percent}%`;
    document.getElementById('progress-label').textContent = `المحور ${step + 1} من ${sections.length}`;
    document.getElementById('progress-percent').textContent = `${percent}%`;
    document.getElementById('previous-button').disabled = step === 0;
    document.getElementById('previous-button').style.opacity = step === 0 ? '.45' : '1';
    document.getElementById('next-button').hidden = step === sections.length - 1;
    document.getElementById('submit-button').hidden = step !== sections.length - 1;
    list.innerHTML = '';
    let questionNum = sections.slice(0, step).flatMap(s => s.questions).filter(q => q[0] !== 'كم لمة حضرت؟').length;
    section.questions.forEach((q, localIndex) => {
      const [label, type] = q;
      if (label === 'كم لمة حضرت؟') {
        const shown = answers['s0q2'] === 'حضرت قبل كدا';
        if (!shown) return;
      }
      questionNum++;
      const id = `s${step}q${localIndex}`;
      const required = label === 'الاسم أو اللقب المستخدم داخل التجمع';
      const card = document.createElement('article');
      card.className = 'question-card';
      const numberLabel = label === 'كم لمة حضرت؟' ? 'متابعة' : String(questionNum).padStart(2,'0');
      card.innerHTML = `<label class="question-label" for="${type === 'single' || type === 'multi' ? '' : id}"><span class="question-index">${numberLabel}</span><span>${escapeHtml(label)} ${required ? '<b aria-label="مطلوب">*</b>' : '<small class="optional-tag">اختياري</small>'}</span></label>${fieldMarkup(q,id)}`;
      list.appendChild(card);
      if (required) { const control=card.querySelector('input'); if(control) control.required=true; }
    });
    const priv = document.getElementById('public-answer'); priv.checked = !!answers.public;
  }
  function collect() {
    const section = sections[step];
    section.questions.forEach((q, i) => {
      const id = `s${step}q${i}`;
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
  document.getElementById('start-button').addEventListener('click', () => { intro.hidden = true; success.hidden = true; survey.hidden = false; step = 0; render(); survey.scrollIntoView({behavior:'smooth'}); });
  document.getElementById('exit-survey').addEventListener('click', e => { e.preventDefault(); collect(); survey.hidden=true; intro.hidden=false; intro.scrollIntoView({behavior:'smooth'}); });
  document.getElementById('previous-button').addEventListener('click', () => { collect(); if(step>0){ step--; render(); window.scrollTo({top:0,behavior:'smooth'}); } });
  document.getElementById('next-button').addEventListener('click', () => { collect(); if(step<sections.length-1){ step++; render(); window.scrollTo({top:0,behavior:'smooth'}); } });
  document.getElementById('public-answer').addEventListener('change', store);
  form.addEventListener('input', e => {
    if (e.target.matches('input,textarea')) {
      const card = e.target.closest('.question-card');
      if (card && card.querySelector('.question-label')?.textContent.includes('كم لمة حضرت؟')) return;
      collect();
    }
  });
  form.addEventListener('change', e => {
    collect();
    if (e.target.name === 's0q2') render();
  });
  form.addEventListener('submit', async e => {
    e.preventDefault(); collect();
    const name = answers.s0q0;
    if (!String(name || '').trim()) {
      step = 0; render();
      const field = document.getElementById('s0q0');
      if (field) { field.focus(); field.setCustomValidity('أدخل الاسم أو اللقب للمتابعة.'); field.reportValidity(); field.addEventListener('input',()=>field.setCustomValidity(''),{once:true}); }
      window.scrollTo({top:0,behavior:'smooth'}); return;
    }
    const button = document.getElementById('submit-button');
    button.disabled = true; button.textContent = 'جارٍ حفظ الحكاية…';
    const config = window.JAA_SUPABASE_CONFIG || {};
    const configured = !!(config.url && config.anonKey && window.supabase?.createClient);
    try {
      if (configured) {
        const client = window.supabase.createClient(config.url, config.anonKey);
        const { error } = await client.from('survey_submissions').insert({
          public_name: String(name).trim(), answers,
          is_public: !!answers.public, schema_version: 1
        });
        if (error) throw error;
        document.querySelector('#success-panel p').textContent = 'تم حفظ إجابتك في أرشيف الاستبيان. سيُعرض ملفك الفردي فقط إذا فعّلت خيار المشاركة.';
      } else {
        document.querySelector('#success-panel p').textContent = 'لم تُضف إعدادات قاعدة البيانات بعد؛ إجابتك محفوظة على هذا الجهاز فقط ولم تُرسل إلى الإنترنت.';
      }
      const record = {id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), name: String(name).trim(), submittedAt: new Date().toISOString(), public: !!answers.public, answers, synced: configured};
      try { localStorage.setItem('jaa-survey-last-submission', JSON.stringify(record)); } catch (_) {}
      try { localStorage.removeItem(key); } catch (_) {}
      survey.hidden = true; success.hidden = false; success.scrollIntoView({behavior:'smooth'});
    } catch (error) {
      document.getElementById('form-hint').textContent = 'تعذر حفظ الإجابات في قاعدة البيانات. بقيت المسودة محفوظة على جهازك؛ تحقق من إعدادات Supabase وحاول مجدداً.';
      console.error('Supabase submission failed:', error);
      button.disabled = false; button.innerHTML = 'إرسال الحكاية <span aria-hidden="true">✦</span>';
    }
  });
  document.getElementById('restart-button').addEventListener('click', () => { success.hidden = true; intro.hidden = false; survey.hidden = true; window.scrollTo({top:0,behavior:'smooth'}); });
  // Resume any saved work and keep the conditional attendance question in sync.
  document.getElementById('start-button').textContent = Object.keys(answers).length ? 'تابع من حيث توقفت ←' : 'ابدأ الحكاية ←';
  document.getElementById('form-hint').textContent = `هناك ${totalQuestions} سؤالاً؛ يمكنك تخطي ما لا ترغب بالإجابة عنه. تُحفظ المسودة على هذا الجهاز.`;
})();
