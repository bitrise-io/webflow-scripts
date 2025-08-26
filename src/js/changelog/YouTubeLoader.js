class YouTubeLoader {
  constructor() {
    this.resetCallbacks = [];
  }

  reset() {
    this.resetCallbacks.forEach((cb) => cb());
  }

  loadVideos() {
    document.querySelectorAll('.youtube-onebox').forEach((onebox) => {
      const { videoId } = onebox.dataset;
      const videoWidth = onebox.clientWidth;
      const videoHeight = Math.floor((videoWidth * 9) / 16);
      const oneboxOriginalContent = onebox.innerHTML;
      this.resetCallbacks.push(() => {
        onebox.innerHTML = oneboxOriginalContent;
      });
      onebox.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen width="${videoWidth}" height="${videoHeight}"></iframe>`;
    });
  }
}

export default YouTubeLoader;
