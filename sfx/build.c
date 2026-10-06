// Turns sfx/sounds.txt into the site's sound effects.
//
// Every sound on the site is made with rFXGen, raylib's sfxr-style generator (rfxgen.h, vendored
// here). Each line of sounds.txt is one sound's settings. This writes public/sfx/<name>.wav for the
// site and sfx/rfx/<name>.rfx, which opens in rFXGen (raylibtech.itch.io/rfxgen) so a sound can be
// tuned by ear there and the numbers copied back.
//
//   npm run sfx
//
// Output is 22050 Hz, 16-bit, mono, normalised so the loudest sample of each sound sits at the
// volume given on its line.

#define RFXGEN_IMPLEMENTATION
#define RFXGEN_LOG(...)
#define PI 3.14159265358979323846f  // rfxgen.h expects raylib to define it
#include "rfxgen.h"

#include <ctype.h>

#define OUT_RATE 22050

static void wav(const char *path, const float *data, unsigned int frames, float volume)
{
    // Halve the rate by averaging pairs. sfxr keeps almost nothing above 8 kHz.
    unsigned int n = frames / 2;
    short *pcm = calloc(n, sizeof(short));
    float peak = 0.0001f;
    for (unsigned int i = 0; i < frames; i++) peak = fmaxf(peak, fabsf(data[i]));
    for (unsigned int i = 0; i < n; i++) {
        float s = (data[2 * i] + data[2 * i + 1]) * 0.5f / peak * volume;
        if (s > 1.0f) s = 1.0f;
        if (s < -1.0f) s = -1.0f;
        pcm[i] = (short)(s * 32767.0f);
    }

    FILE *f = fopen(path, "wb");
    if (!f) { fprintf(stderr, "cannot write %s\n", path); exit(1); }
    unsigned int bytes = n * 2, rate = OUT_RATE, byteRate = OUT_RATE * 2, fmtLen = 16, riffLen = 36 + bytes;
    unsigned short format = 1, channels = 1, align = 2, bits = 16;
    fwrite("RIFF", 1, 4, f); fwrite(&riffLen, 4, 1, f); fwrite("WAVEfmt ", 1, 8, f);
    fwrite(&fmtLen, 4, 1, f); fwrite(&format, 2, 1, f); fwrite(&channels, 2, 1, f);
    fwrite(&rate, 4, 1, f); fwrite(&byteRate, 4, 1, f); fwrite(&align, 2, 1, f); fwrite(&bits, 2, 1, f);
    fwrite("data", 1, 4, f); fwrite(&bytes, 4, 1, f); fwrite(pcm, 2, n, f);
    fclose(f);
    free(pcm);
}

// key=value onto the matching WaveParams field. Names follow rFXGen's sliders.
static int set(WaveParams *p, const char *key, const char *value)
{
    float v = (float)atof(value);
    if (!strcmp(key, "wave")) {
        p->waveTypeValue = !strcmp(value, "square") ? 0 : !strcmp(value, "saw") ? 1 : !strcmp(value, "sine") ? 2 : 3;
        return 1;
    }
    struct { const char *k; float *f; } fields[] = {
        { "attack", &p->attackTimeValue }, { "sustain", &p->sustainTimeValue },
        { "punch", &p->sustainPunchValue }, { "decay", &p->decayTimeValue },
        { "freq", &p->startFrequencyValue }, { "minfreq", &p->minFrequencyValue },
        { "slide", &p->slideValue }, { "dslide", &p->deltaSlideValue },
        { "vibdepth", &p->vibratoDepthValue }, { "vibspeed", &p->vibratoSpeedValue },
        { "change", &p->changeAmountValue }, { "changespeed", &p->changeSpeedValue },
        { "duty", &p->squareDutyValue }, { "dutysweep", &p->dutySweepValue },
        { "repeat", &p->repeatSpeedValue },
        { "phaser", &p->phaserOffsetValue }, { "phasersweep", &p->phaserSweepValue },
        { "lpf", &p->lpfCutoffValue }, { "lpfsweep", &p->lpfCutoffSweepValue },
        { "lpfres", &p->lpfResonanceValue }, { "hpf", &p->hpfCutoffValue }, { "hpfsweep", &p->hpfCutoffSweepValue },
    };
    for (size_t i = 0; i < sizeof(fields) / sizeof(fields[0]); i++) {
        if (!strcmp(key, fields[i].k)) { *fields[i].f = v; return 1; }
    }
    return 0;
}

int main(int argc, char **argv)
{
    const char *list = argc > 1 ? argv[1] : "sfx/sounds.txt";
    FILE *in = fopen(list, "r");
    if (!in) { fprintf(stderr, "cannot read %s\n", list); return 1; }

    char line[1024];
    int count = 0;
    while (fgets(line, sizeof line, in)) {
        char *s = line;
        while (isspace((unsigned char)*s)) s++;
        if (!*s || *s == '#') continue;

        char name[64];
        float volume;
        int used;
        if (sscanf(s, "%63s %f%n", name, &volume, &used) != 2) { fprintf(stderr, "bad line: %s", line); return 1; }

        WaveParams p;
        ResetWaveParams(&p);
        p.randSeed = 7;  // Fixed, so noise comes out the same on every build.
        p.sustainTimeValue = 0.0f;
        p.decayTimeValue = 0.0f;
        p.startFrequencyValue = 0.0f;

        char *rest = s + used, *token = strtok(rest, " \t\r\n");
        while (token) {
            char *eq = strchr(token, '=');
            if (!eq) { fprintf(stderr, "%s: bad setting %s\n", name, token); return 1; }
            *eq = 0;
            if (!set(&p, token, eq + 1)) { fprintf(stderr, "%s: unknown setting %s\n", name, token); return 1; }
            token = strtok(NULL, " \t\r\n");
        }

        unsigned int frames = 0;
        float *data = GenerateWave(p, &frames);
        char path[256];
        snprintf(path, sizeof path, "public/sfx/%s.wav", name);
        wav(path, data, frames, volume);
        snprintf(path, sizeof path, "sfx/rfx/%s.rfx", name);
        SaveWaveParams(p, path);
        printf("%-12s %5.0f ms\n", name, frames * 1000.0 / RFXGEN_GEN_SAMPLE_RATE);
        free(data);
        count++;
    }
    fclose(in);
    printf("%d sounds\n", count);
    return 0;
}
