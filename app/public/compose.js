// Keeps the publish form inside the rules TikTok checks during app review:
// a visibility level must be chosen, and branded content cannot be private.
const form = document.getElementById('composer');
const submit = document.getElementById('submit');
const directOptions = document.getElementById('direct-options');
const disclose = document.getElementById('disclose');
const disclosure = document.getElementById('disclosure');
const brandContent = document.getElementById('brand_content');
const brandOrganic = document.getElementById('brand_organic');
const brandedWarning = document.getElementById('branded-warning');
const consentBranded = document.getElementById('consent-branded');
const fileInput = document.getElementById('video'); // absent on the story preview page

const privacyInputs = () => [...form.querySelectorAll('[data-privacy]')];
const isDirect = () => form.querySelector('input[name=mode]:checked').value === 'direct';
const selectedPrivacy = () => privacyInputs().find((i) => i.checked)?.value ?? null;

function sync() {
  const direct = isDirect();
  directOptions.hidden = !direct;

  // Branded content and the private level are mutually exclusive.
  const branded = brandContent.checked;
  privacyInputs().forEach((input) => {
    if (input.value !== 'SELF_ONLY') return;
    input.disabled = branded;
    input.closest('.check').classList.toggle('disabled', branded);
    if (branded && input.checked) input.checked = false;
  });
  brandedWarning.hidden = !branded;

  disclosure.hidden = !disclose.checked;
  if (!disclose.checked) {
    brandContent.checked = false;
    brandOrganic.checked = false;
  }
  consentBranded.hidden = !brandContent.checked;

  // Inverted flags for the API payload.
  for (const key of ['comment', 'duet', 'stitch']) {
    const allow = form.querySelector(`input[name=allow_${key}]`);
    document.getElementById(`disable_${key}`).value =
      allow && !allow.disabled && allow.checked ? '' : 'on';
  }

  const hasFile = !fileInput || fileInput.files.length > 0;
  const ready = hasFile && (!direct || selectedPrivacy() !== null);
  submit.disabled = !ready;
}

form.addEventListener('change', sync);
form.addEventListener('input', sync);
sync();
