const redirectFromField = document.querySelector('input[placeholder="/stuff.html"]');
const redirectToField = document.querySelector('input[placeholder="/about or http://webflow.com"]');
const submitButton = [...document.querySelectorAll("button")].filter((button) => button.textContent.trim() === "Add redirect path").pop();

const findRedirect = (from, to) => {
  const fromSpan = [...document.querySelectorAll("span")].filter((span) => span.textContent.trim() === from).pop();
  if (fromSpan) {
    const toSpan = [...fromSpan.parentNode.querySelectorAll("span")].filter((span) => span.textContent.trim() === to).pop();
    if (toSpan) {
      return fromSpan.parentNode.parentNode;
    }
  }
  return null;
};

const addRedirect = async (from, to) => {
  if (redirectFromField.value !== "") {
    console.warn("Form not ready yet!");
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    return await addRedirect(from, to);
  }
  const redirectRow = findRedirect(from, to);
  if (redirectRow) {
    console.warn("Redirect exists", from, to);
    return false;
  }
  redirectFromField.focus();
  document.execCommand('insertText', false, from);
  redirectToField.focus();
  document.execCommand('insertText', false, to);
  submitButton.click();
  console.log("Redirect added:", from, to);
  return true;
};

const massRedirect = async (list) => {
  for (let i = 0; i < list.length; i++) {
    if (await addRedirect(list[i][0], list[i][1])) {
      await new Promise((resolve) => window.setTimeout(resolve, 500));
    }
  }
};

const removeRedirect = async (from, to) => {
  const redirectRow = findRedirect(from, to);
  if (redirectRow) {
    const removeButton = redirectRow.querySelector("button");
    removeButton.click();
    await new Promise((resolve) => window.setTimeout(resolve, 100));
    const confirmButton = [...document.querySelectorAll("button")].filter((button) => button.textContent.trim() === "Delete redirect").pop();
    if (confirmButton) {
      confirmButton.click();
      console.log("Redirect removed:", from, to);
      return true;
    }
  }
  console.log("Redirect not found:", from, to);
  return false;
};

const massRemove = async (list) => {
  for (let i = 0; i < list.length; i++) {
    removeRedirect(list[i][0], list[i][1]);
    await new Promise((resolve) => window.setTimeout(resolve, 500));
  }
};