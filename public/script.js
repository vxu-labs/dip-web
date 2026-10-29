const copyButton = document.getElementById('copy');
copyButton.addEventListener('click', async () => {
  const status = document.getElementById('copy-status');
  try {
    await navigator.clipboard.writeText(document.getElementById('commands').textContent);
    copyButton.textContent = 'Copied ✓';
    status.textContent = 'Commands copied. Paste them into your terminal when ready.';
  } catch {
    status.textContent = 'Select and copy the two commands above.';
  }
});
