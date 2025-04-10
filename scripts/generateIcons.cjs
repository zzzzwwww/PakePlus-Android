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
            'ic_launcher_foreground.webp'
        )
        const backgroundPath = path.join(
            mipmapDir,
            'ic_launcher_background.webp'
        )
        const legacyPath = path.join(mipmapDir, 'ic_launcher.webp')
        const legacyRoundPath = path.join(mipmapDir, 'ic_launcher_round.webp')

        // 创建圆形遮罩
        const roundedMask = Buffer.from(
            `<svg><circle cx="${size / 2}" cy="${size / 2}" r="${
                size / 2
            }" fill="white"/></svg>`
        )

        // 生成普通图标
        const img = sharp(input).resize(size, size)
        await img.webp().toFile(foregroundPath)
        await img.webp().toFile(legacyPath)

        // 生成圆形图标
        const roundedImg = img.composite([
            {
                input: roundedMask,
                blend: 'dest-in',
            },
        ])
        await roundedImg.webp().toFile(legacyRoundPath)

        // 生成背景
        await sharp({
            create: {
                width: size,
                height: size,
                channels: 4,
                background: '#FFFFFF',
            },
        })
            .webp()
            .toFile(backgroundPath)
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

    console.log('✅ Adaptive icons generated in WebP format.')
}

;(async () => {
    const { input, output, copyTo } = options
    const outPath = path.resolve(output)
    await generateAdaptiveIcons(input, outPath)

    if (copyTo) {
        const dest = path.resolve(copyTo)
        await fs.copy(outPath, dest, { overwrite: true })
        console.log(`📦 Icons copied to Android res dir: ${dest}`)
        // 删除根目录的res
        await fs.remove(outPath)
    }
})()
