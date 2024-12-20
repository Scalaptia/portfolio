/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

type Project = {
    title: string;
    description: string[];
    tags: string[];
    image: string[];
    live?: string;
    repo?: string;
};