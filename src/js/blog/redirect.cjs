const fs = require('fs');

const redirectsFile = "../blog-redirects.md";

(async () => {
  let redirectsFileContent = await fs.promises.readFile(redirectsFile, {encoding: 'utf-8'});
  let newRedirectsFileContent = [];
  newRedirectsFileContent.push("/* Page redirects */");
  newRedirectsFileContent.push("const pageRedirects = [");
  
  const posts = {};
  const postRedirects = [...redirectsFileContent.matchAll(/^(?:\/blog)?\/post\/([^/\s]+)\n([^\s]+)\n\n/gm)];
  postRedirects.forEach((postRedirect) => {
    redirectsFileContent = redirectsFileContent.replace(postRedirect[0], "");

    const redirectFrom = `/blog/post/${postRedirect[1]}`
    if (!posts[redirectFrom]) posts[redirectFrom] = [];
    const redirectTo = postRedirect[2]
      .replace(/^https:\/\/(www\.)?bitrise\.io/, "")
      .replace(/^\/blog\/?/, "/")
      .replace(/^\/post\//, "/blog/post/")
      .replace(/^\/$/, "/blog");
    if (!posts[redirectFrom].includes(redirectTo)) posts[redirectFrom].push(redirectTo);
  });
  Object.keys(posts).forEach((post) => {
    newRedirectsFileContent.push(`  ["${post}", "${posts[post][0]}"],`);
  });

  newRedirectsFileContent.push("];");
  newRedirectsFileContent.push("/* Tags Redirects */");
  newRedirectsFileContent.push("const tagsRedirects = [");

  const tags = {};
  const tagRedirects = [...redirectsFileContent.matchAll(/^(\/tags\/[^/\s]+)\n([^\s]+)\n\n/gm)];
  tagRedirects.forEach((tagRedirect) => {
    redirectsFileContent = redirectsFileContent.replace(tagRedirect[0], "");

    const redirectFrom = `/blog${tagRedirect[1]}`
    if (!tags[redirectFrom]) tags[redirectFrom] = [];
    const redirectTo = tagRedirect[2]
      .replace(/^https:\/\/(www\.)?bitrise\.io/, "")
      .replace(/^\/blog\/?/, "/")
      .replace(/^\/post\//, "/blog/post/")
      .replace(/^\/$/, "/blog");
    if (!tags[redirectFrom].includes(redirectTo)) tags[redirectFrom].push(redirectTo);
  });
  Object.keys(tags).forEach((tag) => {
    newRedirectsFileContent.push(`  ["${tag}", "${tags[tag][0]}"],`);
  });
  newRedirectsFileContent.push("];");

  await fs.promises.writeFile("../blog-redirects.js", newRedirectsFileContent.join("\n"));

})();