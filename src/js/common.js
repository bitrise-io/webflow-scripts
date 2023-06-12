function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function icaseEqual(str1, str2) {
  return str1.search(new RegExp("^" + str2 + "$", "i")) > -1;
}

function icaseIncludes(str1, str2) {
  return str1.search(new RegExp(str2, "i")) > -1;
}

export {capitalize, icaseEqual, icaseIncludes};