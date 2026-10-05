// www.fharo.dev has a proxied DNS record but nothing behind it, so it answered "No available
// server". This Worker sits on www.fharo.dev/* and sends every request to the same path on
// fharo.dev, the one address the site lives at. 301, so browsers and search engines remember it.

export default {
  fetch(request: Request): Response {
    const url = new URL(request.url);
    url.hostname = "fharo.dev";
    url.protocol = "https:";
    url.port = "";
    return Response.redirect(url.toString(), 301);
  },
};
