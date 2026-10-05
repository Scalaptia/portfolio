// Every picture under public/, measured at build time, so the viewer can open at a picture's
// shape before the picture has loaded instead of opening wide and snapping to it afterwards.
//
// Exposed as `virtual:image-sizes`: a map from the public URL ("/images/foo.png") to [width,
// height]. 47 images come to about 2 KB. Dev re-measures whenever a file in public/ changes.

import { readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ID = "virtual:image-sizes";
const RESOLVED = "\0" + ID;
const PICTURE = /\.(png|jpe?g|webp|gif|avif)$/i;

async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? files(full) : PICTURE.test(entry.name) ? [full] : [];
    }),
  );
  return nested.flat();
}

async function measure(root) {
  const sizes = {};
  for (const file of await files(root)) {
    try {
      const { width, height, orientation } = await sharp(file).metadata();
      if (!width || !height) continue;
      // EXIF orientations 5 to 8 are rotated a quarter turn, so the browser shows them on their side.
      const turned = orientation >= 5;
      sizes["/" + path.relative(root, file).split(path.sep).join("/")] = turned ? [height, width] : [width, height];
    } catch {
      // Not a picture sharp can read. The viewer falls back to measuring it on load.
    }
  }
  return sizes;
}

export default function imageSizes() {
  let root = "public";

  return {
    name: "image-sizes",
    configResolved(config) {
      root = config.publicDir || root;
    },
    resolveId(id) {
      if (id === ID) return RESOLVED;
    },
    async load(id) {
      if (id !== RESOLVED) return;
      return `export default ${JSON.stringify(await measure(root))};`;
    },
    configureServer(server) {
      const refresh = (file) => {
        if (!file.startsWith(path.resolve(root)) || !PICTURE.test(file)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED);
        if (mod) server.moduleGraph.invalidateModule(mod);
      };
      server.watcher.add(root);
      server.watcher.on("add", refresh);
      server.watcher.on("change", refresh);
      server.watcher.on("unlink", refresh);
    },
  };
}
