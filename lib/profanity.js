// Lista básica de groserías/insultos en español (rioplatense incluido).
// Se compara sin tildes y sin importar mayúsculas, respetando límites de palabra
// para no bloquear palabras normales que las contengan por casualidad.
const BAD_WORDS = [
  'boludo', 'boluda', 'pelotudo', 'pelotuda', 'forro', 'forra',
  'concha', 'conchudo', 'la concha', 'pete', 'cornudo', 'cornuda',
  'puto', 'puta', 'putos', 'putas', 'putazo',
  'mierda', 'mierdero',
  'carajo', 'coger', 'cogete',
  'pija', 'verga', 'chota',
  'gil', 'nabo', 'imbecil', 'estupido', 'estupida',
  'idiota', 'inutil',
  'hijo de puta', 'hdp', 'lpm', 'ctm', 'concha de tu madre',
  'reputo', 'reputa',
  'culiar', 'garcha', 'garchar',
  'trolo', 'trola',
];

function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // saca tildes
}

// Devuelve la primera grosería encontrada en el texto, o null si no hay ninguna.
export function findProfanity(text) {
  const normalized = normalize(text);
  for (const word of BAD_WORDS) {
    const normalizedWord = normalize(word);
    const pattern = normalizedWord.includes(' ')
      ? normalizedWord
      : `\\b${normalizedWord}\\b`;
    const regex = new RegExp(pattern, 'i');
    if (regex.test(normalized)) {
      return word;
    }
  }
  return null;
}

export function containsProfanity(text) {
  return findProfanity(text) !== null;
}
