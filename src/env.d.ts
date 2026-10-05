/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare module "virtual:image-sizes" {
  /** Public URL to [width, height]. See plugins/imageSizes.mjs. */
  const sizes: Record<string, [number, number]>;
  export default sizes;
}

type Project = {
  slug?: string;
  title: string;
  description: string;
  context?: string;
  contributions: string[];
  tags: string[];
  image: string[];
  live?: string;
  repo?: string;
};

type OtherProject = {
  title: string;
  description: string;
  tags: string[];
  repo?: string;
};
