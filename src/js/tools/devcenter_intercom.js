window.setInterval(() => {
  const bodyMarginTop = document.body.style.marginTop; // intercom sets this for top banner
  document.querySelector('aside.site-sidebar').style.marginTop = bodyMarginTop;
  document.querySelector('aside.site-sidebar').style.maxHeight = `calc(100% - ${bodyMarginTop})`;
  document.querySelector('.site-content .toolbar').style.marginTop = bodyMarginTop;
}, 500);
