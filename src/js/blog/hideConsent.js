if (document.location.host === 'test-e93bfd.webflow.io') {
  const hideConsent = document.createElement("style");
  hideConsent.textContent = "#onetrust-consent-sdk { display: none; }";
  document.querySelector("head").appendChild(hideConsent);
}