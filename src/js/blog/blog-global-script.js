window.addEventListener("load", (event) => {
	const paginationLabel = document.querySelector('.pagination_page-count-label');
	if (paginationLabel)  {
  	paginationLabel.innerHTML = paginationLabel.textContent.replace(/\//g, 'of');
  }
});