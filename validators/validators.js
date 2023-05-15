export function varExistAndIsNumber(limit) {
  return !!(limit && !isNaN(limit));
}

export function varExist(variable) {
  return !!variable;
}

export function varNotExist(variable) {
  return !!!variable;
}

export function varInputEmpty(variable) {
  return !!!variable.trim();
}
