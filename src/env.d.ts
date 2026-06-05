/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

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
