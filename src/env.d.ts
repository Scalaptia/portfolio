/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

type Project = {
  title: string;
  description: string;
  context?: string;
  contributions: string[];
  tags: string[];
  image: string[];
  live?: string;
  repo?: string;
};
