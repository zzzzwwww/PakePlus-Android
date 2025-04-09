const sharp = require('sharp')
const fs = require('fs-extra')
const path = require('path')
const { program } = require('commander')

const DENSITIES = {
    mdpi: 48,
    hdpi: 72,
    xhdpi: 96,
    xxhdpi: 144,
    xxxhdpi: 192,
}

program
    .requiredOption('-i, --input <file>', 'Path to source PNG')
    .option('-o, --output <dir>', 'Output directory', 'res')
    .option('--rounded', 'Apply circular mask to icons')
    .option('--copy-to <androidResDir>', 'Copy icons to Android res directory')

program.parse(process.argv)
const options = program.opts()

async function generateAdaptiveIcons(input, outputDir) {
    for (const [dpi, size] of Object.entries(DENSITIES)) {
        const mipmapDir = path.join(outputDir, `mipmap-${dpi}`)
        await fs.ensureDir(mipmapDir)
        const foregroundPath = path.join(
            mipmapDir,
            'ic_launcher_foreground.png'
        )
        const backgroundPath = path.join(
            mipmapDir,
            'ic_launcher_background.png'
        )
        const legacyPath = path.join(mipmapDir, 'ic_launcher.png')

        const img = sharp(input).resize(size, size)
        const rounded = options.rounded
            ? img.composite([
                  {
                      input: Buffer.from(
                          `<svg><circle cx="${size / 2}" cy="${size / 2}" r="${
                              size / 2
                          }" fill="white"/></svg>`
                      ),
                      blend: 'dest-in',
                  },
              ])
            : img

        await rounded.toFile(foregroundPath)
        await sharp({
            create: {
                width: size,
                height: size,
                channels: 4,
                background: '#FFFFFF',
            },
        })
            .png()
            .toFile(backgroundPath)

        // legacy fallback
        await rounded.toFile(legacyPath)
    }

    // Generate XML
    const xmlPath = path.join(outputDir, 'mipmap-anydpi-v26')
    await fs.ensureDir(xmlPath)
    await fs.writeFile(
        path.join(xmlPath, 'ic_launcher.xml'),
        `
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
  `.trim()
    )

    await fs.writeFile(
        path.join(xmlPath, 'ic_launcher_round.xml'),
        `
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
  `.trim()
    )

    console.log('✅ Adaptive icons generated.')
}

;(async () => {
    const { input, output, copyTo } = options
    const outPath = path.resolve(output)
    await generateAdaptiveIcons(input, outPath)

    if (copyTo) {
        const dest = path.resolve(copyTo)
        await fs.copy(outPath, dest, { overwrite: true })
        console.log(`📦 Icons copied to Android res dir: ${dest}`)
    }
})()
