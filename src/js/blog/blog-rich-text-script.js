/**
 * @param {string} str
 * @returns {Promise<boolean>}
 */
async function copyStringToClipboard(str) {
  try {
    await navigator.clipboard.writeText(str);
    return true;
  } catch (e) {
    const el = document.createElement('textarea');
    el.value = str;
    el.setAttribute('readonly', '');
    el.style = {position: 'absolute', opacity: 0};
    document.body.appendChild(el);
    el.focus();
    el.select();
    const result = document.execCommand('copy');
    document.body.removeChild(el);
    return result;
  }
}

window.addEventListener("load", (event) => {

  /** Hide Last Updated if it's the same as Published */
  const published = document.getElementById("published").textContent;
  const updated = document.getElementById("updated").textContent;
  if (updated && published && (published == updated)) {
    document.getElementById("updated-wrapper").remove();	
  }

  /** add code block copy button */
  document.querySelectorAll(".w-code-block").forEach((codeBlock) => {
    codeBlock.style.position = "relative";
    if (codeBlock.style.backgroundColor === "rgb(43, 43, 43)") {
    	codeBlock.style.backgroundColor = "#351C48";
    }
    const copyButton = document.createElement("button");
    copyButton.className = "button is-xsmall copy-button";
    copyButton.innerHTML = "Copy";
    copyButton.addEventListener("click", async (event) => {
      const code = codeBlock.querySelector("code").textContent;
      const result = await copyStringToClipboard(code);
      if (result) {
        const content = copyButton.innerHTML;
        copyButton.innerHTML = "Copied to Clipboard";
        await new Promise((resolve) => setTimeout(resolve, 2000));
        copyButton.innerHTML = content;
      }
    });
    codeBlock.appendChild(copyButton);
  });
});