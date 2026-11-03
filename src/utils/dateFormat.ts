export function formatDate(input: string): string {
  if (!input) return '';
  const d = new Date(input);
  if (isNaN(d.getTime())) return input;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function formatDateYMD(input: string): string {
  if (!input) return '';
  const d = new Date(input);
  if (isNaN(d.getTime())) return input;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

export function formatDateDisplay(input: string): string {
  if (!input) return '';
  const d = new Date(input);
  if (isNaN(d.getTime())) return input;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
